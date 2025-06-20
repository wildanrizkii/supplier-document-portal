// app/api/reset-password/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/app/utils/db";

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        {
          message: "Token dan kata sandi harus disediakan!",
          code: "MISSING_FIELDS",
        },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 8) {
      return NextResponse.json(
        {
          message: "Kata sandi harus minimal 8 karakter!",
          code: "WEAK_PASSWORD",
        },
        { status: 400 }
      );
    }

    // Advanced password strength validation
    const passwordRegex = {
      uppercase: /[A-Z]/,
      lowercase: /[a-z]/,
      number: /\d/,
      special: /[!@#$%^&*(),.?":{}|<>]/,
    };

    const strengthChecks = {
      hasUppercase: passwordRegex.uppercase.test(password),
      hasLowercase: passwordRegex.lowercase.test(password),
      hasNumber: passwordRegex.number.test(password),
      hasSpecial: passwordRegex.special.test(password),
      isLongEnough: password.length >= 8,
    };

    const passedChecks = Object.values(strengthChecks).filter(Boolean).length;

    if (passedChecks < 4) {
      return NextResponse.json(
        {
          message:
            "Kata sandi tidak memenuhi kriteria keamanan! Diperlukan minimal 4 dari: huruf besar, huruf kecil, angka, karakter khusus, dan minimal 8 karakter.",
          code: "WEAK_PASSWORD",
        },
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

    // Check if new password is different from current password
    if (user.password) {
      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return NextResponse.json(
          {
            message: "Kata sandi baru tidak boleh sama dengan kata sandi lama!",
            code: "SAME_PASSWORD",
          },
          { status: 400 }
        );
      }
    }

    // Check against recent password history (last 5 passwords)
    const { data: passwordHistory, error: passwordHistoryError } =
      await supabase
        .from("password_history")
        .select("password_hash")
        .eq("user_id", user.id_user)
        .order("created_at", { ascending: false })
        .limit(5);

    if (
      !passwordHistoryError &&
      passwordHistory &&
      passwordHistory.length > 0
    ) {
      for (const historicalPassword of passwordHistory) {
        const isReusedPassword = await bcrypt.compare(
          password,
          historicalPassword.password_hash
        );
        if (isReusedPassword) {
          return NextResponse.json(
            {
              message:
                "Kata sandi baru tidak boleh sama dengan 5 kata sandi terakhir yang pernah digunakan!",
              code: "PASSWORD_REUSED",
            },
            { status: 400 }
          );
        }
      }
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user's password and remove reset token
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password: hashedPassword,
        reset_password_token: null,
        reset_password_expiry: null,
      })
      .eq("id_user", user.id_user);

    if (updateError) {
      console.error("Error updating password:", updateError);
      return NextResponse.json(
        { message: "Gagal mengupdate kata sandi!", code: "UPDATE_FAILED" },
        { status: 500 }
      );
    }

    // Log the successful password reset for security monitoring
    const { error: logError } = await supabase.from("security_logs").insert({
      type: "password_reset_success",
      email: user.email,
      user_id: user.id_user,
      ip_address:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
      metadata: {
        token_id: token.substring(0, 8), // Only log partial token
      },
    });

    if (logError) {
      console.error("Error logging security event:", logError);
    }

    // Log password history (for preventing reuse of recent passwords)
    const { error: passwordHistoryInsertError } = await supabase
      .from("password_history")
      .insert({
        user_id: user.id_user,
        email: user.email,
        password_hash: hashedPassword,
      });

    if (passwordHistoryInsertError) {
      console.warn(
        "Failed to log password history:",
        passwordHistoryInsertError
      );
    }

    return NextResponse.json({
      success: true,
      message: "Kata sandi berhasil direset!",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      {
        message: "Terjadi kesalahan internal server!",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
