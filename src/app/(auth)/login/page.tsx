"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { queryClient } from "@/lib/queryClient";
import { Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2, Building } from "lucide-react";

const DEMO_ACCOUNTS = [
  { role: "ADMIN", name: "System Admin", email: "admin@procureflow.com", color: "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100" },
  { role: "EMPLOYEE", name: "Employee (IT)", email: "employee@procureflow.com", color: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100" },
  { role: "DEPARTMENT_MANAGER", name: "Dept Manager", email: "manager@procureflow.com", color: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" },
  { role: "FINANCE_OFFICER", name: "Finance Officer", email: "finance@procureflow.com", color: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  { role: "PROCUREMENT_OFFICER", name: "Procurement", email: "procurement@procureflow.com", color: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" },
  { role: "STORE_KEEPER", name: "Store Keeper", email: "storekeeper@procureflow.com", color: "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100" },
];

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState("admin@procureflow.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      queryClient.clear();
      const response = await axios.post("/api/auth/login", {
        email,
        password,
      });

      const authUser = response.data?.user ?? response.data;
      setUser(authUser);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      let message = "Invalid email or password. Please try again.";
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        message = String(err.response.data.message);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 text-white shadow-lg mb-4">
          <Building className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          ProcureFlow
        </h2>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          Procurement & Inventory Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200/80">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 font-medium">{error}</div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Work Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition"
                  placeholder="name@procureflow.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </button>
            </div>
          </form>

          {/* Quick-fill demo credentials */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Demo Accounts (Click to Fill)
              </span>
              <span className="text-xs text-slate-400 font-mono">Password: password123</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = email === acc.email;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleSelectDemo(acc.email)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition relative ${acc.color} ${
                      isSelected ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <div className="font-semibold truncate">{acc.name}</div>
                    <div className="text-[10px] opacity-75 font-mono truncate">{acc.email}</div>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 absolute top-2 right-2 text-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
