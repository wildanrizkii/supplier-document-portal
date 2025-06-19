"use client";
import { useState } from "react";
import {
  MdEmail,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdPerson,
} from "react-icons/md";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { GiPortal } from "react-icons/gi";
import Link from "next/link";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const router = useRouter();

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword } = formData;

    // Check if all fields are filled
    if (!name || !email || !password || !confirmPassword) {
      return "Mohon lengkapi semua kolom!";
    }

    // Name validation
    if (name.length < 2) {
      return "Nama harus minimal 2 karakter!";
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Format email tidak valid!";
    }

    // Password validation
    if (password.length < 6) {
      return "Password harus minimal 6 karakter!";
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return "Password harus mengandung huruf besar, huruf kecil, dan angka!";
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      return "Password tidak cocok!";
    }

    // Terms acceptance validation
    if (!acceptTerms) {
      return "Mohon setujui syarat dan ketentuan!";
    }

    return null;
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Validate form
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        toast.error(validationError);
        setIsLoading(false);
        return;
      }

      // Call your registration API
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = "Pendaftaran gagal!";

        switch (response.status) {
          case 400:
            errorMessage = data.message || "Data pendaftaran tidak valid!";
            break;
          case 409:
            errorMessage = "Email sudah terdaftar! Silakan gunakan email lain.";
            break;
          case 422:
            errorMessage = "Format data tidak valid!";
            break;
          case 500:
            errorMessage = "Terjadi kesalahan server! Silakan coba lagi nanti.";
            break;
          default:
            errorMessage =
              data.message || "Terjadi kesalahan saat pendaftaran!";
        }

        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // Success
      toast.success("Pendaftaran berhasil! Silakan masuk ke akun Anda.");

      // Clear form
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setAcceptTerms(false);

      // Redirect to login page
      router.push("/login");
    } catch (error) {
      console.error("Error during registration:", error);

      let errorMessage = "Terjadi kesalahan yang tidak terduga!";

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage =
          "Tidak dapat terhubung ke server! Periksa koneksi internet Anda.";
      } else if (error.name === "AbortError") {
        errorMessage = "Permintaan dibatalkan! Silakan coba lagi.";
      } else if (error.message) {
        errorMessage = `Kesalahan: ${error.message}`;
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Logo - Top Left */}
      <div className="absolute flex items-center top-8 left-8 group cursor-pointer space-x-1">
        <GiPortal
          className="text-gray-900 group-hover:text-blue-600 transition-colors duration-300"
          size={22}
        />
        <p className="text-xl font-semibold tracking-tight text-nowrap text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
          Portal Dokumen
        </p>
      </div>

      {/* Main Content */}
      <div className="w-full flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-semibold text-slate-900 mb-3">
              Buat Akun
            </h1>
            <p className="text-slate-500 text-base leading-relaxed">
              Bergabunglah dengan sistem kami
            </p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Nama Lengkap
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                onKeyPress={handleKeyPress}
                className={`w-full h-12 px-4 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 ${
                  error
                    ? "border-red-300 focus:ring-red-500"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                placeholder="Masukkan nama lengkap Anda"
                required
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Alamat Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
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
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  onKeyPress={handleKeyPress}
                  className={`w-full h-12 px-4 pr-12 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 ${
                    error
                      ? "border-red-300 focus:ring-red-500"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  placeholder="Buat kata sandi yang kuat"
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
              <p className="text-xs text-slate-500 mt-2">
                Harus mengandung huruf besar, huruf kecil, dan angka
              </p>
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
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  onKeyPress={handleKeyPress}
                  className={`w-full h-12 px-4 pr-12 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 ${
                    error
                      ? "border-red-300 focus:ring-red-500"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  placeholder="Konfirmasi kata sandi Anda"
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
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start py-2">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`relative w-5 h-5 rounded border-2 transition-all duration-200 mt-0.5 flex-shrink-0 ${
                    acceptTerms
                      ? "bg-slate-900 border-slate-900"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {acceptTerms && (
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
                <span className="ml-2 text-sm text-slate-600 leading-relaxed">
                  Saya setuju dengan{" "}
                  <a
                    href="#"
                    className="text-slate-900 hover:text-blue-600 transition-colors duration-200"
                  >
                    Syarat
                  </a>{" "}
                  dan{" "}
                  <a
                    href="#"
                    className="text-slate-900 hover:text-blue-600 transition-colors duration-200"
                  >
                    Ketentuan
                  </a>
                  .
                </span>
              </label>
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
                  Membuatkan akun...
                </div>
              ) : (
                "Buat Akun"
              )}
            </button>

            {/* Sign In Link */}
            <div className="text-center pt-4">
              <p className="text-sm text-slate-600">
                Sudah memiliki akun?{" "}
                <Link
                  href="/login"
                  className="text-slate-900 font-medium hover:text-blue-600 transition-colors duration-200"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
