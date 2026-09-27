"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserProfile } from "@/types";
import { getCurrentUserAndProfile, signOutAction } from "@/lib/auth/actions";

interface AuthContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      const res = await getCurrentUserAndProfile();
      setProfile(res.profile);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const logout = async () => {
    setIsLoading(true);
    await signOutAction();
    setProfile(null);
    setIsLoading(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        isLoading,
        isAuthenticated: Boolean(profile),
        logout,
        refresh: loadSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
