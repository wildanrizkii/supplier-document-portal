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
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    const savedRememberMe = localStorage.getItem("remember_me") === "true";

    if (savedEmail && savedRememberMe) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

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

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Basic validation
      if (!email || !password) {
        const errorMessage = "Tolong isi email dan password terlebih dahulu!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      if (email.length < 4 || password.length < 4) {
        const errorMessage =
          "Email and password must be at least 4 characters!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const errorMessage = "Invalid email format!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // Configure session duration based on remember me
      const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days vs 1 day

      const response = await signIn("credentials", {
        email: email,
        password: password,
        maxAge: maxAge.toString(),
        redirect: false,
        callbackUrl: "/",
      });

      if (response?.error) {
        let errorMessage = "An error occurred during login!";

        switch (response.error) {
          case "CredentialsSignin":
            errorMessage = "The email or password you entered is incorrect!";
            break;
          case "Configuration":
            errorMessage = "System configuration error occurred!";
            break;
          case "AccessDenied":
            errorMessage = "Access denied! Contact administrator.";
            break;
          case "Verification":
            errorMessage = "Your email has not been verified!";
            break;
          default:
            if (response.error.includes("fetch")) {
              errorMessage = "Connection problem! Check your internet.";
            } else if (response.error.includes("timeout")) {
              errorMessage = "Connection timeout! Try again.";
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

        toast.success("Login successful!");

        // Clear password but keep email if remembering
        setPassword("");
        if (!rememberMe) {
          setEmail("");
        }

        router.push("/dashboard");
      } else {
        const errorMessage = "Unknown response from server!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error during login:", error);

      let errorMessage = "An unexpected error occurred!";

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage =
          "Cannot connect to server! Check your internet connection.";
      } else if (error.name === "AbortError") {
        errorMessage = "Request was cancelled! Try again.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
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

  // Clear error when user starts typing
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError("");
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
      <div className="w-full flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-semibold text-slate-900 mb-3">
              Sign in
            </h1>
            <p className="text-slate-500 text-base leading-relaxed">
              Selamat datang kembali di Portal Dokumen CMW
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
                  placeholder="Masukkan sandi Anda"
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
                  Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </button>

            {/* Sign In Link */}
            <div className="text-center pt-4">
              <p className="text-sm text-slate-600">
                Belum memiliki akun?{" "}
                <Link
                  href="/register"
                  className="text-slate-900 font-medium hover:text-blue-600 transition-colors duration-200"
                >
                  Register
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
