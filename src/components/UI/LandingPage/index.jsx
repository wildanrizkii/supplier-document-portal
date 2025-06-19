"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";

const LandingPage = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  // Handle scroll for parallax effects
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);
    setIsVisible(true);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      title: "Upload Dokumen",
      description:
        "Upload dan kelola dokumen dengan sistem backup otomatis dan notifikasi expire",
      icon: "📁",
      color: "from-blue-500 to-purple-600",
    },
    {
      title: "Notifikasi Email",
      description:
        "Dapatkan reminder otomatis via email sebelum dokumen expire",
      icon: "📧",
      color: "from-green-500 to-blue-500",
    },
    {
      title: "Interface Intuitif",
      description: "Desain yang clean dan mudah digunakan untuk semua kalangan",
      icon: "✨",
      color: "from-purple-500 to-pink-500",
    },
  ];

  const navigationItems = ["Dokumen", "Notifikasi", "Tentang Kami", "FAQ"];

  return (
    <div className="bg-white min-h-screen overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center group cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3 transform transition-all duration-300 group-hover:rotate-12 group-hover:scale-110">
                <div className="w-full h-full rounded-lg bg-white/20 backdrop-blur-sm"></div>
              </div>
              <p className="text-xl font-light tracking-tight text-nowrap text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                CMW Portal
              </p>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {navigationItems.map((item, index) => (
                <a
                  key={item}
                  href="#"
                  className="relative text-md text-nowrap font-medium text-gray-600 hover:text-gray-900 transition-all duration-300 group"
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 group-hover:w-full"></span>
                </a>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="sm:hidden p-2 text-gray-600 hover:text-gray-900 transition-all duration-300 relative z-50"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <div className="relative w-6 h-6">
                <span
                  className={`absolute block w-6 h-0.5 bg-current transform transition-all duration-300 ${
                    isMobileMenuOpen ? "rotate-45 top-3" : "top-1"
                  }`}
                />
                <span
                  className={`absolute block w-6 h-0.5 bg-current transform transition-all duration-300 top-3 ${
                    isMobileMenuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute block w-6 h-0.5 bg-current transform transition-all duration-300 ${
                    isMobileMenuOpen ? "-rotate-45 top-3" : "top-5"
                  }`}
                />
              </div>
            </button>

            {/* Desktop Auth Buttons */}
            <div className="hidden sm:flex md:flex items-center space-x-4">
              <button
                className="text-md font-medium text-gray-700 hover:text-gray-900 transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => router.push("/login")}
              >
                Login
              </button>
              <button
                className="px-4 sm:px-5 py-2 bg-zinc-900 text-white text-md font-medium rounded-full transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => router.push("/register")}
              >
                Register
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div
          className={`md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg transition-all duration-300 ease-in-out ${
            isMobileMenuOpen
              ? "opacity-100 translate-y-0 visible"
              : "opacity-0 -translate-y-4 invisible"
          }`}
        >
          <div className="max-w-6xl mx-auto px-6 py-6">
            {/* Mobile Navigation */}
            <nav className="space-y-4 mb-6">
              {navigationItems.map((item, index) => (
                <a
                  key={item}
                  href="#"
                  className="block text-lg text-nowrap font-medium text-gray-600 hover:text-blue-600 transition-all duration-300 py-2 px-4 rounded-lg hover:bg-blue-50 transform hover:scale-105"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {item}
                </a>
              ))}
            </nav>

            {/* Mobile Auth Buttons */}
            <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
              <button
                className="w-full text-center py-3 px-6 text-lg font-medium text-gray-700 hover:text-gray-900 transition-all duration-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push("/login")}
              >
                Login
              </button>
              <button
                className="w-full py-3 px-6 bg-zinc-900 hover:bg-zinc-800 text-white text-lg font-medium rounded-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                onClick={() => router.push("/register")}
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-20 relative overflow-hidden">
        {/* Subtle Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Reduced Gradient Orbs */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-96 h-96 rounded-full blur-3xl opacity-20 transition-all duration-1000`}
              style={{
                background: `linear-gradient(45deg, ${
                  i % 2 === 0 ? "#3B82F6" : "#8B5CF6"
                }, ${i % 2 === 0 ? "#1D4ED8" : "#7C3AED"})`,
                left: `${20 + i * 30}%`,
                top: `${10 + i * 20}%`,
                transform: `translate(${mousePosition.x * 0.005 * (i + 1)}px, ${
                  mousePosition.y * 0.005 * (i + 1) + scrollY * 0.05
                }px)`,
              }}
            />
          ))}
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="py-20 md:py-32">
            {/* Hero Content */}
            <div
              className={`text-center max-w-4xl mx-auto mb-16 transition-all duration-1000 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              <h1 className="text-4xl md:text-6xl font-medium leading-tight mb-8 text-gray-900 tracking-tight">
                <span className="inline-block hover:scale-105 transition-transform duration-300 cursor-default">
                  Selamat
                </span>{" "}
                <span className="inline-block hover:scale-105 transition-transform duration-300 cursor-default">
                  datang
                </span>{" "}
                <span className="inline-block hover:scale-105 transition-transform duration-300 cursor-default">
                  di
                </span>{" "}
                <span className="inline-block hover:scale-105 transition-transform duration-300 cursor-default">
                  Portal
                </span>{" "}
                <span className="inline-block hover:scale-105 transition-transform duration-300 cursor-default">
                  Dokumen
                </span>{" "}
                <span className="inline-block text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-blue-400 bg-clip-text font-bold hover:scale-105 transition-transform duration-300 cursor-default pr-1">
                  CMW
                </span>
              </h1>

              <h2 className="text-lg md:text-xl font-light text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed hover:text-gray-800 transition-colors duration-300 cursor-default">
                Upload, kelola, dan pantau dokumen Anda dengan notifikasi email
                otomatis untuk tanggal expire dalam satu platform yang
                terintegrasi dan aman.
              </h2>

              {/* Interactive Stats */}
              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mb-8 text-sm px-4">
                {[
                  {
                    value: "5K+",
                    label: "Dokumen Dikelola",
                    color: "text-blue-600",
                  },
                  { value: "99.9%", label: "Uptime", color: "text-green-600" },
                  {
                    value: "24/7",
                    label: "Monitoring",
                    color: "text-purple-600",
                  },
                ].map((stat, index) => (
                  <div key={index} className="text-center group cursor-pointer">
                    <div
                      className={`font-light text-xl sm:text-2xl text-gray-900 group-hover:${stat.color} transition-all duration-300 transform group-hover:scale-110`}
                    >
                      {stat.value}
                    </div>
                    <div className="text-gray-500 font-light group-hover:text-gray-700 transition-colors duration-300 text-xs sm:text-sm">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Location with Animation */}
              <div className="flex items-center justify-center mb-12 text-gray-400 hover:text-blue-500 transition-colors duration-300 cursor-pointer group">
                <svg
                  className="w-4 h-4 mr-1 group-hover:animate-pulse"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-light">Jakarta, Indonesia</span>
              </div>

              {/* Enhanced CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
                <button className="w-full sm:w-auto group px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-gray-900 to-gray-700 hover:from-blue-600 hover:to-purple-600 text-white font-light rounded-full transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95">
                  <span className="flex items-center justify-center">
                    <svg
                      className="w-6 h-6 mr-2 transition-transform duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Upload Dokumen
                  </span>
                </button>

                <button className="w-full sm:w-auto group px-6 sm:px-8 py-3 sm:py-4 bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-700 font-light rounded-full hover:bg-white hover:shadow-xl hover:border-gray-200 transition-all duration-300 transform hover:scale-105 active:scale-95">
                  <span className="flex items-center justify-center">
                    <svg
                      className="w-6 h-6 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Cara Upload Dokumen
                  </span>
                </button>
              </div>
            </div>

            {/* Cleaner Hero Image */}
            <div
              className={`relative group transition-all duration-1000 delay-300 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              {/* Main Image Container - More minimal */}
              <div className="relative rounded-2xl overflow-hidden shadow-xl transform transition-all duration-700 group-hover:shadow-2xl group-hover:scale-[1.01]">
                <div className="aspect-[16/9] sm:aspect-[16/10] md:aspect-[16/9] lg:aspect-[16/8] relative">
                  <Image
                    src="/images/cover.png"
                    alt="CMW Document Portal"
                    width={1536}
                    height={1024}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />

                  {/* Subtle Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-blue-900/40 group-hover:from-black/40 group-hover:via-black/20 group-hover:to-blue-900/30 transition-all duration-500"></div>

                  {/* Title and Subtitle Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center text-center p-4 sm:p-6 md:p-8">
                    <div className="max-w-2xl mx-auto">
                      <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-2 sm:mb-3 md:mb-4 opacity-90 group-hover:opacity-100 transition-opacity duration-500">
                        PT. Cipta Mandiri Wirasakti
                      </h3>
                      <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white font-medium leading-relaxed opacity-80 group-hover:opacity-90 transition-opacity duration-500">
                        To be the leader of wire harness manufacturing in the
                        automotive industry including motorcycle, car, truck &
                        bus as well as to be one of the major manufacturer of
                        other electronic cabling components / system.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Minimal Decorative Elements */}
              <div className="absolute -top-2 -right-2 w-16 h-16 bg-gradient-to-br from-blue-200/50 to-purple-200/50 rounded-full blur-xl opacity-30"></div>
              <div className="absolute -bottom-2 -left-2 w-20 h-20 bg-gradient-to-br from-purple-200/50 to-pink-200/50 rounded-full blur-xl opacity-20"></div>
            </div>
          </div>
        </div>
      </main>

      {/* Enhanced Features Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-light text-gray-900 mb-4 hover:text-blue-600 transition-colors duration-300 cursor-default">
              Mengapa Memilih CMW Portal?
            </h3>
            <p className="text-lg font-light text-gray-600 max-w-2xl mx-auto hover:text-gray-800 transition-colors duration-300 cursor-default">
              Platform yang dirancang khusus untuk kemudahan pengelolaan dokumen
              dengan sistem notifikasi expire
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl cursor-pointer group ${
                  activeFeature === index
                    ? "ring-2 ring-blue-500 shadow-blue-100"
                    : ""
                }`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-light text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
                  {feature.title}
                </h4>
                <p className="text-sm font-light text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                  {feature.description}
                </p>

                {/* Interactive Progress Bar */}
                <div className="mt-6 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${
                      feature.color
                    } transition-all duration-1000 ${
                      activeFeature === index ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
