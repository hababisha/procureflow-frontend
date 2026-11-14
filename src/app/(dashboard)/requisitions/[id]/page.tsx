"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/axios";
import { Requisition, Approval } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  Building,
  User,
  History,
  ShoppingCart,
} from "lucide-react";

export default function RequisitionDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: req, isLoading: reqLoading } = useQuery<Requisition>({
    queryKey: ["requisition", id],
    queryFn: async () => {
      const res = await api.get(`/requisitions/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: approvals, isLoading: approvalsLoading } = useQuery<Approval[]>({
    queryKey: ["requisition-approvals", id],
    queryFn: async () => {
      const res = await api.get(`/requisitions/${id}/approvals`);
      return res.data;
    },
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/requisitions/${id}/submit`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisition", id] });
      qc.invalidateQueries({ queryKey: ["requisition-approvals", id] });
      setAlert({
        type: "success",
        message: "Requisition submitted successfully.",
      });
    },
    onError: (err: unknown) => {
      setAlert({ type: "error", message: getErrorMessage(err) });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (comment: string) => {
      return api.post(`/requisitions/${id}/approve`, { comment });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisition", id] });
      qc.invalidateQueries({ queryKey: ["requisition-approvals", id] });
      setApproveModalOpen(false);
      setApprovalComment("");
      setAlert({
        type: "success",
        message: "Requisition approved successfully.",
      });
    },
    onError: (err: unknown) => {
      setActionError(getErrorMessage(err));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (comment: string) => {
      return api.post(`/requisitions/${id}/reject`, { comment });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisition", id] });
      qc.invalidateQueries({ queryKey: ["requisition-approvals", id] });
      setRejectModalOpen(false);
      setRejectReason("");
      setAlert({
        type: "success",
        message: "Requisition rejected.",
      });
    },
    onError: (err: unknown) => {
      setActionError(getErrorMessage(err));
    },
  });

  if (reqLoading) {
    return <Spinner size="lg" label="Loading requisition details..." className="py-20" />;
  }

  if (!req) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold text-slate-800">Requisition Not Found</h2>
        <Link href="/requisitions">
          <Button variant="outline" size="sm" className="mt-4">
            Return to Requisitions
          </Button>
        </Link>
      </div>
    );
  }

  const canApprove =
    user &&
    ((req.status === "MANAGER_APPROVAL" &&
      (user.role === "DEPARTMENT_MANAGER" || user.role === "ADMIN")) ||
      (req.status === "FINANCE_APPROVAL" &&
        (user.role === "FINANCE_OFFICER" || user.role === "ADMIN")));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/requisitions">
            <Button variant="outline" size="sm" className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                {req.requisitionNumber}
              </h1>
              <Badge status={req.status} />
              <Badge status={req.priority}>{req.priority} Priority</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Created on {formatDateTime(req.createdAt)} • Version {req.version}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {req.status === "DRAFT" && (
            <Button
              onClick={() => submitMutation.mutate()}
              isLoading={submitMutation.isPending}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit for Approval</span>
            </Button>
          )}

          {canApprove && (
            <>
              <Button
                variant="danger"
                onClick={() => {
                  setActionError(null);
                  setRejectModalOpen(true);
                }}
                className="gap-2"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </Button>

              <Button
                variant="primary"
                onClick={() => {
                  setActionError(null);
                  setApproveModalOpen(true);
                }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve</span>
              </Button>
            </>
          )}

          {req.status === "PROCUREMENT" && (
            <Link href={`/quotations?requisitionId=${req.id}`}>
              <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
                <ShoppingCart className="w-4 h-4" />
                <span>Manage Quotations</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Grid: Overview & Justification */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Business Justification</span>
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
            {req.justification}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Request Summary
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Requestor
              </span>
              <span className="font-semibold text-slate-800">
                {req.employeeName}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Department
              </span>
              <span className="font-semibold text-slate-800">
                {req.departmentName}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Required Date
              </span>
              <span className="font-semibold text-slate-800">
                {formatDate(req.requiredDate)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-600 font-bold uppercase tracking-wider">
                Estimated Total
              </span>
              <span className="text-base font-bold text-blue-600">
                {formatCurrency(req.estimatedTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Requested Line Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Requisition Line Items ({req.items?.length || 0})
        </h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {req.items?.map((item, idx) => (
              <TableRow key={item.id || idx}>
                <TableCell className="font-mono text-xs font-semibold text-slate-600">
                  {item.itemSku || "—"}
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {item.itemName}
                </TableCell>
                <TableCell className="font-semibold text-slate-800">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-xs uppercase text-slate-500">
                  {item.itemUnit || "PCS"}
                </TableCell>
                <TableCell className="text-slate-700">
                  {formatCurrency(item.estimatedUnitPrice)}
                </TableCell>
                <TableCell className="text-right font-bold text-slate-900">
                  {formatCurrency(item.subtotal || item.quantity * item.estimatedUnitPrice)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Approval Audit Trail Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <History className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">
            Approval Audit Trail
          </h2>
        </div>

        {approvalsLoading ? (
          <Spinner size="md" label="Loading approval logs..." />
        ) : !approvals || approvals.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 italic">
            No approval decisions recorded yet.
          </p>
        ) : (
          <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {approvals.map((app) => {
              const isApproved = app.decision === "APPROVED";
              return (
                <div key={app.id} className="relative flex items-start gap-4 pl-8">
                  <div
                    className={`absolute left-1.5 top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                      isApproved
                        ? "border-emerald-500 text-emerald-600"
                        : "border-red-500 text-red-600"
                    }`}
                  />
                  <div className="flex-1 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {app.actorName}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({app.stage.replace(/_/g, " ")})
                        </span>
                      </div>
                      <Badge
                        variant={isApproved ? "success" : "danger"}
                        className="text-[10px] self-start sm:self-auto"
                      >
                        {app.decision}
                      </Badge>
                    </div>

                    {app.comment && (
                      <p className="text-xs text-slate-700 mt-1 italic bg-white p-2 rounded border border-slate-100">
                        &ldquo;{app.comment}&rdquo;
                      </p>
                    )}

                    <div className="text-[10px] text-slate-400 mt-2">
                      {formatDateTime(app.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Approve Requisition"
        description={`Confirm approval for ${req.requisitionNumber} (${formatCurrency(req.estimatedTotal)})`}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setApproveModalOpen(false)}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => approveMutation.mutate(approvalComment)}
              isLoading={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Confirm Approval
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {actionError && <Alert type="error" message={actionError} />}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Optional Approval Note
            </label>
            <textarea
              rows={3}
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="Add any guidance or conditions for procurement..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Requisition"
        description={`Reject ${req.requisitionNumber}. A specific reason is required.`}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!rejectReason.trim()}
              onClick={() => rejectMutation.mutate(rejectReason)}
              isLoading={rejectMutation.isPending}
            >
              Reject Requisition
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {actionError && <Alert type="error" message={actionError} />}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="State the reason for rejection (e.g., budget exceeded, lack of justification, alternative available)..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
