"use client";

import React, { useState, useCallback } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { TopNavigation } from "@/components/layout/top-navigation";
import { DashboardSubtleBanner } from "@/components/disclaimers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleOpenMobileNav = useCallback(() => {
    setIsMobileNavOpen(true);
  }, []);

  const handleCloseMobileNav = useCallback(() => {
    setIsMobileNavOpen(false);
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
      {/* Skip to Main Content Link for Keyboard Navigation (WCAG 2.1 SC 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#0F3D66] focus:text-white focus:font-bold focus:text-xs focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB]"
      >
        Skip to main content
      </a>

      {/* Desktop Collapsible Sidebar */}
      <AppSidebar />

      {/* Mobile Drawer */}
      <MobileSidebar
        isOpen={isMobileNavOpen}
        onClose={handleCloseMobileNav}
      />

      {/* Main Command Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavigation
          onMenuClick={handleOpenMobileNav}
          isMobileNavOpen={isMobileNavOpen}
        />
        <DashboardSubtleBanner />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
