"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { PurchaseOrder, PageResponse } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShoppingCart,
  Search,
  Eye,
  PackageCheck,
  Building,
} from "lucide-react";

const PO_STATUSES = [
  { label: "All Statuses", value: "" },
  { label: "Ordered", value: "ORDERED" },
  { label: "Partially Received", value: "RECEIVED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function PurchaseOrdersPage() {
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const { data, isLoading } = useQuery<PageResponse<PurchaseOrder>>({
    queryKey: ["purchase-orders", { page, search, status: statusFilter }],
    queryFn: async () => {
      const res = await api.get("/purchase-orders", {
        params: {
          page,
          size: 10,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      return res.data;
    },
  });

  const openDetail = (po: PurchaseOrder) => {
    setSelectedPo(po);
    setDetailModalOpen(true);
  };

  const isStorekeeper = user?.role === "STORE_KEEPER" || user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track official binding vendor orders, fulfillment progress, and warehouse receipts.
          </p>
        </div>

        <Link href="/quotations">
          <Button variant="outline" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span>Quotations & PO Issuance</span>
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PO #, requisition #, or vendor name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            aria-label="Filter by purchase order status"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PO_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <Spinner size="lg" label="Loading purchase orders..." />
      ) : !data || data.content.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No purchase orders found"
          description="Purchase orders are generated from approved requisitions once a supplier quote is selected."
          action={
            <Link href="/quotations">
              <Button size="sm">Go to Quotations</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Requisition #</TableHead>
                <TableHead>Vendor / Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.content.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-xs font-bold text-blue-600">
                    <button
                      type="button"
                      onClick={() => openDetail(po)}
                      className="hover:underline focus:outline-none"
                    >
                      {po.poNumber}
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {po.requisitionNumber || "—"}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {po.supplierName}
                  </TableCell>
                  <TableCell>
                    <Badge status={po.status} className="text-[11px]" />
                  </TableCell>
                  <TableCell className="font-bold text-slate-900">
                    {formatCurrency(po.totalAmount)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(po.expectedDeliveryDate)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {po.createdByName}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetail(po)}
                        title="View PO Details"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                      </Button>

                      {isStorekeeper &&
                        (po.status === "ORDERED" || po.status === "RECEIVED") && (
                          <Link href={`/receiving?poId=${po.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Receive Goods"
                              className="hover:bg-emerald-50"
                            >
                              <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                            </Button>
                          </Link>
                        )}
                    </div>
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

      {/* PO Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Purchase Order: ${selectedPo?.poNumber}`}
        description="Official purchase order details, item quantities, and receiving status."
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            {isStorekeeper &&
            (selectedPo?.status === "ORDERED" ||
              selectedPo?.status === "RECEIVED") ? (
              <Link href={`/receiving?poId=${selectedPo.id}`}>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <PackageCheck className="w-4 h-4" />
                  <span>Receive Goods Against This PO</span>
                </Button>
              </Link>
            ) : (
              <div />
            )}
            <Button
              variant="outline"
              onClick={() => setDetailModalOpen(false)}
            >
              Close
            </Button>
          </div>
        }
      >
        {selectedPo && (
          <div className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block uppercase font-medium">
                  Status
                </span>
                <Badge status={selectedPo.status} className="mt-1" />
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-medium">
                  Vendor
                </span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-1 truncate">
                  <Building className="w-3 h-3 text-slate-400" />
                  {selectedPo.supplierName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-medium">
                  Requisition
                </span>
                <span className="font-mono font-medium text-slate-800 block mt-1">
                  {selectedPo.requisitionNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-medium">
                  Total Value
                </span>
                <span className="font-bold text-blue-600 text-sm block mt-0.5">
                  {formatCurrency(selectedPo.totalAmount)}
                </span>
              </div>
            </div>

            {/* Line items table with ordered vs received */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Order Items ({selectedPo.items?.length || 0})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPo.items?.map((item) => {
                    const isFullyReceived =
                      item.receivedQuantity >= item.quantity;
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
                        <TableCell className="font-bold text-slate-800">
                          {item.quantity}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                              isFullyReceived
                                ? "bg-emerald-100 text-emerald-800"
                                : item.receivedQuantity > 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.receivedQuantity} / {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900">
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
