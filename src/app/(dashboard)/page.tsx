"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import {
  DashboardSummaryResponse,
  Requisition,
  PageResponse,
  RequisitionReportResponse,
} from "@/types";
import { useAuthStore } from "@/store/authStore";
import { formatRoleName, getRoleBadgeColor } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  FileText,
  CheckSquare,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Building2,
  DollarSign,
  Plus,
  ArrowRight,
  PackageCheck,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  SUBMITTED: "#38bdf8",
  MANAGER_APPROVAL: "#3b82f6",
  FINANCE_APPROVAL: "#6366f1",
  PROCUREMENT: "#f59e0b",
  ORDERED: "#06b6d4",
  RECEIVED: "#10b981",
  COMPLETED: "#22c55e",
  REJECTED: "#ef4444",
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  // Fetch high-level summary KPIs
  const { data: summary, isLoading: summaryLoading } =
    useQuery<DashboardSummaryResponse>({
      queryKey: ["dashboard-summary"],
      queryFn: async () => {
        const res = await api.get("/dashboard/summary");
        return res.data;
      },
    });

  // Fetch recent requisitions
  const { data: recentReqs, isLoading: reqsLoading } = useQuery<
    PageResponse<Requisition>
  >({
    queryKey: ["recent-requisitions"],
    queryFn: async () => {
      const res = await api.get("/requisitions", {
        params: { page: 0, size: 5, sort: "createdAt,desc" },
      });
      return res.data;
    },
  });

  // Fetch requisition status analytics for charts
  const { data: reqReport } = useQuery<RequisitionReportResponse>({
    queryKey: ["reports-requisitions-summary"],
    queryFn: async () => {
      const res = await api.get("/reports/requisitions");
      return res.data;
    },
  });

  if (!user) return null;

  // Prepare chart data for status distribution
  const statusChartData = reqReport?.byStatus
    ? Object.entries(reqReport.byStatus).map(([status, count]) => ({
        status: status.replace(/_/g, " "),
        rawStatus: status,
        count: Number(count),
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeColor(
                user.role
              )}`}
            >
              {formatRoleName(user.role)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user.fullName}!
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{user.departmentName} Department</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {(user.role === "EMPLOYEE" ||
            user.role === "DEPARTMENT_MANAGER" ||
            user.role === "ADMIN") && (
            <Link href="/requisitions/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                <span>New Requisition</span>
              </Button>
            </Link>
          )}

          {(user.role === "STORE_KEEPER" || user.role === "ADMIN") && (
            <Link href="/receiving">
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <PackageCheck className="w-4 h-4" />
                <span>Receive Goods</span>
              </Button>
            </Link>
          )}

          {(user.role === "DEPARTMENT_MANAGER" ||
            user.role === "FINANCE_OFFICER") && (
            <Link href="/approvals">
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <CheckSquare className="w-4 h-4" />
                <span>Approvals Queue</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      {summaryLoading ? (
        <Spinner size="lg" label="Loading dashboard indicators..." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Requisitions
              </span>
              <FileText className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {summary?.totalRequisitions ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Total created</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Pending
              </span>
              <CheckSquare className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {summary?.pendingApprovals ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Awaiting review
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Active POs
              </span>
              <ShoppingCart className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {summary?.outstandingOrders ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Of {summary?.totalPurchaseOrders ?? 0} orders
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Total Spend
              </span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-700 truncate">
              {formatCurrency(summary?.totalSpend ?? 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Committed expenditure
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Inventory
              </span>
              <Boxes className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {summary?.totalInventoryItems ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Tracked catalog SKUs
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Low Stock
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div
              className={`text-2xl font-bold ${
                (summary?.lowStockItemsCount ?? 0) > 0
                  ? "text-rose-600"
                  : "text-slate-900"
              }`}
            >
              {summary?.lowStockItemsCount ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Below reorder point
            </div>
          </div>
        </div>
      )}

      {/* Chart & Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Requisitions Pipeline Distribution
              </h2>
              <p className="text-xs text-slate-500">
                Number of purchase requests across workflow lifecycle stages.
              </p>
            </div>
          </div>

          {statusChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No workflow activity recorded yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData}>
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: "8px",
                      fontSize: "12px",
                      border: "none",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.rawStatus}`}
                        fill={STATUS_COLORS[entry.rawStatus] || "#3b82f6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Quick Shortcuts Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">
              ProcureFlow Hub
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Quick access to core modules and workflows.
            </p>

            <div className="space-y-2">
              <Link
                href="/requisitions"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-800">
                    Purchase Requisitions
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
              </Link>

              <Link
                href="/purchase-orders"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs font-semibold text-slate-800">
                    Purchase Orders
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600 transition" />
              </Link>

              <Link
                href="/inventory"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <Boxes className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-slate-800">
                    Warehouse Inventory
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
              </Link>

              <Link
                href="/reports"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-800">
                    Procurement & Budget Reports
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Enterprise Procurement & Inventory Management
          </div>
        </div>
      </div>

      {/* Recent Requisitions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent Purchase Requisitions
            </h2>
            <p className="text-xs text-slate-500">
              Latest procurement submissions and their current workflow states.
            </p>
          </div>
          <Link href="/requisitions">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {reqsLoading ? (
          <Spinner size="md" label="Loading recent requests..." />
        ) : !recentReqs || recentReqs.content.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 italic">
            No requisitions submitted yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requisition #</TableHead>
                <TableHead>Requestor</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Estimated Total</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentReqs.content.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs font-bold text-blue-600">
                    <Link
                      href={`/requisitions/${req.id}`}
                      className="hover:underline"
                    >
                      {req.requisitionNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-800">
                    {req.employeeName}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {req.departmentName}
                  </TableCell>
                  <TableCell>
                    <Badge status={req.priority} className="text-[10px]">
                      {req.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge status={req.status} className="text-[10px]" />
                  </TableCell>
                  <TableCell className="font-bold text-slate-900 text-xs">
                    {formatCurrency(req.estimatedTotal)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-500">
                    {formatDate(req.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
