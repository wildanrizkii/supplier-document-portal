"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { MdEmail, MdArrowBack } from "react-icons/md";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { GiPortal } from "react-icons/gi";

// Main forgot password form component
const ForgotPasswordForm = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Spam protection states
  const [lastRequestTime, setLastRequestTime] = useState(null);
  const [requestCooldown, setRequestCooldown] = useState(0);
  const [requestAttempts, setRequestAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  const router = useRouter();

  // Constants for spam protection
  const COOLDOWN_DURATION = 60; // 60 seconds between requests
  const MAX_ATTEMPTS_PER_HOUR = 3; // Maximum 3 attempts per hour
  const BLOCK_DURATION = 3600; // 1 hour block after exceeding limits

  // Cooldown timer effect
  useEffect(() => {
    let interval;
    if (requestCooldown > 0) {
      interval = setInterval(() => {
        setRequestCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [requestCooldown]);

  // Check spam protection status on component mount
  useEffect(() => {
    const checkSpamProtectionStatus = () => {
      if (!email) return;

      const now = Date.now();

      // Check block status
      const blockData = localStorage.getItem(`reset_block_${email}`);
      if (blockData) {
        const { blockTime, attempts } = JSON.parse(blockData);

        if (now - blockTime < BLOCK_DURATION * 1000) {
          setIsBlocked(true);
          setRequestAttempts(attempts);
        } else {
          // Block expired, reset
          localStorage.removeItem(`reset_block_${email}`);
          setIsBlocked(false);
          setRequestAttempts(0);
        }
      }

      // Restore cooldown timer state
      const timerData = localStorage.getItem(`reset_timer_${email}`);
      if (timerData) {
        const { lastRequestTime: storedLastRequestTime } =
          JSON.parse(timerData);
        const timeSinceLastRequest = now - storedLastRequestTime;

        if (timeSinceLastRequest < COOLDOWN_DURATION * 1000) {
          const remainingCooldown = Math.ceil(
            (COOLDOWN_DURATION * 1000 - timeSinceLastRequest) / 1000
          );
          setLastRequestTime(storedLastRequestTime);
          setRequestCooldown(remainingCooldown);
        } else {
          // Cooldown expired, clean up
          localStorage.removeItem(`reset_timer_${email}`);
          setLastRequestTime(null);
          setRequestCooldown(0);
        }
      }

      // Update attempts count from localStorage
      const attemptData = localStorage.getItem(`reset_attempts_${email}`);
      if (attemptData) {
        const attempts = JSON.parse(attemptData).filter(
          (timestamp) => now - timestamp < 3600000 // Filter attempts within last hour
        );
        setRequestAttempts(attempts.length);

        // Update localStorage with filtered attempts
        if (attempts.length !== JSON.parse(attemptData).length) {
          localStorage.setItem(
            `reset_attempts_${email}`,
            JSON.stringify(attempts)
          );
        }
      }
    };

    if (email) {
      checkSpamProtectionStatus();
    }
  }, [email]);

  // Check spam protection before allowing request
  const checkSpamProtection = () => {
    const now = Date.now();

    // Check if user is currently blocked
    if (isBlocked) {
      const blockData = localStorage.getItem(`reset_block_${email}`);
      if (blockData) {
        const { blockTime } = JSON.parse(blockData);
        const remainingTime = Math.ceil(
          (BLOCK_DURATION * 1000 - (now - blockTime)) / 1000 / 60
        );
        return {
          allowed: false,
          error: `Anda telah melebihi batas permintaan reset. Coba lagi dalam ${remainingTime} menit.`,
        };
      }
    }

    // Check cooldown period
    if (lastRequestTime && now - lastRequestTime < COOLDOWN_DURATION * 1000) {
      const remainingTime = Math.ceil(
        (COOLDOWN_DURATION * 1000 - (now - lastRequestTime)) / 1000
      );
      return {
        allowed: false,
        error: `Mohon tunggu ${remainingTime} detik sebelum mengirim permintaan lagi.`,
      };
    }

    // Check hourly limits
    const attemptData = localStorage.getItem(`reset_attempts_${email}`);
    let attempts = [];

    if (attemptData) {
      attempts = JSON.parse(attemptData).filter(
        (timestamp) => now - timestamp < 3600000 // Filter attempts within last hour
      );
    }

    if (attempts.length >= MAX_ATTEMPTS_PER_HOUR) {
      // Block user for 1 hour
      localStorage.setItem(
        `reset_block_${email}`,
        JSON.stringify({
          blockTime: now,
          attempts: attempts.length + 1,
        })
      );

      setIsBlocked(true);
      setRequestAttempts(attempts.length + 1);

      return {
        allowed: false,
        error: `Anda telah melebihi batas ${MAX_ATTEMPTS_PER_HOUR} kali permintaan per jam. Coba lagi dalam 1 jam.`,
      };
    }

    return { allowed: true };
  };

  // Record reset request attempt
  const recordResetAttempt = () => {
    const now = Date.now();

    // Record this attempt
    const attemptData = localStorage.getItem(`reset_attempts_${email}`);
    let attempts = attemptData ? JSON.parse(attemptData) : [];

    // Add current attempt and filter out old ones
    attempts.push(now);
    attempts = attempts.filter((timestamp) => now - timestamp < 3600000);

    localStorage.setItem(`reset_attempts_${email}`, JSON.stringify(attempts));

    // Store timer state in localStorage for persistence across refreshes
    localStorage.setItem(
      `reset_timer_${email}`,
      JSON.stringify({
        lastRequestTime: now,
      })
    );

    // Update state
    setLastRequestTime(now);
    setRequestCooldown(COOLDOWN_DURATION);
    setRequestAttempts(attempts.length);
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Basic validation
      if (!email) {
        const errorMessage = "Mohon masukkan alamat email terlebih dahulu!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      if (email.length < 4) {
        const errorMessage = "Email harus minimal 4 karakter!";
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

      // Check spam protection
      const spamCheck = checkSpamProtection();
      if (!spamCheck.allowed) {
        setError(spamCheck.error);
        toast.error(spamCheck.error);
        setIsLoading(false);
        return;
      }

      // Send password reset request
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Record the attempt
        recordResetAttempt();

        setIsSuccess(true);
        toast.success("Email reset kata sandi telah dikirim!");
      } else {
        let errorMessage =
          data.message || "Terjadi kesalahan saat mengirim email reset!";

        // Handle specific error cases
        if (data.code === "USER_NOT_FOUND") {
          errorMessage = "Email tidak terdaftar dalam sistem!";
        } else if (data.code === "EMAIL_NOT_VERIFIED") {
          errorMessage =
            "Email belum diverifikasi. Silakan verifikasi email terlebih dahulu!";
        } else if (data.code === "ACCOUNT_INACTIVE") {
          errorMessage = "Akun Anda tidak aktif. Hubungi administrator!";
        }

        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error during password reset request:", error);

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
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isLoading && !isSuccess) {
      handleSubmit();
    }
  };

  // Clear error when user starts typing
  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);

    if (error) {
      setError("");
    }

    // Reset spam protection when changing email
    if (newEmail !== email) {
      setLastRequestTime(null);
      setRequestCooldown(0);
      setRequestAttempts(0);
      setIsBlocked(false);
      setIsSuccess(false);

      // Clean up localStorage for old email if exists
      if (email) {
        localStorage.removeItem(`reset_timer_${email}`);
      }
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
          {/* Back Button */}
          <div className="mb-6">
            <Link
              href="/login"
              className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors duration-200"
            >
              <MdArrowBack className="mr-2" size={18} />
              <span className="text-sm">Kembali ke Login</span>
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-semibold text-slate-900 mb-3">
              {isSuccess ? "Email Terkirim" : "Lupa Kata Sandi"}
            </h1>
            <p className="text-slate-500 text-base leading-relaxed">
              {isSuccess
                ? "Kami telah mengirim instruksi reset kata sandi ke email Anda"
                : "Masukkan email Anda untuk menerima instruksi reset kata sandi"}
            </p>
          </div>

          {!isSuccess ? (
            /* Reset Form */
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

              {/* Spam Protection Info */}
              {(requestCooldown > 0 || requestAttempts > 0 || isBlocked) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="text-xs text-amber-800">
                    {isBlocked ? (
                      <p>
                        <span className="font-medium">Batas terlampaui:</span>{" "}
                        Tunggu 1 jam sebelum mencoba lagi.
                      </p>
                    ) : requestCooldown > 0 ? (
                      <p>
                        <span className="font-medium">Tunggu:</span>{" "}
                        {formatCooldownTime(requestCooldown)} sebelum kirim
                        permintaan lagi
                      </p>
                    ) : (
                      requestAttempts > 0 && (
                        <p>
                          <span className="font-medium">Percobaan:</span>{" "}
                          {requestAttempts}/{MAX_ATTEMPTS_PER_HOUR} kali dalam 1
                          jam
                        </p>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || requestCooldown > 0 || isBlocked}
                className={`w-full h-12 rounded-xl font-medium text-white transition-all duration-200 ${
                  isLoading || requestCooldown > 0 || isBlocked
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-slate-900 transform hover:scale-[1.01] active:scale-[0.99]"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Mengirim...
                  </div>
                ) : requestCooldown > 0 ? (
                  `Kirim Reset (${formatCooldownTime(requestCooldown)})`
                ) : isBlocked ? (
                  "Terlalu Banyak Percobaan"
                ) : (
                  "Kirim Reset Kata Sandi"
                )}
              </button>

              {/* Login Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-slate-600">
                  Sudah ingat kata sandi?{" "}
                  <Link
                    href="/login"
                    className="text-slate-900 font-medium hover:text-blue-600 transition-colors duration-200"
                  >
                    Masuk
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            /* Success State */
            <div className="space-y-6">
              {/* Success Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>

              {/* Success Message */}
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                <p className="text-green-700 text-sm text-center">
                  Periksa kotak masuk email Anda dan ikuti instruksi untuk
                  mereset kata sandi. Email mungkin masuk ke folder spam.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail("");
                    setError("");
                    setLastRequestTime(null);
                    setRequestCooldown(0);
                    setRequestAttempts(0);
                    setIsBlocked(false);
                  }}
                  className="w-full h-12 rounded-xl font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all duration-200"
                >
                  Kirim ke Email Lain
                </button>

                <Link
                  href="/login"
                  className="w-full h-12 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 transition-all duration-200 flex items-center justify-center"
                >
                  Kembali ke Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Loading component for Suspense fallback (optional, karena ForgotPassword tidak menggunakan searchParams)
const ForgotPasswordLoading = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Memuat halaman...</p>
      </div>
    </div>
  );
};

// Main component (tidak perlu Suspense karena tidak menggunakan searchParams)
const ForgotPassword = () => {
  return <ForgotPasswordForm />;
};

export default ForgotPassword;
