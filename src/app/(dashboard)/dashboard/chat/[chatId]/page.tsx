import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {notFound} from "next/navigation";
import {db} from "@/lib/db";
import {fetchRedis} from "@/helpers/redis";
import {messageArrayValidator} from "@/lib/validations/message";
import Image from 'next/image';
import Messages from "@/components/Messages";
import ChatInput from "@/components/ChatInput";

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

    return <div className='flex-1 justify-between flex flex-col h-full max-h-[calc(106vh-6rem)]'>
        <div className="flex sm:items-center justify-between py-3 border-b-2 border-gray-200">
            <div className="relative flex items-center space-x-4">
                <div className="relative">
                    <div className='relative w-8 sm:w-12 h-8 sm:h-12'>
                        <Image
                            fill
                            referrerPolicy='no-referrer'
                            src={chatPartner.image}
                            alt={chatPartner.name + ' profile picture'}
                            className='rounded-full ml-2'
                        />
                    </div>
                </div>
                <div className='flex flex-col leading-tight'>
                    <div className='text-xl flex items-center'>
                        <span className='text-gray-700 mr-3 font-semibold'>
                            {chatPartner.name}
                        </span>
                    </div>
                    <span className='text-sm text-gray-400'>
                        {chatPartner.email}
                    </span>
                </div>
            </div>
        </div>
        <Messages chatId={chatId} sessionId={session.user.id} initialMessages={initialMessages} chatPartner={chatPartner} sessionImg={session.user.image}/>
        <ChatInput chatId={chatId} chatPartner={chatPartner}/>
    </div>
}

export default page