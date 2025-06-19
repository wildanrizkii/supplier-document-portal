"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { RiDashboardLine, RiAdminLine } from "react-icons/ri";
import { LuCodesandbox, LuBox } from "react-icons/lu";
import {
  IoChevronUpOutline,
  IoChevronDownOutline,
  IoSettingsOutline,
} from "react-icons/io5";
import { LuPackage, LuHammer, LuRuler } from "react-icons/lu";
import { PiToolbox } from "react-icons/pi";
import { VscTools } from "react-icons/vsc";
import { FiInfo } from "react-icons/fi";
import { AiOutlineDatabase } from "react-icons/ai";
import { LiaDatabaseSolid } from "react-icons/lia";
import { useSession } from "next-auth/react";

// Constants untuk menu navigasi
const NAVIGATION_ITEMS = [
  {
    name: "Dashboard",
    href: "/",
    subpaths: ["/"],
    icon: <RiDashboardLine size={22} />,
    roles: ["Admin"],
  },
  {
    name: "Manage Part",
    href: "/manage-part",
    subpaths: ["/manage-part"],
    icon: <VscTools size={22} />,
    roles: ["Admin"],
    hasSubmenu: true,
    submenu: [
      {
        name: "Main Part",
        href: "/manage-part/main-part",
        icon: <PiToolbox size={22} />,
      },
      {
        name: "Part No Induk",
        href: "/manage-part/part-no-induk",
        icon: <LuBox size={22} />,
      },
      {
        name: "CMW",
        href: "/manage-part/cmw",
        icon: <LuCodesandbox size={22} />,
      },
      {
        name: "Material",
        href: "/manage-part/material",
        icon: <LuPackage size={22} />,
      },
      {
        name: "Maker",
        href: "/manage-part/maker",
        icon: <LuHammer size={22} />,
      },
      {
        name: "Unit",
        href: "/manage-part/unit",
        icon: <LuRuler size={22} />,
      },
      {
        name: "Lokal",
        href: "/manage-part/lokal",
        icon: <AiOutlineDatabase size={22} />,
      },
      {
        name: "Import",
        href: "/manage-part/import",
        icon: <LiaDatabaseSolid size={22} />,
      },
      {
        name: "Supply",
        href: "/manage-part/supply",
        icon: <LiaDatabaseSolid size={22} />,
      },
    ],
  },
  {
    name: "Settings",
    href: "/settings",
    subpaths: ["/settings/users"],
    icon: <IoSettingsOutline size={22} />,
    roles: ["Admin"],
  },
  {
    name: "About",
    href: "/about",
    subpaths: ["/about"],
    icon: <FiInfo size={22} />,
    roles: ["Admin"],
  },
];

const Sidebar = ({
  isOpen,
  toggleSidebar,
  isCollapsed = false,
  setIsCollapsed,
}) => {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const hoverTimeoutRef = useRef(null);
  const menuRefs = useRef({});

  const { data: session } = useSession();

  // Function to toggle collapsed state
  const handleToggleCollapse = () => {
    if (setIsCollapsed) {
      setIsCollapsed(!isCollapsed);
      // Reset expanded menus when collapsing
      if (!isCollapsed) {
        setExpandedMenus({});
        setHoveredMenu(null);
      }
    }
  };

  // Function to toggle submenu
  const toggleSubmenu = (menuName) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  // Handle mouse enter for collapsed menu with submenu
  const handleMouseEnter = (item) => {
    if (isCollapsed && item.hasSubmenu) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      const menuElement = menuRefs.current[item.name];
      if (menuElement) {
        const rect = menuElement.getBoundingClientRect();
        setPopupPosition({
          top: rect.top,
          left: rect.right + 8, // 8px gap from sidebar
        });
      }

      setHoveredMenu(item);
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (isCollapsed) {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredMenu(null);
      }, 150); // Small delay to allow moving to popup
    }
  };

  // Handle popup mouse enter
  const handlePopupMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  // Handle popup mouse leave
  const handlePopupMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMenu(null);
    }, 150);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Memoize filtered navigation untuk optimasi performa
  const filteredNavigation = useMemo(() => {
    const userRole = "Admin";
    if (!userRole) return [];

    return NAVIGATION_ITEMS.filter((item) => item.roles.includes(userRole));
  }, [session?.user?.role]);

  // Fungsi untuk menentukan apakah menu aktif berdasarkan path
  const isMenuActive = (item) => {
    // Exact match untuk halaman utama "/"
    if (item.href === "/" && pathname === "/") return true;

    // Untuk path lain, cek exact match terlebih dahulu
    if (pathname === item.href) return true;

    // Cek untuk sub-path, tapi skip jika item.href adalah "/"
    if (item.subpaths?.length > 0 && item.href !== "/") {
      return item.subpaths.some((subpath) => {
        // Exact match untuk subpath
        if (pathname === subpath) return true;

        // StartsWith check untuk nested paths (misal: /admin/users/123)
        // Tapi pastikan tidak konflik dengan root path
        return (
          pathname.startsWith(subpath + "/") ||
          pathname.startsWith(item.href + "/")
        );
      });
    }

    // Check submenu paths
    if (item.submenu) {
      return item.submenu.some(
        (subItem) =>
          pathname === subItem.href || pathname.startsWith(subItem.href + "/")
      );
    }

    // Untuk non-root paths, cek jika pathname dimulai dengan href + "/"
    // Ini untuk menangani nested routes seperti /admin/users/edit/123
    if (item.href !== "/" && pathname.startsWith(item.href + "/")) {
      return true;
    }

    return false;
  };

  // Check if submenu item is active
  const isSubmenuActive = (subItem) => {
    return pathname === subItem.href || pathname.startsWith(subItem.href + "/");
  };

  // Auto expand menu if submenu is active
  useEffect(() => {
    filteredNavigation.forEach((item) => {
      if (item.hasSubmenu && item.submenu) {
        const hasActiveSubmenu = item.submenu.some((subItem) =>
          isSubmenuActive(subItem)
        );
        if (hasActiveSubmenu && !expandedMenus[item.name]) {
          setExpandedMenus((prev) => ({
            ...prev,
            [item.name]: true,
          }));
        }
      }
    });
  }, [pathname, filteredNavigation]);

  // Component untuk menu item
  const MenuItem = ({ item, isMobile = false }) => {
    const isActive = isMenuActive(item);
    const isExpanded = expandedMenus[item.name];

    if (item.hasSubmenu) {
      return (
        <div key={item.name} className="mb-2">
          {/* Main menu item with submenu */}
          <div
            ref={(el) => (menuRefs.current[item.name] = el)}
            className={`group flex items-center ${
              isCollapsed && !isMobile ? "justify-center" : "justify-between"
            } px-3 py-3 text-lg font-medium rounded-lg transition-all duration-200 cursor-pointer ${
              isActive
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            }`}
            onClick={() => {
              if (isCollapsed && !isMobile) {
                // On collapsed state, do nothing (handled by hover)
                return;
              } else {
                // Toggle submenu
                toggleSubmenu(item.name);
              }
            }}
            onMouseEnter={() => handleMouseEnter(item)}
            onMouseLeave={handleMouseLeave}
            title={isCollapsed && !isMobile ? item.name : ""}
          >
            <div className="flex items-center">
              <div
                className={`${isCollapsed && !isMobile ? "" : "mr-3"} ${
                  isActive
                    ? "text-white"
                    : "text-gray-500 group-hover:text-gray-700"
                } transition-colors duration-200`}
              >
                {item.icon}
              </div>
              {(!isCollapsed || isMobile) && (
                <span className="truncate">{item.name}</span>
              )}
            </div>
            {(!isCollapsed || isMobile) && (
              <IoChevronDownOutline
                className={`transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                } ${isActive ? "text-white" : "text-gray-500"}`}
                size={16}
              />
            )}
          </div>

          {/* Submenu items */}
          {(!isCollapsed || isMobile) && isExpanded && (
            <div className="ml-6 mt-4 space-y-2">
              {item.submenu.map((subItem) => (
                <Link
                  key={subItem.name}
                  href={subItem.href}
                  className={`group relative flex items-center px-3 py-2 text-md font-medium rounded-r-lg rounded-l-md transition-all duration-200 ${
                    isSubmenuActive(subItem)
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 bg-zinc-100 hover:bg-blue-600 hover:text-white"
                  }`}
                  onClick={() => {
                    if (isMobile && window.innerWidth < 1024) {
                      toggleSidebar();
                    }
                  }}
                >
                  {/* Strip putih vertikal */}

                  <div className="absolute left-0 top-0 h-full w-2 bg-orange-400 rounded-l-md"></div>

                  <div
                    className={`ml-1 mr-2 ${
                      isSubmenuActive(subItem)
                        ? "text-white"
                        : "text-gray-400 group-hover:text-white"
                    } transition-colors duration-200`}
                  >
                    {subItem.icon}
                  </div>
                  <span className="truncate">{subItem.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Regular menu item without submenu
    return (
      <Link
        key={item.name}
        href={item.href}
        className={`group flex mb-2 items-center ${
          isCollapsed && !isMobile ? "justify-center" : ""
        } px-3 py-3 text-lg font-medium rounded-lg transition-all duration-200 relative ${
          isActive
            ? "bg-blue-600 text-white"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        }`}
        title={isCollapsed && !isMobile ? item.name : ""}
        onClick={() => {
          if (isMobile && window.innerWidth < 1024) {
            toggleSidebar();
          }
        }}
      >
        <div
          className={`${isCollapsed && !isMobile ? "" : "mr-3"} ${
            isActive ? "text-white" : "text-gray-500 group-hover:text-gray-700"
          } transition-colors duration-200`}
        >
          {item.icon}
        </div>
        {(!isCollapsed || isMobile) && (
          <span className="truncate">{item.name}</span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 space-y-6 bg-white shadow-lg transform transition-transform ease-in-out duration-300 lg:hidden ${
          isOpen ? "translate-y-0 rounded-b-xl" : "-translate-y-full"
        }`}
      >
        {/* Header / Logo */}
        <div className="flex items-center justify-center h-16 px-4 pt-8">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={180}
            height={40}
            className="w-auto"
          />
        </div>

        {/* Menu */}
        <nav className="p-4 m-0 space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto">
          {filteredNavigation.map((item) => (
            <MenuItem key={item.name} item={item} isMobile={true} />
          ))}
        </nav>

        {/* Tombol Tutup */}
        <div className="flex justify-center items-center pb-4">
          <button
            type="button"
            className="p-2 flex items-center text-zinc-600 hover:text-blue-100 hover:bg-blue-600 rounded-lg focus:outline-none transition-colors"
            onClick={toggleSidebar}
            aria-label="Close"
            title="Close"
          >
            <IoChevronUpOutline size={24} />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar - FIXED POSITION */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div
          className={`fixed top-0 left-0 h-screen flex flex-col ${
            isCollapsed ? "w-16" : "w-64 space-y-4"
          } bg-white border-r border-gray-200 transition-all duration-300 z-20`}
        >
          {/* Header/Logo Section */}
          <div className="flex items-center justify-center h-16 px-3 flex-shrink-0 bg-white">
            {isCollapsed ? (
              <div className="w-fit h-fit flex items-center justify-center">
                <Image
                  src="/images/logo.png"
                  alt="Logo"
                  width={80}
                  height={80}
                  className="rounded-lg"
                />
              </div>
            ) : (
              <div className="flex items-center pt-6 space-x-2">
                <div className="w-fit h-fit flex items-center justify-center">
                  <Image
                    src="/images/logo.png"
                    alt="Logo"
                    width={200}
                    height={200}
                    className="rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col flex-grow overflow-hidden">
            {/* Menu Label */}
            <div className="px-4 py-3">
              {!isCollapsed ? (
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Menu
                </h3>
              ) : (
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-400">
                    •••
                  </span>
                </div>
              )}
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
              {filteredNavigation.map((item) => (
                <MenuItem key={item.name} item={item} />
              ))}
            </nav>

            {/* Bottom Information Panel */}
            <div className="border-t border-gray-100 flex-shrink-0">
              {/* Toggle Button */}
              <div className="p-3 border-b border-gray-100">
                <button
                  type="button"
                  className={`w-full p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg focus:outline-none transition-colors flex items-center ${
                    isCollapsed ? "justify-center" : "justify-center"
                  }`}
                  onClick={handleToggleCollapse}
                  title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <svg
                    className={`h-4 w-4 transform transition-transform duration-200 ${
                      isCollapsed ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  </svg>
                  {!isCollapsed && (
                    <span className="ml-1 text-sm">Collapse</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popup Submenu for Collapsed Sidebar */}
      {isCollapsed && hoveredMenu && hoveredMenu.hasSubmenu && (
        <div
          className="fixed z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48"
          style={{
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
          }}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        >
          {/* Popup Header */}
          <div className="px-4 py-2 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700">
              {hoveredMenu.name}
            </h4>
          </div>

          {/* Popup Submenu Items */}
          <div className="py-1">
            {hoveredMenu.submenu.map((subItem) => (
              <Link
                key={subItem.name}
                href={subItem.href}
                className={`group flex items-center px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isSubmenuActive(subItem)
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
                onClick={() => setHoveredMenu(null)}
              >
                <div
                  className={`mr-3 ${
                    isSubmenuActive(subItem)
                      ? "text-white"
                      : "text-gray-400 group-hover:text-gray-600"
                  } transition-colors duration-200`}
                >
                  {subItem.icon}
                </div>
                <span className="truncate">{subItem.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
