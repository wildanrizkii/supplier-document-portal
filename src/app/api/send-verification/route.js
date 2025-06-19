import { NextResponse } from "next/server";
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

export async function POST(request) {
  try {
    const { email, token, name } = await request.json();

    if (!email || !token || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // URL verifikasi
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

    // Template email
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
            
            <h2 style="color: #1e293b;">Halo ${name}!</h2>
            
            <p>Terima kasih telah mendaftar di Portal Dokumen. Untuk mengaktifkan akun Anda, silakan verifikasi email dengan mengklik tombol di bawah ini:</p>
            
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
                Jika Anda tidak membuat akun ini, abaikan email ini.
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

    // Kirim email
    await transporter.sendMail({
      from: `"Portal Dokumen" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: "Verifikasi Email Anda - Portal Dokumen",
      html: emailHTML,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending verification email:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
