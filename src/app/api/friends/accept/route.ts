import {z} from 'zod';
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {fetchRedis} from "@/helpers/redis";
import {db} from "@/lib/db";
import {pusherServer} from "@/lib/pusher";
import {toPusherKey} from "@/lib/utils";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id: idToAdd } = z.object({id: z.string()}).parse(body);

        // check who is making the request
        const session = await getServerSession(authOptions);

        // check if not logged in
        if (!session) {
            return new Response('Unauthorized', {status: 401});
        }

        // verify that users are not already friends
        const isAlreadyFriends = await fetchRedis('sismember', `user:${session.user.id}:friends`, idToAdd);
        if (isAlreadyFriends) {
            return new Response('Already friends', {status: 400});
        }

        const hasFriendRequest = await fetchRedis('sismember', `user:${session.user.id}:incoming_friend_requests`, idToAdd);

        // you can only add someone as a friend if they have sent you a friend request
        if(!hasFriendRequest) {
            return new Response('No friend request', {status: 400});
        }

        const [userRaw, friendRaw] = (await Promise.all(
            [
                fetchRedis('get', `user:${session.user.id}`),
                fetchRedis('get', `user:${idToAdd}`)
            ]
        )) as [string, string];

        const user = JSON.parse(userRaw) as User;
        const friend = JSON.parse(friendRaw) as User;

        await Promise.all([
            pusherServer.trigger(toPusherKey(`user:${idToAdd}:friends`), 'new_friend', user),
            pusherServer.trigger(toPusherKey(`user:${session.user.id}:friends`), 'new_friend', friend),
            db.sadd(`user:${session.user.id}:friends`, idToAdd),
            db.sadd(`user:${idToAdd}:friends`, session.user.id),
            db.srem(`user:${session.user.id}:incoming_friend_requests`, idToAdd)
        ]);

        return new Response('OK', {status: 200});

    } catch (error) {
        console.log(error)

        if (error instanceof z.ZodError) {
            return new Response('Invalid request payload', { status: 422 })
        }

        return new Response('Invalid request', { status: 400 })
    }
}