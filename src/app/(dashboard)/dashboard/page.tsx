import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";


const page = async ({}) => {

    //const session = await getServerSession(authOptions);

    return <div>dashboard</div>
}

export default page