import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(req) {
  const token = await getToken({ req, secret });
  const { pathname } = req.nextUrl;

  const isPublicPath =
    pathname === "/" || pathname === "/login" || pathname === "/register";

  // Jika belum login dan bukan halaman publik, redirect ke /login
  if (!token && !isPublicPath) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Jika sudah login dan mengakses /login, redirect ke /dashboard
  if (token && pathname === "/login") {
    const dashboardUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|static|favicon.ico|images/).*)"],
};
