"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/axios";
import {
  InventoryItem,
  Department,
  StockIssueRequest,
  StockAdjustmentRequest,
  PageResponse,
} from "@/types";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
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
import { formatCurrency } from "@/lib/utils";
import {
  Boxes,
  Search,
  ArrowUpRight,
  SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";

export default function InventoryPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Issue stock form state
  const [issueForm, setIssueForm] = useState<StockIssueRequest>({
    itemId: 0,
    quantity: 1,
    departmentId: 0,
    recipientName: "",
    reason: "",
  });

  // Adjust stock form state
  const [adjustForm, setAdjustForm] = useState<StockAdjustmentRequest>({
    itemId: 0,
    adjustedQuantity: 0,
    reason: "",
  });

  // Fetch departments for issuing
  const { data: deptData } = useQuery<PageResponse<Department>>({
    queryKey: ["departments-all"],
    queryFn: async () => {
      const res = await api.get("/departments", { params: { size: 100 } });
      return res.data;
    },
  });

  // Fetch inventory balances
  const { data, isLoading } = useQuery<PageResponse<InventoryItem>>({
    queryKey: ["inventory", { page, search, lowStock: lowStockFilter }],
    queryFn: async () => {
      const res = await api.get("/inventory", {
        params: {
          page,
          size: 10,
          search: search || undefined,
          lowStock: lowStockFilter ? true : undefined,
        },
      });
      return res.data;
    },
  });

  const issueMutation = useMutation({
    mutationFn: async (payload: StockIssueRequest) => {
      return api.post("/inventory/issues", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      setIssueModalOpen(false);
      setAlert({
        type: "success",
        message: "Stock issued to department successfully. Inventory balance updated.",
      });
    },
    onError: (err: unknown) => {
      setFormError(getErrorMessage(err));
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (payload: StockAdjustmentRequest) => {
      return api.post("/inventory/adjustments", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      setAdjustModalOpen(false);
      setAlert({
        type: "success",
        message: "Inventory count adjusted successfully and audit movement recorded.",
      });
    },
    onError: (err: unknown) => {
      setFormError(getErrorMessage(err));
    },
  });

  const openIssueModal = (item?: InventoryItem) => {
    const targetItem = item || data?.content[0];
    const firstDept = deptData?.content[0]?.id || 0;
    setSelectedItem(targetItem || null);
    setIssueForm({
      itemId: targetItem?.itemId || 0,
      quantity: 1,
      departmentId: firstDept,
      recipientName: "",
      reason: "",
    });
    setFormError(null);
    setIssueModalOpen(true);
  };

  const openAdjustModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustForm({
      itemId: item.itemId,
      adjustedQuantity: item.quantity,
      reason: "",
    });
    setFormError(null);
    setAdjustModalOpen(true);
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!issueForm.departmentId) {
      setFormError("Please select a receiving department.");
      return;
    }
    if (issueForm.quantity <= 0) {
      setFormError("Quantity must be at least 1.");
      return;
    }
    if (selectedItem && issueForm.quantity > selectedItem.quantity) {
      setFormError(
        `Quantity requested (${issueForm.quantity}) exceeds on-hand balance (${selectedItem.quantity}).`
      );
      return;
    }
    if (!issueForm.recipientName.trim()) {
      setFormError("Recipient full name is required.");
      return;
    }
    if (!issueForm.reason.trim()) {
      setFormError("Reason for issuing is required.");
      return;
    }
    issueMutation.mutate(issueForm);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (adjustForm.adjustedQuantity < 0) {
      setFormError("Adjusted quantity cannot be negative.");
      return;
    }
    if (!adjustForm.reason.trim()) {
      setFormError("Audit reason for stock adjustment is required.");
      return;
    }
    adjustMutation.mutate(adjustForm);
  };

  const canManageStock =
    user?.role === "STORE_KEEPER" || user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Warehouse Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time item balances, reorder threshold alerts, department issues, and stock audits.
          </p>
        </div>

        {canManageStock && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => openIssueModal()}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Issue to Department</span>
            </Button>
          </div>
        )}
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search inventory by SKU or item name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setLowStockFilter(!lowStockFilter);
            setPage(0);
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            lowStockFilter
              ? "bg-amber-500 text-white border-amber-600 shadow-xs"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Low-Stock Items Only</span>
        </button>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <Spinner size="lg" label="Loading warehouse inventory balances..." />
      ) : !data || data.content.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No inventory records found"
          description={
            lowStockFilter
              ? "Great news! No inventory items are currently at or below their reorder threshold."
              : "Warehouse stock is updated automatically when goods receipts are recorded."
          }
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>On Hand</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Valuation</TableHead>
                {canManageStock && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.content.map((inv) => {
                const isLow = inv.quantity <= inv.reorderLevel;
                const valuation = (inv.quantity || 0) * (inv.unitPrice || 0);

                return (
                  <TableRow
                    key={inv.id}
                    className={isLow ? "bg-amber-50/40" : undefined}
                  >
                    <TableCell className="font-mono text-xs font-bold text-slate-700">
                      {inv.itemSku}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      {inv.itemName}
                    </TableCell>
                    <TableCell className="text-xs uppercase text-slate-500">
                      {inv.unit}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                          isLow
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "text-slate-900 font-bold"
                        }`}
                      >
                        {inv.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {inv.reorderLevel}
                    </TableCell>
                    <TableCell>
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Low Stock
                        </span>
                      ) : (
                        <Badge variant="success" className="text-[11px]">
                          Adequate
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-700 text-xs">
                      {formatCurrency(inv.unitPrice)}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">
                      {formatCurrency(valuation)}
                    </TableCell>
                    {canManageStock && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openIssueModal(inv)}
                            title="Issue Stock to Department"
                            disabled={inv.quantity === 0}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAdjustModal(inv)}
                            title="Adjust Stock Count"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
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

      {/* Issue Stock Modal */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Issue Stock to Department"
        description="Allocate warehouse items to an internal department with tracking of recipient and purpose."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIssueModalOpen(false)}
              disabled={issueMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleIssueSubmit}
              isLoading={issueMutation.isPending}
            >
              Confirm Issue
            </Button>
          </>
        }
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          {selectedItem && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-900">
                  {selectedItem.itemName} ({selectedItem.itemSku})
                </div>
                <div className="text-slate-500">Unit: {selectedItem.unit}</div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block uppercase font-medium">
                  Available
                </span>
                <span className="font-black text-blue-600 text-sm">
                  {selectedItem.quantity}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Receiving Department"
              required
              value={issueForm.departmentId}
              onChange={(e) =>
                setIssueForm({
                  ...issueForm,
                  departmentId: Number(e.target.value),
                })
              }
            >
              <option value={0}>Select department...</option>
              {deptData?.content.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </Select>

            <Input
              label="Quantity to Issue"
              type="number"
              min="1"
              max={selectedItem?.quantity || 1}
              required
              value={issueForm.quantity || ""}
              onChange={(e) =>
                setIssueForm({
                  ...issueForm,
                  quantity: parseInt(e.target.value, 10) || 0,
                })
              }
            />
          </div>

          <Input
            label="Recipient Full Name"
            required
            placeholder="e.g. Sarah Connor (IT Lead)"
            value={issueForm.recipientName}
            onChange={(e) =>
              setIssueForm({ ...issueForm, recipientName: e.target.value })
            }
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Purpose / Issue Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Deployment for new software engineering hire."
              value={issueForm.reason}
              onChange={(e) =>
                setIssueForm({ ...issueForm, reason: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title="Adjust Inventory Balance"
        description="Modify inventory count due to physical audit count, shrinkage, or damage."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setAdjustModalOpen(false)}
              disabled={adjustMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleAdjustSubmit}
              isLoading={adjustMutation.isPending}
            >
              Confirm Adjustment
            </Button>
          </>
        }
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          {selectedItem && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-900">
                  {selectedItem.itemName} ({selectedItem.itemSku})
                </div>
                <div className="text-slate-500">Unit: {selectedItem.unit}</div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block uppercase font-medium">
                  Current Count
                </span>
                <span className="font-black text-slate-800 text-sm">
                  {selectedItem.quantity}
                </span>
              </div>
            </div>
          )}

          <Input
            label="New Verified Quantity Count"
            type="number"
            min="0"
            required
            value={adjustForm.adjustedQuantity ?? ""}
            onChange={(e) =>
              setAdjustForm({
                ...adjustForm,
                adjustedQuantity: parseInt(e.target.value, 10) || 0,
              })
            }
            helperText="The new total balance that will be set in the warehouse database."
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Audit Explanation / Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Discrepancy discovered during quarterly cycle count; 2 units damaged during water leak."
              value={adjustForm.reason}
              onChange={(e) =>
                setAdjustForm({ ...adjustForm, reason: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
