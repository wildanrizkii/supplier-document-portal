"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { GiPortal } from "react-icons/gi";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(null);
  const [tokenError, setTokenError] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: [],
    isValid: false,
  });

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidToken(false);
        setTokenError("Token reset tidak ditemukan!");
        return;
      }

      try {
        const response = await fetch("/api/validate-reset-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
          setTokenError(
            data.message || "Token tidak valid atau sudah kedaluwarsa!"
          );
        }
      } catch (error) {
        console.error("Error validating token:", error);
        setIsValidToken(false);
        setTokenError("Terjadi kesalahan saat memvalidasi token!");
      }
    };

    validateToken();
  }, [token]);

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, feedback: [], isValid: false });
      return;
    }

    const feedback = [];
    let score = 0;

    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("Minimal 8 karakter");
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Satu huruf besar");
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Satu huruf kecil");
    }

    // Number check
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push("Satu angka");
    }

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Satu karakter khusus");
    }

    // Additional length bonus
    if (password.length >= 12) {
      score += 1;
    }

    const isValid = score >= 4; // Require at least 4 criteria

    setPasswordStrength({ score, feedback, isValid });
  }, [password]);

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score <= 2) return "text-red-600";
    if (passwordStrength.score <= 4) return "text-yellow-600";
    return "text-green-600";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score <= 2) return "Lemah";
    if (passwordStrength.score <= 4) return "Sedang";
    return "Kuat";
  };

  const getPasswordStrengthBarColor = () => {
    if (passwordStrength.score <= 2) return "bg-red-500";
    if (passwordStrength.score <= 4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Basic validation
      if (!password || !confirmPassword) {
        const errorMessage = "Mohon isi semua field terlebih dahulu!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // Password strength validation
      if (!passwordStrength.isValid) {
        const errorMessage = "Kata sandi tidak memenuhi kriteria keamanan!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // Password confirmation validation
      if (password !== confirmPassword) {
        const errorMessage = "Konfirmasi kata sandi tidak cocok!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // Send reset password request
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast.success("Kata sandi berhasil direset!");
      } else {
        let errorMessage =
          data.message || "Terjadi kesalahan saat mereset kata sandi!";

        // Handle specific error cases
        if (data.code === "INVALID_TOKEN") {
          errorMessage = "Token tidak valid atau sudah kedaluwarsa!";
        } else if (data.code === "WEAK_PASSWORD") {
          errorMessage = "Kata sandi tidak memenuhi kriteria keamanan!";
        } else if (data.code === "SAME_PASSWORD") {
          errorMessage =
            "Kata sandi baru tidak boleh sama dengan kata sandi lama!";
        }

        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error during password reset:", error);

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
    if (e.key === "Enter" && !isLoading && !isSuccess && isValidToken) {
      handleSubmit();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Clear error when user starts typing
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) {
      setError("");
    }
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if (error) {
      setError("");
    }
  };

  // Show loading state while validating token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Memvalidasi token...</p>
        </div>
      </div>
    );
  }

  // Show error if token is invalid
  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center space-y-10 py-12">
        {/* Logo */}
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

        <div className="w-full max-w-sm px-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-3">
              Token Tidak Valid
            </h1>
            <p className="text-slate-500 text-base leading-relaxed">
              {tokenError}
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/forgot-password"
              className="w-full h-12 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 transition-all duration-200 flex items-center justify-center"
            >
              Minta Reset Baru
            </Link>
            <Link
              href="/login"
              className="w-full h-12 rounded-xl font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all duration-200 flex items-center justify-center"
            >
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center space-y-10 py-12">
      {/* Logo */}
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
              {isSuccess ? "Reset Berhasil" : "Kata Sandi Baru"}
            </h1>
            <p className="text-slate-500 text-base leading-relaxed">
              {isSuccess
                ? "Kata sandi Anda telah berhasil direset"
                : "Masukkan kata sandi baru untuk akun Anda"}
            </p>
          </div>

          {!isSuccess ? (
            /* Reset Form */
            <div className="space-y-6">
              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Kata Sandi Baru
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
                    placeholder="Masukkan kata sandi baru"
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

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-600">
                        Kekuatan kata sandi:
                      </span>
                      <span
                        className={`text-xs font-medium ${getPasswordStrengthColor()}`}
                      >
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthBarColor()}`}
                        style={{
                          width: `${(passwordStrength.score / 6) * 100}%`,
                        }}
                      ></div>
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-600 mb-1">
                          Diperlukan:
                        </p>
                        <ul className="text-xs text-slate-500 space-y-1">
                          {passwordStrength.feedback.map((item, index) => (
                            <li key={index} className="flex items-center">
                              <span className="w-1 h-1 bg-slate-400 rounded-full mr-2"></span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    onKeyPress={handleKeyPress}
                    className={`w-full h-12 px-4 pr-12 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 ${
                      error
                        ? "border-red-300 focus:ring-red-500"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    placeholder="Konfirmasi kata sandi baru"
                    required
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200 focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <MdVisibility className="h-5 w-5" />
                    ) : (
                      <MdVisibilityOff className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Password Match Indicator */}
                {confirmPassword && (
                  <div className="mt-2">
                    {password === confirmPassword ? (
                      <p className="text-xs text-green-600 flex items-center">
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Kata sandi cocok
                      </p>
                    ) : (
                      <p className="text-xs text-red-600 flex items-center">
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Kata sandi tidak cocok
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Security Tips */}
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Tips Keamanan:
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>
                    • Gunakan kombinasi huruf besar, kecil, angka, dan simbol
                  </li>
                  <li>• Minimal 8 karakter, lebih panjang lebih baik</li>
                  <li>• Jangan gunakan informasi pribadi yang mudah ditebak</li>
                  <li>• Gunakan kata sandi yang unik untuk setiap akun</li>
                </ul>
              </div>

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
                disabled={
                  isLoading ||
                  !passwordStrength.isValid ||
                  password !== confirmPassword
                }
                className={`w-full h-12 rounded-xl font-medium text-white transition-all duration-200 ${
                  isLoading ||
                  !passwordStrength.isValid ||
                  password !== confirmPassword
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-slate-900 transform hover:scale-[1.01] active:scale-[0.99]"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Mereset...
                  </div>
                ) : (
                  "Reset Kata Sandi"
                )}
              </button>

              {/* Back to Login */}
              <div className="text-center pt-4">
                <Link
                  href="/login"
                  className="text-sm text-slate-900 hover:text-blue-600 transition-colors duration-200"
                >
                  Kembali ke Login
                </Link>
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
                  Kata sandi Anda telah berhasil direset. Anda sekarang dapat
                  masuk dengan kata sandi baru.
                </p>
              </div>

              {/* Action Button */}
              <Link
                href="/login"
                className="w-full h-12 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 transition-all duration-200 flex items-center justify-center"
              >
                Masuk Sekarang
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
