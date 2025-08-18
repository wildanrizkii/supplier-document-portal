"use client";
import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { HiMenu, HiUser, HiLogout, HiChevronRight } from "react-icons/hi";
import { IoLogOut } from "react-icons/io5";
import { RiAdminLine } from "react-icons/ri";
import { FiUser, FiLogOut, FiHelpCircle } from "react-icons/fi";
import { LuSettings } from "react-icons/lu";
import { MdOutlineSpaceDashboard } from "react-icons/md";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

const Header = ({ toggleSidebar, toggleCollapse, isCollapsed = true }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { data: session } = useSession();

  // Breadcrumb configuration
  const getBreadcrumbs = () => {
    const pathSegments = pathname.split("/").filter((segment) => segment);

    // Jika hanya di "/dashboard", maka return langsung 1 item
    if (
      pathname === "/dashboard" ||
      (pathSegments.length === 1 && pathSegments[0] === "dashboard")
    ) {
      return [{ label: "Dashboard", href: "/dashboard", isLast: true }];
    }

    const pathLabels = {
      manage: "Manage",
      "jenis-dokumen": "Jenis Dokumen",
      "part-name": "Part Name",
      "part-number": "Part Number",
      pengaturan: "Pengaturan",
      tentang: "Tentang",
    };

    const breadcrumbs = [];
    let currentPath = "";

    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label =
        pathLabels[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1);

      breadcrumbs.push({
        label,
        href: currentPath,
        isLast: index === pathSegments.length - 1,
      });
    });

    return breadcrumbs;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
    setShowDropdown(false);
  };

  const getUserInitials = (name) => {
    if (!name) return "...";
    const names = name.trim().split(/\s+/);
    if (names.length >= 2) {
      return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
    }
    return names[0].charAt(0).toUpperCase();
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="bg-zinc-50 top-0 z-10 pt-2 transition-all duration-300">
      <div className="px-4 sm:pl-4 lg:pl-6">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center flex-1">
            {/* Mobile menu button */}
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 lg:hidden hover:text-gray-900 hover:bg-gray-100 focus:outline-none mr-2"
              onClick={toggleSidebar}
            >
              <HiMenu size={24} />
            </button>

            {/* Breadcrumb */}
            <nav className="flex items-center space-x-1 text-md">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center">
                  {index > 0 && (
                    <HiChevronRight className="mx-2 h-4 w-4 text-gray-400" />
                  )}
                  {crumb.isLast ? (
                    <span className="text-gray-600 font-medium">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={
                        crumb.href != "/manage-part"
                          ? crumb.href
                          : crumb.href + "/main-part"
                      }
                      className="text-gray-500 hover:text-gray-700 transition-colors duration-150"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* User profile dropdown */}
          <div className="ml-4 flex items-center md:ml-6">
            <div className="relative" ref={dropdownRef}>
              <button
                className="flex items-center space-x-1 p-2 rounded-full hover:bg-gray-100 transition-all duration-300 max-w-[180px]"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className="hidden md:block text-md font-medium text-gray-700 truncate">
                  {session?.user?.nama || session?.user?.name || "User"}
                </span>
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {getUserInitials(
                      session?.user?.nama || session?.user?.name
                    )}
                  </span>
                </div>
              </button>

              {/* Enhanced Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 pt-4 z-50">
                  {/* User Info Header */}
                  <div className="px-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {getUserInitials(
                            session?.user?.nama || session?.user?.name
                          )}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {session?.user?.nama || session?.user?.name || "User"}
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
                        setShowDropdown(false);
                        router.push("/dashboard");
                      }}
                    >
                      <MdOutlineSpaceDashboard
                        size={18}
                        className="text-gray-700"
                      />
                      <span>Dashboard</span>
                    </button>

                    <button
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
                      onClick={() => {
                        setShowDropdown(false);
                        router.push("/settings");
                      }}
                    >
                      <LuSettings size={18} className="text-gray-700" />
                      <span>Pengaturan</span>
                    </button>

                    <button
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
                      onClick={() => {
                        setShowDropdown(false);
                        router.push("/about");
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
        </div>
      </div>
    </header>
  );
};

export default Header;
