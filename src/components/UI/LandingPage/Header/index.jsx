"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { GiPortal } from "react-icons/gi";
import { FiUser, FiLogOut, FiFileText, FiHelpCircle } from "react-icons/fi";
import { LuSettings } from "react-icons/lu";

const LandingPageHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
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

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserMenuOpen && !event.target.closest(".user-menu-container")) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleLogout = () => {
    signOut();
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/40 backdrop-blur-md transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center group cursor-pointer space-x-1">
              <GiPortal
                className="text-gray-900 group-hover:text-blue-600 transition-colors duration-300"
                size={22}
              />
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

            {/* Conditional rendering based on session */}
            {status === "loading" ? (
              <div className="hidden sm:block h-12 w-[180px] bg-gray-100 animate-pulse rounded-full"></div>
            ) : session ? (
              // User Menu (when logged in)
              <div className="hidden sm:flex items-center space-x-4">
                <div className="relative user-menu-container">
                  <button
                    className="flex items-center space-x-1 p-2 rounded-full hover:bg-gray-100 transition-all duration-300 max-w-[180px]"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  >
                    <span className="text-md font-medium text-gray-700 truncate">
                      {session?.user?.nama || session?.user?.name || "User"}
                    </span>
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {(session?.user?.nama || session?.user?.name || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 pt-4 z-50">
                      {/* User Info Header */}
                      <div className="px-4 pb-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {(
                                session?.user?.nama ||
                                session?.user?.name ||
                                "U"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {session?.user?.nama ||
                                session?.user?.name ||
                                "User"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {session?.user?.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="my-2">
                        <button
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push("/settings");
                          }}
                        >
                          <LuSettings size={18} className="text-gray-700" />
                          <span>Pengaturan</span>
                        </button>

                        <button
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push("/support");
                          }}
                        >
                          <FiHelpCircle size={18} className="text-gray-700" />
                          <span>Bantuan</span>
                        </button>

                        <hr className="border-gray-100" />

                        <button
                          className="w-full text-left px-4 py-3 text-sm text-red-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2 rounded-b-2xl -mb-2"
                          onClick={handleLogout}
                        >
                          <FiLogOut size={18} className="text-red-700 pl-0.5" />
                          <span>Keluar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Auth Buttons (when not logged in)
              <div className="hidden sm:flex items-center space-x-4">
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
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div
          className={`md:hidden absolute top-full left-0 right-0 bg-white rounded-b-3xl backdrop-blur-md border-b border-gray-200 shadow-lg transition-all duration-300 ease-in-out z-50 ${
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

            {/* Mobile Auth/User Section */}
            {session ? (
              // Mobile User Info (when logged in)
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-3 mb-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {(session?.user?.nama || session?.user?.name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {session?.user?.nama || session?.user?.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <button
                    className="w-full text-left py-3 px-4 text-base font-medium text-gray-700 hover:text-gray-900 transition-all duration-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push("/profile");
                    }}
                  >
                    <LuSettings size={22} className="text-gray-700" />
                    <span>Pengaturan</span>
                  </button>
                  <button
                    className="w-full text-left py-3 px-4 text-base font-medium text-gray-700 hover:text-gray-900 transition-all duration-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push("/support");
                    }}
                  >
                    <FiHelpCircle size={22} className="text-gray-700" />
                    <span>Bantuan</span>
                  </button>
                  <hr className="border-gray-200" />
                  <button
                    className="w-full text-left py-3 px-4 text-base font-medium text-red-700 hover:text-red-700 hover:bg-red-50 transition-all duration-300 rounded-lg flex items-center space-x-2 group"
                    onClick={handleLogout}
                  >
                    <FiLogOut size={22} className="text-red-700 pl-0.5" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            ) : (
              // Mobile Auth Buttons (when not logged in)
              <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
                <button
                  className="w-full text-center py-3 px-6 text-lg font-medium text-gray-700 hover:text-gray-900 transition-all duration-300 rounded-full hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push("/login")}
                >
                  Login
                </button>
                <button
                  className="w-full py-3 px-6 bg-zinc-900 hover:bg-zinc-800 text-white text-lg font-medium rounded-full transition-all duration-300 transform hover:scale-105 cursor-pointer"
                  onClick={() => router.push("/register")}
                >
                  Register
                </button>
              </div>
            )}
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
