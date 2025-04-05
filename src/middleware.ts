// import { clerkMiddleware } from '@clerk/nextjs/server'

// export default clerkMiddleware()

// export const config = {
//   matcher: [
//     // Skip Next.js internals and all static files, unless found in search params
//     '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
//     // Always run for API routes
//     '/(api|trpc)(.*)',
//   ],
// }

// If you have other middleware logic, you might need to adjust this.
// For now, exporting an empty middleware function to satisfy Next.js
export default function middleware() {}

export const config = {
  // Adjust the matcher if you have specific routes you still want middleware on,
  // otherwise, an empty matcher effectively disables it.
  matcher: [],
};