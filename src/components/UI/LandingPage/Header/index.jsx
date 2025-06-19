"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GiPortal } from "react-icons/gi";

const LandingPageHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const navigationItems = ["Dokumen", "Tentang Kami", "FAQ"];

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup function to reset overflow when component unmounts
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/40 backdrop-blur-md transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center group cursor-pointer space-x-1">
              <GiPortal size={22} />
              <p className="text-xl font-semibold tracking-tight text-nowrap text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                Portal Dokumen
              </p>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-10">
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
              className="sm:hidden p-2 text-gray-700 hover:text-gray-900 transition-all duration-300 relative z-50"
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
          className={`md:hidden absolute top-full left-0 right-0 bg-white rounded-b-2xl backdrop-blur-md border-b border-gray-200 shadow-lg transition-all duration-300 ease-in-out z-50 ${
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

      {/* Mobile Menu Overlay - Only below dropdown */}
      {isMobileMenuOpen && (
        <div
          className="fixed left-0 right-0 bottom-0 bg-black/50 z-30 md:hidden transition-opacity duration-300"
          style={{ top: "calc(100vh - (100vh - 100px))" }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default LandingPageHeader;
