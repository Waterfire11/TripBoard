"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/store/useSession";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Loader } from "@/components/common/Loader";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useSession();
  const router = useRouter();
  const [showRedirectMessage, setShowRedirectMessage] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Reduce initial loading flash
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoad(false);
    }, 300); // Reduced from 500ms to 300ms for faster response

    return () => clearTimeout(timer);
  }, []);

  // Handle redirect after initial load
  useEffect(() => {
    if (!initialLoad && !isLoading && !isAuthenticated) {
      setShowRedirectMessage(true);
      const redirectTimer = setTimeout(() => {
        router.push('/login');
      }, 1500); // Reduced from 2000ms to 1500ms

      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, isLoading, router, initialLoad]);

  // Show loader during initial load or auth check
  if (initialLoad || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4">
            {/* Branded Logo */}
            <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-lg">TB</span>
            </div>
            {/* Loader */}
            <Loader size="lg" text="Loading your workspace..." />
          </div>
        </div>
      </div>
    );
  }

  // Show friendly access denied message before redirect
  if (!isAuthenticated && showRedirectMessage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          {/* Warning Icon */}
          <div className="h-16 w-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You need to be logged in to access this page. Redirecting to login...
          </p>
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Go to Login Now
          </button>
        </div>
      </div>
    );
  }

  // Only render AppShell when we have both authenticated state and user data
  if (isAuthenticated && user) {
    return <AppShell>{children}</AppShell>;
  }

  // Fallback loader for edge cases
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-lg">TB</span>
        </div>
        <Loader size="lg" text="Authenticating..." />
      </div>
    </div>
  );
}