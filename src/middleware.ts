export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!login|api/auth|api/gmail/callback|_next/static|_next/image|favicon.ico).*)",
  ],
};
