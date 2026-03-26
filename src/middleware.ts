import { withAuth } from "next-auth/middleware";

export default withAuth;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth sub-routes)
     * - api/admin (admin routes for approval)
     * - api/pdf (public pdf generation if magic link is used)
     * - api/download (download using token)
     * - api/sign (signing endpoint)
     * - api/template (Excel template download)
     * - login (auth pages)
     * - register (auth pages)
     * - forgot (auth pages)
     * - sign (public magic link page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc)
     */
    "/((?!api/auth|api/admin|api/pdf|api/download|api/sign|api/template|login|register|forgot|sign|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
}
