"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/axios";
import { Requisition, PageResponse } from "@/types";
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
import { Alert } from "@/components/ui/Alert";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Send,
  Trash2,
} from "lucide-react";

const STATUSES = [
  { label: "All Statuses", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Manager Review", value: "MANAGER_APPROVAL" },
  { label: "Finance Review", value: "FINANCE_APPROVAL" },
  { label: "Procurement", value: "PROCUREMENT" },
  { label: "Ordered", value: "ORDERED" },
  { label: "Received", value: "RECEIVED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Rejected", value: "REJECTED" },
];

export default function RequisitionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingReq, setDeletingReq] = useState<Requisition | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data, isLoading } = useQuery<PageResponse<Requisition>>({
    queryKey: ["requisitions", { page, search, status: statusFilter }],
    queryFn: async () => {
      const res = await api.get("/requisitions", {
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

  const submitMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/requisitions/${id}/submit`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      setAlert({
        type: "success",
        message: "Requisition submitted successfully for manager approval.",
      });
    },
    onError: (err: unknown) => {
      setAlert({ type: "error", message: getErrorMessage(err) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/requisitions/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      setDeleteModalOpen(false);
      setDeletingReq(null);
      setAlert({ type: "success", message: "Draft requisition deleted." });
    },
    onError: (err: unknown) => {
      setAlert({ type: "error", message: getErrorMessage(err) });
      setDeleteModalOpen(false);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Purchase Requisitions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, track, and monitor department purchase requests throughout the approval pipeline.
          </p>
        </div>
        <Link href="/requisitions/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            <span>New Requisition</span>
          </Button>
        </Link>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by requisition number or justification..."
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
            aria-label="Filter by requisition status"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <Spinner size="lg" label="Loading requisitions..." />
      ) : !data || data.content.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No requisitions found"
          description="Create a purchase requisition to request equipment, materials, or services."
          action={
            <Link href="/requisitions/new">
              <Button size="sm">Create Requisition</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requisition #</TableHead>
                <TableHead>Justification</TableHead>
                <TableHead>Requestor</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Estimated Total</TableHead>
                <TableHead>Required By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.content.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs font-bold text-blue-600">
                    <Link
                      href={`/requisitions/${req.id}`}
                      className="hover:underline"
                    >
                      {req.requisitionNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 max-w-xs truncate">
                      {req.justification}
                    </div>
                    <div className="text-xs text-slate-400">
                      {req.items?.length || 0} line items
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-slate-800">
                      {req.employeeName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {req.departmentName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge status={req.priority} className="text-[11px]">
                      {req.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge status={req.status} className="text-[11px]" />
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {formatCurrency(req.estimatedTotal)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(req.requiredDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/requisitions/${req.id}`}>
                        <Button variant="ghost" size="sm" title="View details">
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                      </Link>

                      {req.status === "DRAFT" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => submitMutation.mutate(req.id)}
                            isLoading={submitMutation.isPending}
                            title="Submit for Approval"
                          >
                            <Send className="w-3.5 h-3.5 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingReq(req);
                              setDeleteModalOpen(true);
                            }}
                            title="Delete Draft"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </Button>
                        </>
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

      {/* Delete Draft Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Draft Requisition"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deletingReq && deleteMutation.mutate(deletingReq.id)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete draft requisition{" "}
          <span className="font-bold text-slate-900">
            {deletingReq?.requisitionNumber}
          </span>
          ? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
