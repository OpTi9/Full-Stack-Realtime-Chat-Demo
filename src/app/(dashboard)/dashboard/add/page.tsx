import { FC } from 'react'
import AddFriendButton from "@/components/AddFriendButton";

const page: FC = ({}) => {
    return <main className="pt-8 mt-5 md:mt-2 lg:mt-0">
        <h1 className='font-bold text-5xl mb-8'>Add a friend</h1>
        <AddFriendButton/>
    </main>
}

export default page