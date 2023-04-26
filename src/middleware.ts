import { getToken } from 'next-auth/jwt';
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    async function middleware(req) {
        // get the current path the user is visiting
        const pathname = req.nextUrl.pathname;

    // Manage route protection
        // next auth will automatically use our next auth secret in .env to decrypt the token and see the values inside
        const isAuth = await getToken({ req });

        // check if the user tries to access the login page
        const isLoginPage = pathname.startsWith('/login');

        // check if the user tries to access a sensitive route.
        // nobody should be able to access the dashboard without being logged in
        const sensitiveRoutes = ['/dashboard'];

        // if this returns true for any of the routes, then the user is trying to access a sensitive route
        const isAccessingSensitiveRoute = sensitiveRoutes.some((route) =>
            pathname.startsWith(route)
        );

        // if the user is logged in and tries to access the login page, redirect them to the dashboard
        if (isLoginPage) {
            if (isAuth) {
                // redirect to dashboard if logged in
                return NextResponse.redirect(new URL('/dashboard', req.url))
            }
            // allow access to login page if not logged in
            return NextResponse.next()
        }

        // if the user is not logged in and tries to access a sensitive route, redirect them to the login page
        if (!isAuth && isAccessingSensitiveRoute) {
            return NextResponse.redirect(new URL('/login', req.url))
        }

        // if the user is logged in and tries to access a home page, redirect them to the dashboard
        if (pathname === '/') {
            return NextResponse.redirect(new URL('/dashboard', req.url))
        }
    },
    {
        // a workaround to handle redirects on auth pages.
        callbacks: {
            async authorized() {
                // return true so the middleware function above is always called
                return true;
            },
        },
    }
)

export const config = {
    matcher: ['/', '/login', '/dashboard/:path*'],
}