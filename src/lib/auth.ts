import {NextAuthOptions} from "next-auth";
import {UpstashRedisAdapter} from "@next-auth/upstash-redis-adapter";
import {db} from "@/lib/db";
import GoogleProvider from "next-auth/providers/google";
import {redirect} from "next/navigation";

function getGoogleCredentials() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || clientId.length === 0) {
        throw new Error("GOOGLE_CLIENT_ID is not set");
    }
    if (!clientSecret || clientSecret.length === 0) {
        throw new Error("GOOGLE_CLIENT_SECRET is not set");
    }

    return {clientId, clientSecret};
}

// we use jwt (json web token) to verify session in our middleware
export const authOptions : NextAuthOptions = {
    adapter: UpstashRedisAdapter(db),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        GoogleProvider({
            clientId: getGoogleCredentials().clientId,
            clientSecret: getGoogleCredentials().clientSecret,
        })
    ],
    callbacks: {
        async jwt({token, user}) {
            // check if user is already in db
            const dbUser = (await db.get(`user:${token.id}`)) as User | null;

            if(!dbUser) {
                token.id = user!.id;
                return token;
            }

            return {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                image: dbUser.image,
            }
        },
        async session({session, token}) {
            if (token) {
                session.user.id = token.id;
                session.user.name = token.name;
                session.user.email = token.email;
                session.user.image = token.image as string;
            }
            return session;
        },
        redirect() {
            return redirect("/dashboard");
        }
    }
}