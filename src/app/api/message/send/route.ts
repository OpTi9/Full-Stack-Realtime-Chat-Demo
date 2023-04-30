import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {fetchRedis} from "@/helpers/redis";
import {nanoid} from "nanoid";
import {db} from "@/lib/db";
import { Message, messageValidator } from '@/lib/validations/message';
import {pusherServer} from "@/lib/pusher";
import {toPusherKey} from "@/lib/utils";

export async function POST(req: Request) {
    try {
        const { text, chatId }: { text: string; chatId: string } = await req.json();
        const session = await getServerSession(authOptions);

    // check that the user is authenticated
        if (!session) return new Response('Unauthorized', { status: 401 });

        const [userId1, userId2] = chatId.split('--');

    // check that the user is part of the chat
        if (session.user.id !== userId1 && session.user.id !== userId2) {
            return new Response('Unauthorized', { status: 401 })
        }

        const friendId = session.user.id === userId1 ? userId2 : userId1;

    // check that user is friends with the other user
        const friendList = (await fetchRedis(
            'smembers',
            `user:${session.user.id}:friends`
        )) as string[];

        const isFriend = friendList.includes(friendId);

        if (!isFriend) {
            return new Response('Unauthorized', { status: 401 })
        }

    // get sender info
        const rawSender = (await fetchRedis(
            'get',
            `user:${session.user.id}`
        )) as string;

        const sender = JSON.parse(rawSender) as User;

        const timestamp = Date.now();

        const messageData: Message = {
            id: nanoid(),
            senderId: session.user.id,
            text,
            timestamp,
        };

        // validate message
        const message: Message = messageValidator.parse(messageData);


        // realtime notification
        await pusherServer.trigger(toPusherKey(`chat:${chatId}`), 'incoming-message', message);

        await pusherServer.trigger(toPusherKey(`user:${friendId}:chats`), 'new_message', {
            ...message,
            senderImg: sender.image,
            senderName: sender.name,
        });


        // send message
        await db.zadd(`chat:${chatId}:messages`, {
            score: timestamp,
            member: JSON.stringify(message),
        });

        return new Response('OK');

    } catch (error) {
        if (error instanceof Error) {
            return new Response(error.message, { status: 500 });
        }

        return new Response('Internal Server Error', { status: 500 });
    }
}