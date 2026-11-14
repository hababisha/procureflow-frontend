"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/axios";
import {
  PurchaseOrder,
  GoodsReceipt,
  GoodsReceiptRequest,
  PageResponse,
} from "@/types";
import { RoleGate } from "@/components/layout/RoleGate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import { formatDateTime } from "@/lib/utils";
import {
  PackageCheck,
  ShieldCheck,
  Building,
  Key,
  RotateCcw,
} from "lucide-react";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "idemp-" + Math.random().toString(36).substring(2) + Date.now();
}

export default function ReceivingPage() {
  const searchParams = useSearchParams();
  const initialPoId = searchParams.get("poId");
  const qc = useQueryClient();

  const [selectedPoId, setSelectedPoId] = useState<number | null>(
    initialPoId ? Number(initialPoId) : null
  );

  // Generate UUID idempotency key on mount / PO open
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  useEffect(() => {
    // Generate new UUID when component mounts or resets
    setIdempotencyKey(generateUUID());
  }, [selectedPoId]);

  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedQuantities, setReceivedQuantities] = useState<Record<number, number>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning";
    message: string;
    receiptNumber?: string;
  } | null>(null);

  // Fetch open purchase orders for selection
  const { data: openOrders } = useQuery<PageResponse<PurchaseOrder>>({
    queryKey: ["open-purchase-orders"],
    queryFn: async () => {
      const res = await api.get("/purchase-orders", {
        params: { size: 50 },
      });
      // Filter open orders (ORDERED or RECEIVED)
      const filtered = res.data.content.filter(
        (po: PurchaseOrder) => po.status === "ORDERED" || po.status === "RECEIVED"
      );
      return { ...res.data, content: filtered };
    },
  });

  // If initial PO ID was not specified and open orders exist, select the first one
  useEffect(() => {
    if (!selectedPoId && openOrders?.content && openOrders.content.length > 0) {
      setSelectedPoId(openOrders.content[0].id);
    }
  }, [openOrders, selectedPoId]);

  // Fetch selected PO details
  const { data: currentPo, isLoading: poLoading } = useQuery<PurchaseOrder>({
    queryKey: ["purchase-order", selectedPoId],
    queryFn: async () => {
      if (!selectedPoId) return null as unknown as PurchaseOrder;
      const res = await api.get(`/purchase-orders/${selectedPoId}`);
      return res.data;
    },
    enabled: !!selectedPoId,
  });

  // Pre-fill received quantities when currentPo loads
  useEffect(() => {
    if (currentPo?.items) {
      const initial: Record<number, number> = {};
      currentPo.items.forEach((item) => {
        const remaining = Math.max(0, item.quantity - item.receivedQuantity);
        initial[item.id] = remaining;
      });
      setReceivedQuantities(initial);
    }
  }, [currentPo]);

  // Fetch past receipts list for audit
  const { data: pastReceipts, isLoading: receiptsLoading } = useQuery<
    PageResponse<GoodsReceipt>
  >({
    queryKey: ["goods-receipts"],
    queryFn: async () => {
      const res = await api.get("/goods-receipts", { params: { size: 10 } });
      return res.data;
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (payload: GoodsReceiptRequest) => {
      if (!selectedPoId) return;
      return api.post(`/purchase-orders/${selectedPoId}/receipts`, payload, {
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["purchase-order", selectedPoId] });
      qc.invalidateQueries({ queryKey: ["goods-receipts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });

      const data = res?.data;
      setAlert({
        type: "success",
        message: `Goods receipt recorded successfully! Warehouse stock updated.`,
        receiptNumber: data?.receiptNumber,
      });

      // Generate a new idempotency key for future receipts
      setIdempotencyKey(generateUUID());
      setDeliveryNoteNumber("");
      setNotes("");
    },
    onError: (err: unknown) => {
      const msg = getErrorMessage(err);
      setFormError(msg);
      // NOTE: We deliberately DO NOT regenerate idempotencyKey here,
      // so if the user hits retry after a network error, the same key protects against duplication!
    },
  });

  const handleQtyChange = (itemId: number, qty: number) => {
    setReceivedQuantities((prev) => ({
      ...prev,
      [itemId]: qty,
    }));
  };

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!deliveryNoteNumber.trim()) {
      setFormError("Delivery Note / Waybill Number is required.");
      return;
    }

    if (!currentPo?.items || currentPo.items.length === 0) {
      setFormError("No items available to receive.");
      return;
    }

    // Build items payload
    const itemsPayload = currentPo.items
      .map((item) => ({
        purchaseOrderItemId: item.id,
        quantityReceived: receivedQuantities[item.id] || 0,
      }))
      .filter((i) => i.quantityReceived > 0);

    if (itemsPayload.length === 0) {
      setFormError("At least one item must have a received quantity greater than 0.");
      return;
    }

    // Guard against over-receipt on frontend
    for (const line of itemsPayload) {
      const poItem = currentPo.items.find((i) => i.id === line.purchaseOrderItemId);
      if (poItem) {
        const remaining = poItem.quantity - poItem.receivedQuantity;
        if (line.quantityReceived > remaining) {
          setFormError(
            `Quantity received for "${poItem.itemName}" (${line.quantityReceived}) exceeds remaining order quantity (${remaining}). Over-receiving is not permitted.`
          );
          return;
        }
      }
    }

    receiveMutation.mutate({
      deliveryNoteNumber,
      notes: notes || undefined,
      verified: true,
      items: itemsPayload,
    });
  };

  return (
    <RoleGate
      roles={["ADMIN", "STORE_KEEPER"]}
      fallback={
        <div className="p-8 text-center text-slate-500">
          You do not have permission to record warehouse goods receiving.
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Warehouse Goods Receiving
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Receive incoming vendor deliveries against active Purchase Orders with atomic stock updates and idempotency protection.
          </p>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            title={alert.receiptNumber ? `Receipt #${alert.receiptNumber}` : undefined}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {/* PO Selector Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
              Select Open PO:
            </span>
            <select
              value={selectedPoId || ""}
              onChange={(e) => {
                setSelectedPoId(Number(e.target.value));
                setFormError(null);
                setAlert(null);
              }}
              aria-label="Select Open Purchase Order"
              className="w-full max-w-lg rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {openOrders?.content.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} — {po.supplierName} ({po.status})
                </option>
              ))}
            </select>
          </div>

          {currentPo && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {currentPo.supplierName}
              </span>
              <Badge status={currentPo.status} />
            </div>
          )}
        </div>

        {/* Main Receiving Form */}
        {poLoading ? (
          <Spinner size="lg" label="Loading purchase order details..." />
        ) : !selectedPoId || !currentPo ? (
          <EmptyState
            icon={PackageCheck}
            title="No open purchase order selected"
            description="Select an open purchase order with pending deliveries to proceed."
          />
        ) : (
          <form onSubmit={handleReceiveSubmit} className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Receive Delivery: {currentPo.poNumber}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter physical quantities received and verified from the vendor delivery note.
                  </p>
                </div>

                {/* Idempotency key indicator */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 font-mono">
                  <Key className="w-3 h-3 text-amber-600" />
                  <span className="truncate max-w-[180px]">
                    Key: {idempotencyKey}
                  </span>
                </div>
              </div>

              {formError && <Alert type="error" message={formError} />}

              {/* Delivery Note inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Delivery Note / Waybill Number"
                  required
                  placeholder="e.g. DN-2026-98124"
                  value={deliveryNoteNumber}
                  onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                  helperText="Vendor-provided shipping slip / delivery confirmation number."
                />

                <Input
                  label="Receiving Notes / Inspection Comments"
                  placeholder="e.g. Packages inspected, seals intact, no damage observed."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Items receiving table */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">
                  Delivered Items Checklist
                </h3>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Ordered</TableHead>
                      <TableHead>Previously Received</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead className="w-40">Receiving Now</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPo.items?.map((item) => {
                      const remaining = Math.max(
                        0,
                        item.quantity - item.receivedQuantity
                      );
                      const currentVal = receivedQuantities[item.id] ?? remaining;
                      const isOver = currentVal > remaining;

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs font-semibold text-slate-600">
                            {item.itemSku}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {item.itemName}
                          </TableCell>
                          <TableCell className="text-xs uppercase text-slate-500">
                            {item.itemUnit}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-700">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium">
                            {item.receivedQuantity}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                remaining === 0
                                  ? "bg-slate-100 text-slate-400"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {remaining}
                            </span>
                          </TableCell>
                          <TableCell>
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              disabled={remaining === 0}
                              value={currentVal}
                              onChange={(e) =>
                                handleQtyChange(
                                  item.id,
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className={`w-full rounded-lg border px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                                isOver
                                  ? "border-red-500 text-red-600 focus:ring-red-500"
                                  : "border-slate-300 focus:ring-emerald-500"
                              } ${remaining === 0 ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white"}`}
                            />
                            {isOver && (
                              <p className="text-[10px] text-red-600 mt-1 font-semibold">
                                Exceeds remaining ({remaining})
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIdempotencyKey(generateUUID());
                  }}
                  className="gap-1.5 text-xs text-slate-500"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate Key</span>
                </Button>

                <Button
                  type="submit"
                  isLoading={receiveMutation.isPending}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Confirm Receipt & Update Inventory</span>
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Past Goods Receipts Audit Log */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Recent Warehouse Goods Receipts
          </h2>

          {receiptsLoading ? (
            <Spinner size="md" label="Loading receipts log..." />
          ) : !pastReceipts || pastReceipts.content.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 italic">
              No goods receipts recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Delivery Note #</TableHead>
                  <TableHead>Items Received</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead className="text-right">Received Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastReceipts.content.map((gr) => (
                  <TableRow key={gr.id}>
                    <TableCell className="font-mono text-xs font-bold text-blue-600">
                      {gr.receiptNumber}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">
                      {gr.poNumber}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">
                      {gr.deliveryNoteNumber || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {gr.items?.length || 0} items
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {gr.receivedByName}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500">
                      {formatDateTime(gr.receivedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
