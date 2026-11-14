import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "outline";
  status?: string;
}

export function getStatusBadgeVariant(status: string): string {
  switch (status?.toUpperCase()) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "SUBMITTED":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "MANAGER_APPROVAL":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "FINANCE_APPROVAL":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "PROCUREMENT":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "ORDERED":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "RECEIVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "COMPLETED":
      return "bg-green-100 text-green-800 border-green-300 font-bold";
    case "REJECTED":
    case "CANCELLED":
      return "bg-red-50 text-red-700 border-red-200";
    case "URGENT":
      return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
    case "HIGH":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "MEDIUM":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "LOW":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function formatStatusLabel(status: string): string {
  switch (status?.toUpperCase()) {
    case "MANAGER_APPROVAL":
      return "Manager Review";
    case "FINANCE_APPROVAL":
      return "Finance Review";
    case "PROCUREMENT":
      return "Procurement";
    case "ORDERED":
      return "PO Ordered";
    case "RECEIVED":
      return "Goods Received";
    case "COMPLETED":
      return "Completed";
    case "REJECTED":
      return "Rejected";
    case "SUBMITTED":
      return "Submitted";
    case "DRAFT":
      return "Draft";
    default:
      return status ? status.replace(/_/g, " ") : "";
  }
}

export function Badge({
  className,
  variant = "default",
  status,
  children,
  ...props
}: BadgeProps) {
  const customStatusClass = status ? getStatusBadgeVariant(status) : null;

  const baseVariants = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    secondary: "bg-slate-100 text-slate-600 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    outline: "text-slate-700 border-slate-300 bg-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide select-none",
        customStatusClass || baseVariants[variant],
        className
      )}
      {...props}
    >
      {children || (status ? formatStatusLabel(status) : null)}
    </span>
  );
}
