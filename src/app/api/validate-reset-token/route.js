// app/api/validate-reset-token/route.js
import { NextResponse } from "next/server";
import supabase from "@/app/utils/db";

export async function POST(req) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { message: "Token harus disediakan!", code: "MISSING_TOKEN" },
        { status: 400 }
      );
    }

    // Find user with this reset token
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("reset_password_token", token)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { message: "Token reset tidak valid!", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiryDate = new Date(user.reset_password_expiry);

    if (!user.reset_password_expiry || now > expiryDate) {
      // Clean up expired token
      const { error: cleanupError } = await supabase
        .from("users")
        .update({
          reset_password_token: null,
          reset_password_expiry: null,
        })
        .eq("id_user", user.id_user);

      if (cleanupError) {
        console.error("Error cleaning up expired token:", cleanupError);
      }

      return NextResponse.json(
        { message: "Token reset telah kedaluwarsa!", code: "TOKEN_EXPIRED" },
        { status: 400 }
      );
    }

    // Check if account is still active (if you have status field)
    // if (user.status === "inactive") {
    //   return NextResponse.json(
    //     {
    //       message: "Akun tidak aktif. Hubungi administrator!",
    //       code: "ACCOUNT_INACTIVE"
    //     },
    //     { status: 400 }
    //   );
    // }

    // Log the token validation for security monitoring
    const { error: logError } = await supabase.from("security_logs").insert({
      type: "reset_token_validation",
      email: user.email,
      user_id: user.id_user,
      ip_address:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
      metadata: {
        result: "valid",
        token_id: token.substring(0, 8), // Only log partial token
      },
    });

    if (logError) {
      console.error("Error logging security event:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "Token valid!",
      user: {
        email: user.email,
        nama: user.nama || "Pengguna",
      },
    });
  } catch (error) {
    console.error("Error validating reset token:", error);
    return NextResponse.json(
      {
        message: "Terjadi kesalahan internal server!",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
