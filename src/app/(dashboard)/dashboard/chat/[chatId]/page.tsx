import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {notFound} from "next/navigation";
import {db} from "@/lib/db";
import {fetchRedis} from "@/helpers/redis";
import {messageArrayValidator} from "@/lib/validations/message";

interface PageProps {
    params: {
        chatId: string
    }
}

async function getChatMessages(chatId: string) {
    try {
        const results: string[] = await fetchRedis('zrange', `chat:${chatId}:messages`, 0, -1);
        const dbMessages = results.map((message) => JSON.parse(message) as Message);
        const reversedMessages = dbMessages.reverse();
        // make sure messages are correct format
        const messages = messageArrayValidator.parse(reversedMessages);
        return messages;
    } catch (error) {
        notFound();
    }
}

const page = async ({params}: PageProps) => {
    const {chatId} = params;
    const session = await getServerSession(authOptions);

    if(!session) {
        notFound();
    }

    // destructuring user from session
    const {user} = session;

    const [userId1, userId2] = chatId.split('--');

    if(user.id !== userId1 && user.id !== userId2) {
        notFound();
    }

    const chatPartnerId = user.id === userId1 ? userId2 : userId1;
    const chatPartner = await (await db.get(`user:${chatPartnerId}`)) as User;

    // get messages
    const initialMessages = await getChatMessages(chatId);

    return <div></div>
}

export default page