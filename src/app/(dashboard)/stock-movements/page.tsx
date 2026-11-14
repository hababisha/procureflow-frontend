"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { StockMovement, PageResponse } from "@/types";
import { RoleGate } from "@/components/layout/RoleGate";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateTime } from "@/lib/utils";
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";

const MOVEMENT_TYPES = [
  { label: "All Movement Types", value: "" },
  { label: "Goods Receipt (+)", value: "RECEIPT" },
  { label: "Department Issue (-)", value: "ISSUE" },
  { label: "Stock Adjustment (±)", value: "ADJUSTMENT" },
];

export default function StockMovementsPage() {
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");

  const { data, isLoading } = useQuery<PageResponse<StockMovement>>({
    queryKey: ["stock-movements", { page, movementType: typeFilter }],
    queryFn: async () => {
      const res = await api.get("/stock-movements", {
        params: {
          page,
          size: 15,
          movementType: typeFilter || undefined,
        },
      });
      return res.data;
    },
  });

  const getMovementBadge = (type: string, qty: number) => {
    switch (type) {
      case "RECEIPT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
            RECEIPT (+{qty})
          </span>
        );
      case "ISSUE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowUpRight className="w-3 h-3 text-blue-600" />
            ISSUE (-{qty})
          </span>
        );
      case "ADJUSTMENT":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <SlidersHorizontal className="w-3 h-3 text-amber-600" />
            ADJUSTMENT ({qty > 0 ? `+${qty}` : qty})
          </span>
        );
    }
  };

  return (
    <RoleGate
      roles={["ADMIN", "STORE_KEEPER"]}
      fallback={
        <div className="p-8 text-center text-slate-500">
          You do not have permission to inspect stock movement logs.
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Stock Movements Audit Log
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Append-only immutable audit trail of goods receipts, department issues, and cycle count adjustments.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
              aria-label="Filter by movement type"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <Spinner size="lg" label="Loading stock movement audit history..." />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No movements recorded"
            description="Stock movements will appear automatically as goods are received or issued."
          />
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Movement Type</TableHead>
                  <TableHead>Reference / Recipient</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Audit Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(m.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900 text-xs">
                        {m.itemName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {m.itemSku}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getMovementBadge(m.movementType, m.quantity)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {m.departmentName ? (
                        <div>
                          <span className="font-semibold text-slate-800">
                            Dept: {m.departmentName}
                          </span>
                          {m.recipientName && (
                            <span className="text-slate-500 block">
                              Rec: {m.recipientName}
                            </span>
                          )}
                        </div>
                      ) : m.referenceType ? (
                        <span className="font-mono text-slate-600 font-medium">
                          {m.referenceType} #{m.referenceId}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700">
                      {m.performedByName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                      {m.note || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              size={data.size}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </RoleGate>
  );
}
