"use client";
import React, { useState, useEffect, ReactNode } from "react";
import Header from "../UI/Header";
import Sidebar from "../UI/Sidebar";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    mounted && (
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />

        {/* Overlay untuk mobile saat sidebar terbuka */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20"
            style={{ backgroundColor: "rgba(75, 85, 99, 0.4)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div
          className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${
            // Margin left untuk desktop sidebar
            isCollapsed
              ? "lg:ml-16" // w-16 = 4rem = 64px
              : "lg:ml-64" // w-64 = 16rem = 256px
          }`}
        >
          {/* Header - Fixed di bagian atas */}
          <Header
            toggleSidebar={toggleSidebar}
            toggleCollapse={toggleCollapse}
            isCollapsed={isCollapsed}
          />

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-y-auto bg-zinc-50">
            <div className="w-full mx-auto">{children}</div>
          </main>
        </div>
      </div>
    )
  );
};

export default Layout;
