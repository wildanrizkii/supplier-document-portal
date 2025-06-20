// app/api/forgot-password/route.js
import { NextResponse } from "next/server";
import supabase from "@/app/utils/db";
import crypto from "crypto";
import nodemailer from "nodemailer";

// Konfigurasi email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // e.g., smtp.gmail.com
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
      return NextResponse.json(
        { message: "Email harus diisi!", code: "MISSING_EMAIL" },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Format email tidak valid!", code: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (userError || !user) {
      return NextResponse.json(
        {
          message: "Email tidak terdaftar dalam sistem!",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Check if email is verified
    if (!user.email_verified) {
      return NextResponse.json(
        {
          message:
            "Email belum diverifikasi. Silakan verifikasi email terlebih dahulu!",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 400 }
      );
    }

    // Check if account is active
    if (user.status === "inactive") {
      return NextResponse.json(
        {
          message: "Akun Anda tidak aktif. Hubungi administrator!",
          code: "ACCOUNT_INACTIVE",
        },
        { status: 400 }
      );
    }

    // Check rate limiting - last hour attempts
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: recentAttempts, error: attemptsError } = await supabase
      .from("security_logs")
      .select("*")
      .eq("type", "password_reset_request")
      .eq("email", email.toLowerCase())
      .gte("created_at", oneHourAgo);

    if (attemptsError) {
      console.error("Error checking rate limit:", attemptsError);
    } else if (recentAttempts && recentAttempts.length >= 3) {
      return NextResponse.json(
        {
          message: "Terlalu banyak permintaan reset. Coba lagi dalam 1 jam.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429 }
      );
    }

    // Check if there was a recent request (within last minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

    const { data: recentRequest } = await supabase
      .from("security_logs")
      .select("*")
      .eq("type", "password_reset_request")
      .eq("email", email.toLowerCase())
      .gte("created_at", oneMinuteAgo)
      .limit(1);

    if (recentRequest && recentRequest.length > 0) {
      return NextResponse.json(
        {
          message:
            "Email reset baru saja dikirim. Mohon tunggu sebelum mengirim ulang.",
          code: "TOO_SOON",
        },
        { status: 429 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user with reset token
    const { error: updateError } = await supabase
      .from("users")
      .update({
        reset_password_token: resetToken,
        reset_password_expiry: resetTokenExpiry.toISOString(),
      })
      .eq("id_user", user.id_user);

    if (updateError) {
      console.error("Error updating user with reset token:", updateError);
      return NextResponse.json(
        {
          message: "Terjadi kesalahan saat memproses permintaan!",
          code: "UPDATE_ERROR",
        },
        { status: 500 }
      );
    }

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    // Email template
    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Kata Sandi - Portal Dokumen</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e293b;">Portal Dokumen</h1>
            </div>
            
            <h2 style="color: #1e293b;">Halo ${user.nama || "Pengguna"}!</h2>
            
            <p>Kami menerima permintaan untuk mereset kata sandi akun Anda. Klik tombol di bawah ini untuk membuat kata sandi baru:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #1e293b; 
                        color: white; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        display: inline-block;
                        font-weight: 600;">
                Reset Kata Sandi
              </a>
            </div>
            
            <p>Atau salin dan tempel link berikut ke browser Anda:</p>
            <p style="word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">⚠️ Penting untuk Keamanan</h3>
              <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                <li>Link ini hanya berlaku selama 1 jam</li>
                <li>Jika Anda tidak meminta reset kata sandi, abaikan email ini</li>
                <li>Jangan bagikan link ini kepada siapa pun</li>
                <li>Gunakan kata sandi yang kuat dengan kombinasi huruf, angka, dan simbol</li>
              </ul>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px;">
                Permintaan reset ini dibuat pada: ${new Date().toLocaleString(
                  "id-ID",
                  {
                    timeZone: "Asia/Jakarta",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )} WIB
              </p>
              <p style="color: #64748b; font-size: 14px;">
                Jika Anda mengalami kesulitan dengan tombol di atas, salin dan tempel URL lengkap ke browser Anda.
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

    // Send email
    await transporter.sendMail({
      from: `"Portal Dokumen" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: "Reset Kata Sandi Anda - Portal Dokumen",
      html: emailHTML,
    });

    return NextResponse.json({
      success: true,
      message: "Email reset kata sandi telah dikirim!",
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      {
        message: "Terjadi kesalahan internal server!",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
