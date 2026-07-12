import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("lumio_token")?.value;
  const { pathname } = request.nextUrl;

  const protectedRoutes = ["/journal", "/trends", "/onboarding", "/reflect"];
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/journal/:path*",
    "/trends/:path*",
    "/onboarding/:path*",
    "/reflect/:path*",
  ],
};
