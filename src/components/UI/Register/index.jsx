"use client";
import { useState, useEffect } from "react";
import {
  MdEmail,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdPerson,
  MdMarkEmailRead,
} from "react-icons/md";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { GiPortal } from "react-icons/gi";
import Link from "next/link";
import supabase from "@/app/utils/db";
import bcrypt from "bcryptjs";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    supplier: "",
    no_hp: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

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

  // Check if user is currently blocked and restore timer state
  useEffect(() => {
    const checkBlockAndTimerStatus = () => {
      if (!formData.email) return;

      const now = Date.now();

      // Check block status
      const blockData = localStorage.getItem(`resend_block_${formData.email}`);
      if (blockData) {
        const { blockTime, attempts } = JSON.parse(blockData);

        if (now - blockTime < BLOCK_DURATION * 1000) {
          setIsBlocked(true);
          setResendAttempts(attempts);
        } else {
          // Block expired, reset
          localStorage.removeItem(`resend_block_${formData.email}`);
          setIsBlocked(false);
          setResendAttempts(0);
        }
      }

      // Restore cooldown timer state
      const timerData = localStorage.getItem(`resend_timer_${formData.email}`);
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
          localStorage.removeItem(`resend_timer_${formData.email}`);
          setLastResendTime(null);
          setResendCooldown(0);
        }
      }

      // Update attempts count from localStorage
      const attemptData = localStorage.getItem(
        `resend_attempts_${formData.email}`
      );
      if (attemptData) {
        const attempts = JSON.parse(attemptData).filter(
          (timestamp) => now - timestamp < 3600000 // Filter attempts within last hour
        );
        setResendAttempts(attempts.length);

        // Update localStorage with filtered attempts
        if (attempts.length !== JSON.parse(attemptData).length) {
          localStorage.setItem(
            `resend_attempts_${formData.email}`,
            JSON.stringify(attempts)
          );
        }
      }
    };

    // Only check if on success page and email exists
    if (registrationSuccess && formData.email) {
      checkBlockAndTimerStatus();
    }
  }, [formData.email, registrationSuccess]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const validateForm = () => {
    const { name, email, no_hp, supplier, password, confirmPassword } =
      formData;

    // Check if all fields are filled
    if (
      !name ||
      !email ||
      !no_hp ||
      !supplier ||
      !password ||
      !confirmPassword
    ) {
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
      return "Kata sandi harus minimal 6 karakter!";
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return "Kata sandi harus mengandung huruf besar, huruf kecil, dan angka!";
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      return "Kata sandi tidak cocok!";
    }

    // Terms acceptance validation
    if (!acceptTerms) {
      return "Mohon setujui syarat dan ketentuan!";
    }

    return null;
  };

  // Generate verification token
  const generateVerificationToken = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36)
    );
  };

  // Send verification email function
  const sendVerificationEmail = async (email, token, name) => {
    try {
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          token,
          name,
        }),
      });

      if (!response.ok) {
        return { success: false, error: "Gagal mengirim email verifikasi!" };
      }

      return { success: true };
    } catch (error) {
      console.error("Error sending verification email:", error);
      return {
        success: false,
        error: "Terjadi kesalahan saat mengirim email!",
      };
    }
  };

  // Check spam protection before allowing resend
  const checkSpamProtection = () => {
    const now = Date.now();
    const email = formData.email;

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
    const email = formData.email;

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

  // Fungsi untuk fetch data supplier

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("supplier")
        .select("id_supplier, nama");
      if (error) throw error;
      setSuppliers(data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Fungsi untuk handle register dengan Supabase
  const handleRegisterWithSupabase = async () => {
    const { name, email, no_hp, supplier, password } = formData;

    // Cek apakah email sudah terdaftar
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("email")
      .eq("email", email.toLowerCase())
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      return {
        success: false,
        error: "Terjadi kesalahan saat memeriksa email!",
      };
    }

    if (existingUser) {
      return {
        success: false,
        error: "Email sudah terdaftar! Silakan gunakan email lain.",
      };
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam

    // Hash password
    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Simpan user baru ke database dengan status belum terverifikasi
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            nama: name.trim(),
            email: email.toLowerCase().trim(),
            no_hp: no_hp.trim(),
            id_supplier: supplier || null,
            role: "Supplier",
            password: hashedPassword,
            email_verified: false,
            verification_token: verificationToken,
            verification_token_expires: verificationExpiry.toISOString(),
            created_at: new Date().toISOString(),
          },
        ])
        .select("nama, email")
        .single();

      if (insertError) {
        console.error("Error inserting user:", insertError);

        if (insertError.code === "23505") {
          return { success: false, error: "Email sudah terdaftar!" };
        }

        return {
          success: false,
          error: "Terjadi kesalahan saat menyimpan data!",
        };
      }

      // Kirim email verifikasi
      const emailResult = await sendVerificationEmail(
        email,
        verificationToken,
        name
      );

      if (!emailResult.success) {
        // Jika gagal kirim email, hapus user yang baru dibuat
        await supabase.from("users").delete().eq("id", newUser.id);

        return { success: false, error: emailResult.error };
      }

      return { success: true, data: newUser };
    } catch (hashError) {
      console.error("Error hashing password:", hashError);
      return {
        success: false,
        error: "Terjadi kesalahan saat memproses data!",
      };
    }
  };

  const handleSubmit = async () => {
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

    // Register user dengan Supabase
    const result = await handleRegisterWithSupabase();

    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    // Success - show verification message
    setRegistrationSuccess(true);
    toast.success(
      "Akun berhasil dibuat! Silakan periksa email Anda untuk verifikasi."
    );
    setIsLoading(false);
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
          email: formData.email,
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

  // Format remaining cooldown time
  const formatCooldownTime = (seconds) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${seconds}s`;
  };

  // Jika registrasi berhasil, tampilkan halaman konfirmasi
  if (registrationSuccess) {
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

        {/* Verification Message */}
        <div className="w-full flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md text-center">
            <div className="mb-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <MdMarkEmailRead className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-semibold text-slate-900 mb-3">
                Periksa Email Anda
              </h1>
              <p className="text-slate-500 text-base leading-relaxed">
                Kami telah mengirimkan link verifikasi ke{" "}
                <span className="font-medium text-slate-700">
                  {formData.email}
                </span>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">
                Langkah selanjutnya:
              </h3>
              <ol className="text-sm text-blue-700 space-y-1 text-left">
                <li>1. Buka email Anda</li>
                <li>2. Cari email dari Portal Dokumen</li>
                <li>3. Klik link verifikasi di email</li>
                <li>4. Login ke akun Anda</li>
              </ol>
            </div>

            {/* Spam Protection Info */}
            {(resendCooldown > 0 || resendAttempts > 0 || isBlocked) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="text-sm text-amber-800">
                  {isBlocked ? (
                    <p>
                      <span className="font-medium">Batas terlampaui:</span>{" "}
                      Anda telah mencoba mengirim email terlalu sering. Silakan
                      tunggu 1 jam sebelum mencoba lagi.
                    </p>
                  ) : resendCooldown > 0 ? (
                    <p>
                      <span className="font-medium">Tunggu sejenak:</span> Anda
                      dapat mengirim ulang dalam{" "}
                      {formatCooldownTime(resendCooldown)}
                    </p>
                  ) : (
                    resendAttempts > 0 && (
                      <p>
                        <span className="font-medium">Percobaan:</span>{" "}
                        {resendAttempts}/{MAX_ATTEMPTS_PER_HOUR} kali dalam 1
                        jam terakhir
                      </p>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleResendVerification}
                disabled={isResendLoading || resendCooldown > 0 || isBlocked}
                className={`w-full h-12 rounded-xl font-medium transition-colors duration-200 ${
                  isResendLoading || resendCooldown > 0 || isBlocked
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {isResendLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Mengirim...
                  </div>
                ) : resendCooldown > 0 ? (
                  `Kirim Ulang (${formatCooldownTime(resendCooldown)})`
                ) : isBlocked ? (
                  "Terlalu Banyak Percobaan"
                ) : (
                  "Kirim Ulang Email"
                )}
              </button>

              <Link
                href="/login"
                className="w-full h-12 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors duration-200 flex items-center justify-center"
              >
                Kembali ke Login
              </Link>
            </div>

            <p className="text-xs text-slate-500 mt-6">
              Tidak menerima email? Periksa folder spam atau coba kirim ulang
              setelah beberapa saat.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            {/* Supplier Field */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Supplier
              </label>
              <div className="relative">
                <select
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) =>
                    handleInputChange("supplier", e.target.value)
                  }
                  className={`w-full h-12 px-4 pr-10 border rounded-xl bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 ${
                    error
                      ? "border-red-300 focus:ring-red-500"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  onKeyPress={handleKeyPress}
                  required
                >
                  <option value="" disabled>
                    Pilih supplier
                  </option>
                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.id_supplier}
                      value={supplier.id_supplier}
                    >
                      {supplier.nama}
                    </option>
                  ))}
                </select>

                {/* Custom dropdown icon */}
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg
                    className="w-4 h-4 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

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

            {/* No HP Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Nomor HP
              </label>
              <div
                className={`flex items-center rounded-xl border transition-all duration-200 overflow-hidden ${
                  error
                    ? "border-red-300 focus-within:ring-red-500"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="pl-4 select-none">+62</span>
                <input
                  id="no_hp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.no_hp}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/\D/g, "");
                    handleInputChange("no_hp", onlyNums);
                  }}
                  className="w-full h-12 pr-4 pl-1.5 pb-0.5 focus:outline-none"
                  placeholder="89612345678"
                  required
                />
              </div>
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
