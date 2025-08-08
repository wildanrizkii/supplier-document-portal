import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(req) {
  const token = await getToken({ req, secret });
  const { pathname } = req.nextUrl;

  // Halaman publik yang tidak memerlukan login
  const isPublicPath =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/verify-email" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/admin/cronjob";

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

  // Jika ada token, cek role
  if (token) {
    const userRole = token.role;

    // Hak akses berdasarkan role
    const roleAccess = {
      Author: [
        "/",
        "/dashboard",
        "/manage/",
        "/manage/jenis-dokumen",
        "/manage/part-number",
        "/manage/part-name",
        "/manage/supplier",
        "/pengaturan",
        "/tentang",
      ],
      Supplier: ["/", "/dashboard", "/pengaturan", "/tentang"],
    };

    // Semua path yang tersedia di sistem (untuk validasi 404)
    const existingPaths = [
      "/",
      "/dashboard",
      "/login",
      "/register",
      "/verify-email",
      "/forgot-password",
      "/reset-password",
      "/pengaturan",
      "/tentang",
      "/manage/",
      "/manage/jenis-dokumen",
      "/manage/part-number",
      "/manage/part-name",
      "/manage/supplier",
      "/admin/cronjob",
    ];

    // Kalau path tidak ada di daftar, arahkan ke 404
    if (!existingPaths.includes(pathname)) {
      return NextResponse.rewrite(new URL("/404", req.url));
    }

    // Kalau role tidak punya akses ke path ini dan path bukan public / forbidden
    const allowedPaths = roleAccess[userRole] || [];
    const isAllowed = allowedPaths.includes(pathname);

    if (!isAllowed && !isPublicPath && pathname !== "/forbidden") {
      return NextResponse.redirect(new URL("/forbidden", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|static|favicon.ico|images/).*)"],
};
