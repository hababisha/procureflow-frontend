"use client";

import React from "react";
import { Role, hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";

interface RoleGateProps {
  roles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const user = useAuthStore((s) => s.user);

  if (!user || !hasPermission(user.role, roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
