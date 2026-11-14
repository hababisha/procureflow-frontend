"use client";

import React from "react";
import { useAuthStore } from "@/store/authStore";
import { formatRoleName, getRoleBadgeColor } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Building2, CheckCircle } from "lucide-react";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                getRoleBadgeColor(user.role)
              )}
            >
              {formatRoleName(user.role)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user.fullName}!
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>{user.departmentName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200 self-start sm:self-auto">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>ProcureFlow System Online</span>
        </div>
      </div>
    </div>
  );
}
