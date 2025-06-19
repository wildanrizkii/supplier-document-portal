"use client";
import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { HiMenu, HiUser, HiLogout, HiChevronRight } from "react-icons/hi";
import { IoLogOut } from "react-icons/io5";
import { RiAdminLine } from "react-icons/ri";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

const Header = ({ toggleSidebar, toggleCollapse, isCollapsed = true }) => {
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { data: session } = useSession();

  // Breadcrumb configuration
  const getBreadcrumbs = () => {
    const pathSegments = pathname.split("/").filter((segment) => segment);

    // Configuration untuk mapping path ke label yang lebih user-friendly
    const pathLabels = {
      dashboard: "Dashboard",
      "manage-part": "Manage Part",
      "main-part": "Main Part",
      "part-no-induk": "Part No Induk",
      cmw: "Part No CMW",
      laporan: "Laporan",
      settings: "Settings",
      profile: "Profile",
    };

    const breadcrumbs = [{ label: "Dashboard", href: "/" }];

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
    <header className="bg-zinc-50 top-0 z-30 pt-2 transition-all duration-300">
      <div className="px-2 sm:px-4 lg:px-6">
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
            <nav className="flex items-center space-x-1 text-sm">
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
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 text-sm hover:bg-gray-200 transition-colors focus:outline-none cursor-pointer"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className="hidden md:block text-gray-700 font-medium">
                  {session?.user.name || "..."}
                </span>
                <div
                  className={`h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm`}
                >
                  <span className="font-medium text-sm">
                    {getUserInitials(session?.user?.name)}
                  </span>
                </div>
              </div>

              {/* Enhanced Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none transition-all duration-200 ease-in-out overflow-hidden">
                  <div className="px-4 py-2 pb-4 border-b">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`h-10 min-w-10 rounded-full bg-blue-600 flex items-center justify-center text-white`}
                      >
                        <span className="font-medium text-lg">
                          {getUserInitials(session?.user?.name)}
                        </span>
                      </div>
                      <div className="w-full overflow-hidden text-ellipsis">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {session?.user.name || "..."}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {session?.user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 flex items-center gap-1 hover:bg-zinc-200 transition"
                  >
                    <IoLogOut size={20} className="text-zinc-600" />
                    <span>Logout</span>
                  </button>
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
