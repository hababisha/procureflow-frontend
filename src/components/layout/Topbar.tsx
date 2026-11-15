"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Menu, LogOut, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { queryClient } from "@/lib/queryClient";
import { formatRoleName, getRoleBadgeColor } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await axios.post("/api/auth/logout");
      clear();
      queryClient.clear();
      router.push("/login");
      router.refresh();
    } catch {
      clear();
      queryClient.clear();
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile hamburger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Procurement & Inventory Management System
          </span>
        </div>
      </div>

      {/* Right: User profile badge and logout */}
      {user && (
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {user.fullName}
              </div>
              <div className="text-[11px] text-slate-500">{user.email}</div>
            </div>
          </div>

          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-semibold border hidden sm:inline-block",
              getRoleBadgeColor(user.role)
            )}
          >
            {formatRoleName(user.role)}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-700 rounded-lg border border-slate-200 transition focus:outline-none disabled:opacity-50"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      )}
    </header>
  );
}
