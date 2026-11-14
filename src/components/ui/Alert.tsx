import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertProps {
  type?: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  className?: string;
  onClose?: () => void;
}

export function Alert({
  type = "info",
  title,
  message,
  className,
  onClose,
}: AlertProps) {
  const styles = {
    info: {
      bg: "bg-blue-50 border-blue-200 text-blue-900",
      icon: Info,
      iconColor: "text-blue-600",
    },
    success: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-900",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
    },
    warning: {
      bg: "bg-amber-50 border-amber-200 text-amber-900",
      icon: AlertTriangle,
      iconColor: "text-amber-600",
    },
    error: {
      bg: "bg-red-50 border-red-200 text-red-900",
      icon: AlertCircle,
      iconColor: "text-red-600",
    },
  };

  const current = styles[type];
  const Icon = current.icon;

  return (
    <div
      className={cn(
        "p-4 rounded-xl border flex items-start gap-3 transition shadow-xs",
        current.bg,
        className
      )}
      role="alert"
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", current.iconColor)} />
      <div className="flex-1 text-sm">
        {title && <div className="font-semibold">{title}</div>}
        <div className={cn(title ? "mt-0.5 text-xs opacity-90" : "text-sm")}>
          {message}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
