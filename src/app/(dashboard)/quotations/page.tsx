"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/axios";
import {
  Quotation,
  QuotationRequest,
  Requisition,
  Supplier,
  PageResponse,
  PurchaseOrderRequest,
} from "@/types";
import { RoleGate } from "@/components/layout/RoleGate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Tag,
  Plus,
  CheckCircle,
  Trophy,
  ShoppingCart,
  Building,
} from "lucide-react";

export default function QuotationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReqId = searchParams.get("requisitionId");
  const qc = useQueryClient();

  const [selectedReqId, setSelectedReqId] = useState<number | null>(
    initialReqId ? Number(initialReqId) : null
  );

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [expectedDate, setExpectedDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [quotationForm, setQuotationForm] = useState<QuotationRequest>({
    supplierId: 0,
    totalAmount: 0,
    validUntil: "",
    notes: "",
  });

  // Load requisitions in PROCUREMENT stage
  const { data: requisitionsData } = useQuery<PageResponse<Requisition>>({
    queryKey: ["requisitions-procurement"],
    queryFn: async () => {
      const res = await api.get("/requisitions", {
        params: { status: "PROCUREMENT", size: 50 },
      });
      return res.data;
    },
  });

  // If initialReqId not set and requisitions exist, default to the first one
  useEffect(() => {
    if (!selectedReqId && requisitionsData?.content && requisitionsData.content.length > 0) {
      setSelectedReqId(requisitionsData.content[0].id);
    }
  }, [requisitionsData, selectedReqId]);

  // Load suppliers
  const { data: suppliersData } = useQuery<PageResponse<Supplier>>({
    queryKey: ["suppliers-all"],
    queryFn: async () => {
      const res = await api.get("/suppliers", { params: { size: 100 } });
      return res.data;
    },
  });

  // Load quotations for selected requisition
  const { data: quotations, isLoading: quotesLoading } = useQuery<Quotation[]>({
    queryKey: ["quotations", selectedReqId],
    queryFn: async () => {
      if (!selectedReqId) return [];
      const res = await api.get(`/requisitions/${selectedReqId}/quotations`);
      return res.data;
    },
    enabled: !!selectedReqId,
  });

  // Current selected requisition object
  const currentReq = requisitionsData?.content.find((r) => r.id === selectedReqId);
  const winningQuote = quotations?.find((q) => q.selected);

  const createQuoteMutation = useMutation({
    mutationFn: async (payload: QuotationRequest) => {
      if (!selectedReqId) return;
      return api.post(`/requisitions/${selectedReqId}/quotations`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotations", selectedReqId] });
      setAddModalOpen(false);
      setAlert({
        type: "success",
        message: "Supplier quotation recorded successfully.",
      });
    },
    onError: (err: unknown) => {
      setFormError(getErrorMessage(err));
    },
  });

  const selectWinningMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      return api.post(`/quotations/${quoteId}/select`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotations", selectedReqId] });
      setAlert({
        type: "success",
        message: "Winning quotation selected! You can now generate a Purchase Order.",
      });
    },
    onError: (err: unknown) => {
      setAlert({ type: "error", message: getErrorMessage(err) });
    },
  });

  const generatePoMutation = useMutation({
    mutationFn: async (payload: PurchaseOrderRequest) => {
      return api.post("/purchase-orders", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["requisitions-procurement"] });
      setPoModalOpen(false);
      router.push(`/purchase-orders`);
    },
    onError: (err: unknown) => {
      setFormError(getErrorMessage(err));
    },
  });

  const openAddQuoteModal = () => {
    const firstSupplierId = suppliersData?.content[0]?.id || 0;
    setQuotationForm({
      supplierId: firstSupplierId,
      totalAmount: currentReq?.estimatedTotal || 0,
      validUntil: "",
      notes: "",
    });
    setFormError(null);
    setAddModalOpen(true);
  };

  const handleAddQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!quotationForm.supplierId) {
      setFormError("Please select a supplier.");
      return;
    }
    if (quotationForm.totalAmount <= 0) {
      setFormError("Total amount must be greater than 0.");
      return;
    }
    createQuoteMutation.mutate(quotationForm);
  };

  const handleGeneratePoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqId || !winningQuote) return;
    setFormError(null);

    const payload: PurchaseOrderRequest = {
      requisitionId: selectedReqId,
      supplierId: winningQuote.supplierId,
      quotationId: winningQuote.id,
      expectedDeliveryDate: expectedDate || undefined,
    };

    generatePoMutation.mutate(payload);
  };

  return (
    <RoleGate
      roles={["ADMIN", "PROCUREMENT_OFFICER"]}
      fallback={
        <div className="p-8 text-center text-slate-500">
          You do not have permission to manage quotations.
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Supplier Quotations
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Collect competitive supplier bids for requisitions in the procurement stage and select the winning offer.
            </p>
          </div>

          {selectedReqId && (
            <div className="flex items-center gap-2">
              <Button onClick={openAddQuoteModal} className="gap-2">
                <Plus className="w-4 h-4" />
                <span>Add Quotation</span>
              </Button>

              {winningQuote && (
                <Button
                  onClick={() => {
                    setFormError(null);
                    setPoModalOpen(true);
                  }}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Generate Purchase Order</span>
                </Button>
              )}
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

        {/* Requisition Selector Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
              Select Requisition:
            </span>
            <select
              value={selectedReqId || ""}
              onChange={(e) => setSelectedReqId(Number(e.target.value))}
              aria-label="Select Requisition"
              className="w-full max-w-lg rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {requisitionsData?.content.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.requisitionNumber} — {r.departmentName} ({formatCurrency(r.estimatedTotal)})
                </option>
              ))}
            </select>
          </div>

          {currentReq && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Required: {formatDate(currentReq.requiredDate)}</span>
              <Badge status={currentReq.status} />
            </div>
          )}
        </div>

        {/* Quotations List / Comparison */}
        {quotesLoading ? (
          <Spinner size="lg" label="Loading vendor quotations..." />
        ) : !selectedReqId ? (
          <EmptyState
            icon={Tag}
            title="No requisition selected"
            description="Select an approved requisition in the PROCUREMENT stage above."
          />
        ) : !quotations || quotations.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No quotations received yet"
            description="Add quotations received from qualified suppliers to compare prices and terms."
            action={
              <Button onClick={openAddQuoteModal} size="sm">
                Add First Quotation
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quotations.map((q) => {
                const isWinner = q.selected;
                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-5 transition flex flex-col justify-between ${
                      isWinner
                        ? "border-emerald-500 bg-emerald-50/30 shadow-md ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-slate-400" />
                          <h3 className="font-bold text-slate-900 text-base">
                            {q.supplierName}
                          </h3>
                        </div>
                        {isWinner && (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                            Winner
                          </span>
                        )}
                      </div>

                      <div className="text-2xl font-black text-slate-900 mb-2">
                        {formatCurrency(q.totalAmount)}
                      </div>

                      {q.notes && (
                        <p className="text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {q.notes}
                        </p>
                      )}

                      <div className="text-xs text-slate-500 space-y-1">
                        <div>
                          Valid Until:{" "}
                          <span className="font-medium text-slate-700">
                            {formatDate(q.validUntil)}
                          </span>
                        </div>
                        <div>
                          Recorded by:{" "}
                          <span className="font-medium text-slate-700">
                            {q.createdByName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                      {isWinner ? (
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 py-1.5">
                          <CheckCircle className="w-4 h-4" />
                          <span>Winning Quotation Selected</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => selectWinningMutation.mutate(q.id)}
                          isLoading={selectWinningMutation.isPending}
                        >
                          Select as Winner
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Quotation Modal */}
        <Modal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Add Supplier Quotation"
          description="Enter quotation proposal received from a vendor partner."
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setAddModalOpen(false)}
                disabled={createQuoteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddQuoteSubmit}
                isLoading={createQuoteMutation.isPending}
              >
                Save Quotation
              </Button>
            </>
          }
        >
          <form onSubmit={handleAddQuoteSubmit} className="space-y-4">
            {formError && <Alert type="error" message={formError} />}

            <Select
              label="Supplier"
              required
              value={quotationForm.supplierId}
              onChange={(e) =>
                setQuotationForm({
                  ...quotationForm,
                  supplierId: Number(e.target.value),
                })
              }
            >
              <option value={0}>Select a vendor...</option>
              {suppliersData?.content.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.contactName || "Sales"})
                </option>
              ))}
            </Select>

            <Input
              label="Total Quoted Price ($)"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              value={quotationForm.totalAmount || ""}
              onChange={(e) =>
                setQuotationForm({
                  ...quotationForm,
                  totalAmount: parseFloat(e.target.value) || 0,
                })
              }
            />

            <Input
              label="Valid Until Date"
              type="date"
              value={quotationForm.validUntil || ""}
              onChange={(e) =>
                setQuotationForm({
                  ...quotationForm,
                  validUntil: e.target.value,
                })
              }
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Commercial Terms & Notes
              </label>
              <textarea
                rows={3}
                placeholder="Payment terms (Net 30), delivery timeline (3 weeks), warranty..."
                value={quotationForm.notes || ""}
                onChange={(e) =>
                  setQuotationForm({ ...quotationForm, notes: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
        </Modal>

        {/* Generate Purchase Order Modal */}
        <Modal
          isOpen={poModalOpen}
          onClose={() => setPoModalOpen(false)}
          title="Generate Purchase Order"
          description={`Issue an official Purchase Order to ${winningQuote?.supplierName}`}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setPoModalOpen(false)}
                disabled={generatePoMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGeneratePoSubmit}
                isLoading={generatePoMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Issue Purchase Order
              </Button>
            </>
          }
        >
          <form onSubmit={handleGeneratePoSubmit} className="space-y-4">
            {formError && <Alert type="error" message={formError} />}

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Requisition:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {currentReq?.requisitionNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Selected Vendor:</span>
                <span className="font-semibold text-slate-800">
                  {winningQuote?.supplierName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Binding Amount:</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(winningQuote?.totalAmount)}
                </span>
              </div>
            </div>

            <Input
              label="Expected Delivery Date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              helperText="Date agreed with vendor for delivery to warehouse."
            />
          </form>
        </Modal>
      </div>
    </RoleGate>
  );
}
