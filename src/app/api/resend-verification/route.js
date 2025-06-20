// app/api/resend-verification/route.js
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
        { message: "Email harus disediakan!", code: "MISSING_EMAIL" },
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

    // Check if email is already verified
    if (user.email_verified) {
      return NextResponse.json(
        {
          message: "Email sudah diverifikasi. Anda dapat masuk ke akun Anda.",
          code: "ALREADY_VERIFIED",
        },
        { status: 400 }
      );
    }

    // Rate limiting check (server-side backup) using security_logs
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Check recent verification emails sent
    const { data: recentVerificationLogs, error: logsError } = await supabase
      .from("security_logs")
      .select("*")
      .eq("type", "verification_email_sent")
      .eq("email", email.toLowerCase())
      .gte("created_at", oneHourAgo);

    if (logsError) {
      console.error("Error checking verification logs:", logsError);
    } else if (recentVerificationLogs && recentVerificationLogs.length >= 3) {
      return NextResponse.json(
        {
          message:
            "Terlalu banyak permintaan verifikasi. Coba lagi dalam 1 jam.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429 }
      );
    }

    // Check if there was a recent verification email (within last minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

    const { data: recentVerification } = await supabase
      .from("security_logs")
      .select("*")
      .eq("type", "verification_email_sent")
      .eq("email", email.toLowerCase())
      .gte("created_at", oneMinuteAgo)
      .limit(1);

    if (recentVerification && recentVerification.length > 0) {
      return NextResponse.json(
        {
          message:
            "Email verifikasi baru saja dikirim. Mohon tunggu sebelum mengirim ulang.",
          code: "TOO_SOON",
        },
        { status: 429 }
      );
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new verification token
    const { error: updateError } = await supabase
      .from("users")
      .update({
        verification_token: verificationToken,
        verification_token_expires: tokenExpiry.toISOString(),
      })
      .eq("id_user", user.id_user);

    if (updateError) {
      console.error("Error updating verification token:", updateError);
      return NextResponse.json(
        {
          message: "Terjadi kesalahan saat memperbarui token!",
          code: "UPDATE_ERROR",
        },
        { status: 500 }
      );
    }

    // Create verification URL
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;

    // Email template
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
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">📧 Email Verifikasi Ulang</h3>
              <p style="color: #92400e; margin: 0;">
                Ini adalah email verifikasi yang dikirim ulang atas permintaan Anda. 
                Jika Anda tidak meminta pengiriman ulang, abaikan email ini.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px;">
                Link verifikasi ini akan kedaluwarsa dalam 24 jam.<br>
                Email dikirim pada: ${new Date().toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })} WIB
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

    // Send verification email
    await transporter.sendMail({
      from: `"Portal Dokumen" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: "Verifikasi Email Ulang - Portal Dokumen",
      html: emailHTML,
    });

    // Log the verification email sending for security monitoring
    const { error: logError } = await supabase.from("security_logs").insert({
      type: "verification_email_sent",
      email: email.toLowerCase(),
      user_id: user.id_user,
      ip_address:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
      metadata: {
        action: "resend",
        token_id: verificationToken.substring(0, 8), // Only log partial token
      },
    });

    if (logError) {
      console.error("Error logging security event:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "Email verifikasi telah dikirim ulang!",
    });
  } catch (error) {
    console.error("Error resending verification email:", error);

    // Log the error (optional)
    try {
      const { email: errorEmail } = await req.json();
      await supabase.from("security_logs").insert({
        type: "verification_email_error",
        email: errorEmail || "unknown",
        ip_address:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown",
        metadata: {
          error_message: error.message,
        },
      });
    } catch (logError) {
      console.error("Error logging error:", logError);
    }

    return NextResponse.json(
      {
        message: "Terjadi kesalahan saat mengirim email verifikasi!",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
