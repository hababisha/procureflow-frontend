"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Tag,
  ShoppingCart,
  Truck,
  PackageCheck,
  Boxes,
  ArrowLeftRight,
  BarChart3,
  Users,
  Building2,
  FolderTree,
  Package,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { NAV_SECTIONS, hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Tag,
  ShoppingCart,
  Truck,
  PackageCheck,
  Boxes,
  ArrowLeftRight,
  BarChart3,
  Users,
  Building2,
  FolderTree,
  Package,
};

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white tracking-wide text-base">
              ProcureFlow
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Enterprise System
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_SECTIONS.map((section) => {
            // Filter items permitted for user
            const visibleItems = section.items.filter((item) =>
              hasPermission(user.role, item.roles)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = ICON_MAP[item.icon] || FileText;
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition group",
                          isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 flex-shrink-0 transition",
                            isActive
                              ? "text-white"
                              : "text-slate-400 group-hover:text-slate-200"
                          )}
                        />
                        <span className="flex-1 truncate">{item.title}</span>
                        {isActive && (
                          <ChevronRight className="w-3.5 h-3.5 text-blue-200" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 text-xs text-slate-400">
          <div className="font-medium text-slate-300 truncate">
            {user.departmentName}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Dept ID: #{user.departmentId}
          </div>
        </div>
      </aside>
    </>
  );
}
