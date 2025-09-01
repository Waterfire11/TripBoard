"use client";

import { useEffect } from "react";
import { useUI } from "@/store/useUI";
import { useSession } from "@/store/useSession";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { sidebarOpen, isMobile, setIsMobile, setSidebarOpen } = useUI();
  const { user } = useSession();

  // Handle responsive behavior using window.matchMedia
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)"); // Tailwind's md breakpoint

    const handleResize = (e: MediaQueryListEvent | MediaQueryList) => {
      const mobile = e.matches;
      setIsMobile(mobile);

      // Auto-close sidebar on mobile, keep open on desktop
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Initialize
    handleResize(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener("change", handleResize);
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, [setIsMobile, setSidebarOpen]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("sidebar");
      const menuButton = document.getElementById("menu-button");

      if (
        sidebar &&
        menuButton &&
        !sidebar.contains(event.target as Node) &&
        !menuButton.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, sidebarOpen, setSidebarOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <Navbar user={user} />

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside
          id="sidebar"
          className={cn(
            "fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] border-r bg-card transition-all duration-300 ease-in-out",
            // Mobile: slide in/out
            isMobile
              ? sidebarOpen
                ? "translate-x-0 w-64"
                : "-translate-x-full w-64"
              : // Desktop: collapse width
                sidebarOpen
                ? "w-64"
                : "w-16"
          )}
          role="navigation"
          aria-label="Main Sidebar"
        >
          <Sidebar isCollapsed={!sidebarOpen && !isMobile} />
        </aside>

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 overflow-auto transition-all duration-300 ease-in-out",
            // On desktop: shift content when sidebar is collapsed
            !isMobile && !sidebarOpen ? "ml-16" : "ml-0"
          )}
        >
          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}