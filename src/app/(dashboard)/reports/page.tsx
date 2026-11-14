"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import {
  ExpenditureReportResponse,
  RequisitionReportResponse,
  InventoryValuationReportResponse,
  SupplierReportResponse,
  Department,
  PageResponse,
} from "@/types";
import { RoleGate } from "@/components/layout/RoleGate";
import { useFiltersStore } from "@/store/filtersStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  FileText,
  Boxes,
  Truck,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

type ReportTab = "expenditure" | "requisitions" | "inventory" | "suppliers";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("expenditure");

  // Zustand persistent filters store
  const {
    startDate,
    endDate,
    departmentId,
    setStartDate,
    setEndDate,
    setDepartmentId,
    resetFilters,
  } = useFiltersStore();

  // Fetch departments for filter
  const { data: deptData } = useQuery<PageResponse<Department>>({
    queryKey: ["departments-all"],
    queryFn: async () => {
      const res = await api.get("/departments", { params: { size: 100 } });
      return res.data;
    },
  });

  // Query filter params
  const filterParams = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    departmentId: departmentId ? Number(departmentId) : undefined,
  };

  // 1. Expenditure Report
  const { data: expReport, isLoading: expLoading } =
    useQuery<ExpenditureReportResponse>({
      queryKey: ["report-expenditure", filterParams],
      queryFn: async () => {
        const res = await api.get("/reports/expenditure", {
          params: filterParams,
        });
        return res.data;
      },
      enabled: activeTab === "expenditure",
    });

  // 2. Requisitions Report
  const { data: reqReport, isLoading: reqLoading } =
    useQuery<RequisitionReportResponse>({
      queryKey: ["report-requisitions", filterParams],
      queryFn: async () => {
        const res = await api.get("/reports/requisitions", {
          params: filterParams,
        });
        return res.data;
      },
      enabled: activeTab === "requisitions",
    });

  // 3. Inventory Valuation Report
  const { data: invReport, isLoading: invLoading } =
    useQuery<InventoryValuationReportResponse>({
      queryKey: ["report-inventory-valuation", filterParams],
      queryFn: async () => {
        const res = await api.get("/reports/inventory-valuation", {
          params: filterParams,
        });
        return res.data;
      },
      enabled: activeTab === "inventory",
    });

  // 4. Supplier Report
  const { data: supReport, isLoading: supLoading } =
    useQuery<SupplierReportResponse>({
      queryKey: ["report-suppliers", filterParams],
      queryFn: async () => {
        const res = await api.get("/reports/suppliers", {
          params: filterParams,
        });
        return res.data;
      },
      enabled: activeTab === "suppliers",
    });

  return (
    <RoleGate
      roles={[
        "ADMIN",
        "FINANCE_OFFICER",
        "PROCUREMENT_OFFICER",
        "DEPARTMENT_MANAGER",
      ]}
      fallback={
        <div className="p-8 text-center text-slate-500">
          You do not have permission to view procurement and financial reports.
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Procurement & Financial Reports
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Analyze organizational expenditure, requisition cycle health, warehouse valuations, and supplier metrics.
            </p>
          </div>
        </div>

        {/* Global Filter Bar (from Zustand filtersStore) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Period:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Department:
            </span>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {deptData?.content.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-xs text-slate-500 gap-1 ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </Button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("expenditure")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition ${
              activeTab === "expenditure"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Expenditure Analysis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("requisitions")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition ${
              activeTab === "requisitions"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Requisition Volume</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition ${
              activeTab === "inventory"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Inventory Valuation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("suppliers")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition ${
              activeTab === "suppliers"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Supplier Performance</span>
          </button>
        </div>

        {/* TAB 1: EXPENDITURE */}
        {activeTab === "expenditure" && (
          <div className="space-y-6">
            {expLoading ? (
              <Spinner size="lg" label="Calculating expenditure analytics..." />
            ) : !expReport ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                No expenditure records found for this period.
              </p>
            ) : (
              <>
                <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Total Period Spend
                    </span>
                    <div className="text-3xl font-black text-slate-900 mt-1">
                      {formatCurrency(expReport.totalSpend)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Department Spend Table */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Expenditure by Department
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          <TableHead>Orders</TableHead>
                          <TableHead className="text-right">Spend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expReport.byDepartment?.map((dept) => (
                          <TableRow key={dept.departmentId}>
                            <TableCell className="font-semibold text-slate-900 text-xs">
                              {dept.departmentName}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {dept.orderCount} POs
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900 text-xs">
                              {formatCurrency(dept.spend)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Supplier Spend Table */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Expenditure by Supplier
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Orders</TableHead>
                          <TableHead className="text-right">Spend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expReport.bySupplier?.map((sup) => (
                          <TableRow key={sup.supplierId}>
                            <TableCell className="font-semibold text-slate-900 text-xs">
                              {sup.supplierName}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {sup.orderCount} POs
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900 text-xs">
                              {formatCurrency(sup.spend)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: REQUISITIONS */}
        {activeTab === "requisitions" && (
          <div className="space-y-6">
            {reqLoading ? (
              <Spinner size="lg" label="Compiling requisition reports..." />
            ) : !reqReport ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                No requisitions recorded.
              </p>
            ) : (
              <>
                <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Total Requisitions
                    </span>
                    <div className="text-3xl font-black text-slate-900 mt-1">
                      {reqReport.totalCount}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Status Breakdown */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Volume by Status
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(reqReport.byStatus || {}).map(
                        ([st, count]) => (
                          <div
                            key={st}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs"
                          >
                            <Badge status={st} />
                            <span className="font-bold text-slate-900 text-sm">
                              {count}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Priority Breakdown */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Volume by Priority
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(reqReport.byPriority || {}).map(
                        ([pr, count]) => (
                          <div
                            key={pr}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs"
                          >
                            <Badge status={pr}>{pr} Priority</Badge>
                            <span className="font-bold text-slate-900 text-sm">
                              {count}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: INVENTORY VALUATION */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            {invLoading ? (
              <Spinner size="lg" label="Computing inventory valuation..." />
            ) : !invReport ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                No inventory balances found.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Total Valuation
                    </span>
                    <div className="text-2xl font-black text-blue-600 mt-1">
                      {formatCurrency(invReport.totalValuation)}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Unique Items
                    </span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {invReport.totalItems}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Total Units on Hand
                    </span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {invReport.totalQuantity}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Stock Valuation by Item
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valuation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invReport.items?.map((item) => (
                        <TableRow key={item.itemId}>
                          <TableCell className="font-mono text-xs font-bold text-slate-700">
                            {item.sku}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900 text-xs">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {item.categoryName || "—"}
                          </TableCell>
                          <TableCell className="font-bold text-slate-800 text-xs">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell>
                            {item.lowStock ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Low Stock
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-700">
                                Normal
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 text-xs">
                            {formatCurrency(item.totalValue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: SUPPLIERS */}
        {activeTab === "suppliers" && (
          <div className="space-y-6">
            {supLoading ? (
              <Spinner size="lg" label="Compiling supplier statistics..." />
            ) : !supReport ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                No supplier records available.
              </p>
            ) : (
              <>
                <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Total Active Vendors
                    </span>
                    <div className="text-3xl font-black text-slate-900 mt-1">
                      {supReport.totalSuppliers}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Vendor Spend & Order Fulfillment
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Orders Issued</TableHead>
                        <TableHead className="text-right">Total Spend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supReport.suppliers?.map((sup) => (
                        <TableRow key={sup.supplierId}>
                          <TableCell className="font-semibold text-slate-900 text-xs">
                            {sup.supplierName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                sup.status === "ACTIVE" ? "success" : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {sup.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-700">
                            {sup.ordersCount} POs
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 text-xs">
                            {formatCurrency(sup.totalSpend)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
