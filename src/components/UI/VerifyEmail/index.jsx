// app/verify-email/page.js
"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GiPortal } from "react-icons/gi";
import { MdCheckCircle, MdError, MdHourglassEmpty } from "react-icons/md";
import Link from "next/link";
import toast from "react-hot-toast";

// Create a separate component that uses useSearchParams
const VerifyEmailContent = () => {
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("");
  const [userData, setUserData] = useState(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token verifikasi tidak ditemukan!");
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken) => {
    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus("success");
        setMessage("Email berhasil diverifikasi!");
        setUserData(data.user);
        toast.success("Email berhasil diverifikasi!");
      } else {
        setStatus("error");
        setMessage(data.error || "Gagal memverifikasi email!");
        toast.error(data.error || "Gagal memverifikasi email!");
      }
    } catch (error) {
      console.error("Error verifying email:", error);
      setStatus("error");
      setMessage("Terjadi kesalahan saat memverifikasi email!");
      toast.error("Terjadi kesalahan saat memverifikasi email!");
    }
  };

  const handleResendVerification = async () => {
    if (!userData?.email) return;

    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userData.email }),
      });

      if (response.ok) {
        toast.success("Email verifikasi baru telah dikirim!");
      } else {
        toast.error("Gagal mengirim email verifikasi baru!");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan!");
    }
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <MdHourglassEmpty className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-3">
              Memverifikasi Email...
            </h1>
            <p className="text-slate-500 text-base leading-relaxed">
              Mohon tunggu, kami sedang memverifikasi email Anda.
            </p>
          </div>
        );

      case "success":
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <MdCheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-3">
              Email Terverifikasi!
            </h1>
            <p className="text-slate-500 text-base leading-relaxed mb-6">
              Selamat! Email Anda telah berhasil diverifikasi.{" "}
              {userData?.nama && (
                <span className="font-medium text-slate-700">
                  Selamat datang, {userData.nama}!
                </span>
              )}
            </p>

            <div className="bg-green-50 border border-green-100 rounded-xl p-6 mb-6">
              <p className="text-green-800 font-medium mb-2">
                Akun Anda telah aktif!
              </p>
              <p className="text-green-700 text-sm">
                Anda sekarang dapat masuk ke Portal Dokumen dan menggunakan
                semua fitur yang tersedia.
              </p>
            </div>

            <div className="space-y-4">
              <Link
                href="/login"
                className="w-full h-12 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors duration-200 flex items-center justify-center"
              >
                Masuk ke Akun
              </Link>

              <Link
                href="/"
                className="w-full h-12 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors duration-200 flex items-center justify-center"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <MdError className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-3">
              Verifikasi Gagal
            </h1>
            <p className="text-slate-500 text-base leading-relaxed mb-6">
              {message}
            </p>

            <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-6">
              <h3 className="font-medium text-red-900 mb-2">
                Kemungkinan penyebab:
              </h3>
              <ul className="text-sm text-red-700 space-y-1 text-left">
                <li>• Link verifikasi sudah kedaluwarsa</li>
                <li>• Link verifikasi tidak valid</li>
                <li>• Email sudah terverifikasi sebelumnya</li>
                <li>• Terjadi kesalahan sistem</li>
              </ul>
            </div>

            <div className="space-y-4">
              {userData?.email && (
                <button
                  onClick={handleResendVerification}
                  className="w-full h-12 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors duration-200"
                >
                  Kirim Ulang Email Verifikasi
                </button>
              )}

              <Link
                href="/register"
                className="w-full h-12 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors duration-200 flex items-center justify-center"
              >
                Daftar Ulang
              </Link>

              <Link
                href="/login"
                className="w-full h-12 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors duration-200 flex items-center justify-center"
              >
                Coba Login
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full flex items-center justify-center px-8 py-12">
      <div className="w-full max-w-md">{renderContent()}</div>
    </div>
  );
};

// Loading component for Suspense fallback
const VerifyEmailLoading = () => (
  <div className="w-full flex items-center justify-center px-8 py-12">
    <div className="w-full max-w-md text-center">
      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <MdHourglassEmpty className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
      <h1 className="text-3xl font-semibold text-slate-900 mb-3">Memuat...</h1>
      <p className="text-slate-500 text-base leading-relaxed">
        Mohon tunggu sebentar.
      </p>
    </div>
  </div>
);

// Main page component
const VerifyEmailPage = () => {
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

      {/* Main Content wrapped in Suspense */}
      <Suspense fallback={<VerifyEmailLoading />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
};

export default VerifyEmailPage;
