"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { GiPortal } from "react-icons/gi";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  // Spam protection states
  const [lastResendTime, setLastResendTime] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  const router = useRouter();

  // Constants for spam protection
  const COOLDOWN_DURATION = 60; // 60 seconds between resends
  const MAX_ATTEMPTS_PER_HOUR = 3; // Maximum 3 attempts per hour
  const BLOCK_DURATION = 3600; // 1 hour block after exceeding limits

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    const savedRememberMe = localStorage.getItem("remember_me") === "true";

    if (savedEmail && savedRememberMe) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    let interval;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Check if user is currently blocked for resend verification and restore timer state
  useEffect(() => {
    const checkBlockAndTimerStatus = () => {
      if (!unverifiedEmail) return;

      const now = Date.now();

      // Check block status
      const blockData = localStorage.getItem(`resend_block_${unverifiedEmail}`);
      if (blockData) {
        const { blockTime, attempts } = JSON.parse(blockData);

        if (now - blockTime < BLOCK_DURATION * 1000) {
          setIsBlocked(true);
          setResendAttempts(attempts);
        } else {
          // Block expired, reset
          localStorage.removeItem(`resend_block_${unverifiedEmail}`);
          setIsBlocked(false);
          setResendAttempts(0);
        }
      }

      // Restore cooldown timer state
      const timerData = localStorage.getItem(`resend_timer_${unverifiedEmail}`);
      if (timerData) {
        const { lastResendTime: storedLastResendTime } = JSON.parse(timerData);
        const timeSinceLastResend = now - storedLastResendTime;

        if (timeSinceLastResend < COOLDOWN_DURATION * 1000) {
          const remainingCooldown = Math.ceil(
            (COOLDOWN_DURATION * 1000 - timeSinceLastResend) / 1000
          );
          setLastResendTime(storedLastResendTime);
          setResendCooldown(remainingCooldown);
        } else {
          // Cooldown expired, clean up
          localStorage.removeItem(`resend_timer_${unverifiedEmail}`);
          setLastResendTime(null);
          setResendCooldown(0);
        }
      }

      // Update attempts count from localStorage
      const attemptData = localStorage.getItem(
        `resend_attempts_${unverifiedEmail}`
      );
      if (attemptData) {
        const attempts = JSON.parse(attemptData).filter(
          (timestamp) => now - timestamp < 3600000 // Filter attempts within last hour
        );
        setResendAttempts(attempts.length);

        // Update localStorage with filtered attempts
        if (attempts.length !== JSON.parse(attemptData).length) {
          localStorage.setItem(
            `resend_attempts_${unverifiedEmail}`,
            JSON.stringify(attempts)
          );
        }
      }
    };

    if (unverifiedEmail) {
      checkBlockAndTimerStatus();
    }
  }, [unverifiedEmail]);

  // Save or clear credentials based on remember me setting
  const handleRememberMe = (email, remember) => {
    if (remember) {
      localStorage.setItem("remembered_email", email);
      localStorage.setItem("remember_me", "true");
    } else {
      localStorage.removeItem("remembered_email");
      localStorage.removeItem("remember_me");
    }
  };

  // Check spam protection before allowing resend
  const checkSpamProtection = () => {
    const now = Date.now();
    const email = unverifiedEmail;

    // Check if user is currently blocked
    if (isBlocked) {
      const blockData = localStorage.getItem(`resend_block_${email}`);
      if (blockData) {
        const { blockTime } = JSON.parse(blockData);
        const remainingTime = Math.ceil(
          (BLOCK_DURATION * 1000 - (now - blockTime)) / 1000 / 60
        );
        return {
          allowed: false,
          error: `Anda telah melebihi batas pengiriman email. Coba lagi dalam ${remainingTime} menit.`,
        };
      }
    }

    // Check cooldown period
    if (lastResendTime && now - lastResendTime < COOLDOWN_DURATION * 1000) {
      const remainingTime = Math.ceil(
        (COOLDOWN_DURATION * 1000 - (now - lastResendTime)) / 1000
      );
      return {
        allowed: false,
        error: `Mohon tunggu ${remainingTime} detik sebelum mengirim ulang.`,
      };
    }

    // Check hourly limits
    const attemptData = localStorage.getItem(`resend_attempts_${email}`);
    let attempts = [];

    if (attemptData) {
      attempts = JSON.parse(attemptData).filter(
        (timestamp) => now - timestamp < 3600000 // Filter attempts within last hour
      );
    }

    if (attempts.length >= MAX_ATTEMPTS_PER_HOUR) {
      // Block user for 1 hour
      localStorage.setItem(
        `resend_block_${email}`,
        JSON.stringify({
          blockTime: now,
          attempts: attempts.length + 1,
        })
      );

      setIsBlocked(true);
      setResendAttempts(attempts.length + 1);

      return {
        allowed: false,
        error: `Anda telah melebihi batas ${MAX_ATTEMPTS_PER_HOUR} kali pengiriman per jam. Coba lagi dalam 1 jam.`,
      };
    }

    return { allowed: true };
  };

  // Record resend attempt with persistent timer storage
  const recordResendAttempt = () => {
    const now = Date.now();
    const email = unverifiedEmail;

    // Record this attempt
    const attemptData = localStorage.getItem(`resend_attempts_${email}`);
    let attempts = attemptData ? JSON.parse(attemptData) : [];

    // Add current attempt and filter out old ones
    attempts.push(now);
    attempts = attempts.filter((timestamp) => now - timestamp < 3600000);

    localStorage.setItem(`resend_attempts_${email}`, JSON.stringify(attempts));

    // Store timer state in localStorage for persistence across refreshes
    localStorage.setItem(
      `resend_timer_${email}`,
      JSON.stringify({
        lastResendTime: now,
      })
    );

    // Update state
    setLastResendTime(now);
    setResendCooldown(COOLDOWN_DURATION);
    setResendAttempts(attempts.length);
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError("");
      setShowResendVerification(false);

      // Basic validation
      if (!email || !password) {
        const errorMessage = "Mohon isi email dan kata sandi terlebih dahulu!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      if (email.length < 4 || password.length < 4) {
        const errorMessage = "Email dan kata sandi harus minimal 4 karakter!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const errorMessage = "Format email tidak valid!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // Email verification akan dicek di NextAuth authorize function
      // Jika email belum diverifikasi, NextAuth akan return error "Verification"

      // Configure session duration based on remember me
      const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days vs 1 day

      const response = await signIn("credentials", {
        email: email,
        password: password,
        maxAge: maxAge.toString(),
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (response?.error) {
        let errorMessage = "Terjadi kesalahan saat login!";

        switch (response.error) {
          case "CredentialsSignin":
            errorMessage = "Email atau kata sandi yang Anda masukkan salah!";
            break;
          case "Configuration":
            errorMessage = "Terjadi kesalahan konfigurasi sistem!";
            break;
          case "AccessDenied":
            errorMessage = "Akses ditolak! Hubungi administrator.";
            break;
          case "Verification":
            errorMessage = "Email Anda belum diverifikasi!";
            setShowResendVerification(true);
            setUnverifiedEmail(email);
            // Reset spam protection states when showing verification for new email
            setLastResendTime(null);
            setResendCooldown(0);
            setResendAttempts(0);
            setIsBlocked(false);
            break;
          default:
            if (response.error.includes("fetch")) {
              errorMessage = "Masalah koneksi! Periksa internet Anda.";
            } else if (response.error.includes("timeout")) {
              errorMessage = "Koneksi timeout! Coba lagi.";
            }
        }

        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);

        // Don't save credentials if login failed
        if (rememberMe) {
          handleRememberMe("", false);
        }
      } else if (response?.ok) {
        // Success - handle remember me
        handleRememberMe(email, rememberMe);

        toast.success("Login berhasil!");

        // Clear password but keep email if remembering
        setPassword("");
        if (!rememberMe) {
          setEmail("");
        }

        router.push("/dashboard");
      } else {
        const errorMessage = "Respons tidak dikenal dari server!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error during login:", error);

      let errorMessage = "Terjadi kesalahan yang tidak terduga!";

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage =
          "Tidak dapat terhubung ke server! Periksa koneksi internet Anda.";
      } else if (error.name === "AbortError") {
        errorMessage = "Permintaan dibatalkan! Coba lagi.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    // Check spam protection
    const spamCheck = checkSpamProtection();
    if (!spamCheck.allowed) {
      toast.error(spamCheck.error);
      return;
    }

    setIsResendLoading(true);

    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: unverifiedEmail,
        }),
      });

      if (response.ok) {
        // Record the attempt
        recordResendAttempt();
        toast.success("Email verifikasi telah dikirim ulang!");
      } else {
        const errorData = await response.json();
        toast.error(
          errorData.message || "Gagal mengirim ulang email verifikasi!"
        );
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      toast.error("Terjadi kesalahan!");
    }

    setIsResendLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Clear error when user starts typing
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) {
      setError("");
      setShowResendVerification(false);
      setUnverifiedEmail("");
      // Reset spam protection when changing email
      setLastResendTime(null);
      setResendCooldown(0);
      setResendAttempts(0);
      setIsBlocked(false);
      // Clean up localStorage for old email if exists
      if (unverifiedEmail) {
        localStorage.removeItem(`resend_timer_${unverifiedEmail}`);
      }
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) {
      setError("");
      setShowResendVerification(false);
    }
  };

  // Handle remember me toggle
  const handleRememberToggle = () => {
    const newRememberMe = !rememberMe;
    setRememberMe(newRememberMe);

    // If turning off remember me, clear stored credentials
    if (!newRememberMe) {
      handleRememberMe("", false);
    }
  };

  // Format remaining cooldown time
  const formatCooldownTime = (seconds) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center space-y-10 py-12">
      {/* Logo - Top Left */}
      <div
        className="flex items-center group cursor-pointer space-x-1"
        onClick={() => router.push("/")}
      >
        <GiPortal
          className="text-gray-900 group-hover:text-blue-600 transition-colors duration-300"
          size={22}
        />
        <p className="text-xl font-semibold tracking-tight text-nowrap text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
          Portal Dokumen
        </p>
      </div>

      {/* Main Content */}
      <div className="w-full flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-semibold text-slate-900 mb-3">
              Masuk
            </h1>
            <p className="text-slate-500 text-base leading-relaxed">
              Selamat datang kembali di Portal Dokumen
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Alamat Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                onKeyPress={handleKeyPress}
                className={`w-full h-12 px-4 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 ${
                  error
                    ? "border-red-300 focus:ring-red-500"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                placeholder="Masukkan email Anda"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyPress={handleKeyPress}
                  className={`w-full h-12 px-4 pr-12 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 ${
                    error
                      ? "border-red-300 focus:ring-red-500"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  placeholder="Masukkan kata sandi Anda"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  tabIndex={-1}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200 focus:outline-none"
                >
                  {showPassword ? (
                    <MdVisibility className="h-5 w-5" />
                  ) : (
                    <MdVisibilityOff className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between py-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={handleRememberToggle}
                  className="sr-only"
                />
                <div
                  className={`relative w-5 h-5 rounded border-2 transition-all duration-200 ${
                    rememberMe
                      ? "bg-slate-900 border-slate-900"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {rememberMe && (
                    <svg
                      className="absolute inset-0 w-3 h-3 text-white m-auto"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span className="ml-2 text-sm text-slate-600">Ingat saya</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-sm text-slate-900 hover:text-blue-600 transition-colors duration-200"
              >
                Lupa kata sandi?
              </Link>
            </div>

            {/* Error Message and Resend Verification */}
            {error && (
              <div className="space-y-3">
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>

                {showResendVerification && (
                  <div className="space-y-3">
                    {/* Spam Protection Info */}
                    {(resendCooldown > 0 ||
                      resendAttempts > 0 ||
                      isBlocked) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="text-xs text-amber-800">
                          {isBlocked ? (
                            <p>
                              <span className="font-medium">
                                Batas terlampaui:
                              </span>{" "}
                              Tunggu 1 jam sebelum mencoba lagi.
                            </p>
                          ) : resendCooldown > 0 ? (
                            <p>
                              <span className="font-medium">Tunggu:</span>{" "}
                              {formatCooldownTime(resendCooldown)} sebelum kirim
                              ulang
                            </p>
                          ) : (
                            resendAttempts > 0 && (
                              <p>
                                <span className="font-medium">Percobaan:</span>{" "}
                                {resendAttempts}/{MAX_ATTEMPTS_PER_HOUR} kali
                                dalam 1 jam
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                      <p className="text-purple-700 text-sm mb-3">
                        Belum menerima email verifikasi?
                      </p>
                      <button
                        onClick={handleResendVerification}
                        disabled={
                          isResendLoading || resendCooldown > 0 || isBlocked
                        }
                        className={`w-full h-10 rounded-lg font-medium transition-colors duration-200 ${
                          isResendLoading || resendCooldown > 0 || isBlocked
                            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                            : "bg-purple-600 text-white hover:bg-purple-700"
                        }`}
                      >
                        {isResendLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Mengirim...
                          </div>
                        ) : resendCooldown > 0 ? (
                          `Kirim Ulang (${formatCooldownTime(resendCooldown)})`
                        ) : isBlocked ? (
                          "Terlalu Banyak Percobaan"
                        ) : (
                          "Kirim Ulang Email Verifikasi"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className={`w-full h-12 rounded-xl font-medium text-white transition-all duration-200 ${
                isLoading
                  ? "bg-slate-900 cursor-not-allowed"
                  : "bg-slate-900 transform hover:scale-[1.01] active:scale-[0.99]"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Masuk...
                </div>
              ) : (
                "Masuk"
              )}
            </button>

            {/* Register Link */}
            <div className="text-center pt-4">
              <p className="text-sm text-slate-600">
                Belum memiliki akun?{" "}
                <Link
                  href="/register"
                  className="text-slate-900 font-medium hover:text-blue-600 transition-colors duration-200"
                >
                  Daftar
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
