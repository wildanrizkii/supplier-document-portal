import { NextResponse } from "next/server";
import supabase from "@/app/utils/db";

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Cari user dengan token verifikasi
    const { data: user, error } = await supabase
      .from("users")
      .select(
        "id_user, nama, email, email_verified, verification_token_expires"
      )
      .eq("verification_token", token)
      .single();

    console.log(user);

    if (error || !user) {
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      );
    }

    // Cek apakah sudah terverifikasi
    if (user.email_verified) {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    // Cek apakah token sudah expired
    const now = new Date();
    const expiryDate = new Date(user.verification_token_expires);

    if (now > expiryDate) {
      return NextResponse.json(
        { error: "Verification token has expired" },
        { status: 400 }
      );
    }

    // Update user sebagai terverifikasi
    const { error: updateError } = await supabase
      .from("users")
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null,
        verified_at: new Date().toISOString(),
      })
      .eq("id_user", user.id_user);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to verify email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: user.id,
        email: user.email,
        nama: user.nama,
      },
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
