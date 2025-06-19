import { NextResponse } from "next/server";
import supabase from "@/app/utils/db";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Cek apakah user ada dan belum terverifikasi
    const { data: user, error } = await supabase
      .from("users")
      .select("nama, email, email_verified, verification_token_expires")
      .eq("email", email.toLowerCase())
      .eq("email_verified", false)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "User not found or already verified" },
        { status: 404 }
      );
    }

    // Generate token baru
    const newToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36);

    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam

    // Update token di database
    const { error: updateError } = await supabase
      .from("users")
      .update({
        verification_token: newToken,
        verification_token_expires: newExpiry.toISOString(),
      })
      .eq("email", email.toLowerCase());

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update verification token" },
        { status: 500 }
      );
    }

    // Kirim email verifikasi baru
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${newToken}`;

    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verifikasi Email - Portal Dokumen</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e293b;">Portal Dokumen</h1>
            </div>
            
            <h2 style="color: #1e293b;">Halo ${user.nama}!</h2>
            
            <p>Anda telah meminta pengiriman ulang email verifikasi. Silakan klik tombol di bawah ini untuk memverifikasi akun Anda:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #1e293b; 
                        color: white; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        display: inline-block;
                        font-weight: 600;">
                Verifikasi Email
              </a>
            </div>
            
            <p>Atau salin dan tempel link berikut ke browser Anda:</p>
            <p style="word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 4px;">
              ${verificationUrl}
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px;">
                Link verifikasi ini akan kedaluwarsa dalam 24 jam.<br>
                Jika Anda tidak meminta pengiriman ulang ini, abaikan email ini.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #64748b; font-size: 12px;">
                © 2025 Portal Dokumen. Semua hak dilindungi.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Portal Dokumen" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: "Verifikasi Email Anda - Portal Dokumen",
      html: emailHTML,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resending verification email:", error);
    return NextResponse.json(
      { error: "Failed to resend verification email" },
      { status: 500 }
    );
  }
}
