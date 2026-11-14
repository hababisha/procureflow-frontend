"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/axios";
import { Requisition, Department, PageResponse } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { RoleGate } from "@/components/layout/RoleGate";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CheckSquare,
  CheckCircle,
  XCircle,
  Eye,
  Building,
} from "lucide-react";

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [page, setPage] = useState(0);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Determine which status to filter based on current user role
  const targetStatus =
    user?.role === "DEPARTMENT_MANAGER"
      ? "MANAGER_APPROVAL"
      : user?.role === "FINANCE_OFFICER"
      ? "FINANCE_APPROVAL"
      : ""; // Admin sees both or all

  const { data, isLoading } = useQuery<PageResponse<Requisition>>({
    queryKey: ["approvals-queue", { page, targetStatus }],
    queryFn: async () => {
      const res = await api.get("/requisitions", {
        params: {
          page,
          size: 10,
          status: targetStatus || undefined,
        },
      });
      return res.data;
    },
  });

  // Fetch department details for budget check if reviewing in finance
  const { data: departmentInfo } = useQuery<Department>({
    queryKey: ["department-budget", selectedReq?.departmentId],
    queryFn: async () => {
      if (!selectedReq?.departmentId) return null as unknown as Department;
      const res = await api.get(`/departments/${selectedReq.departmentId}`);
      return res.data;
    },
    enabled: !!selectedReq?.departmentId,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: number; comment: string }) => {
      return api.post(`/requisitions/${id}/approve`, { comment });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals-queue"] });
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      setApproveModalOpen(false);
      setSelectedReq(null);
      setApprovalComment("");
      setAlert({
        type: "success",
        message: "Requisition approved and transitioned to next stage.",
      });
    },
    onError: (err: unknown) => {
      setActionError(getErrorMessage(err));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: number; comment: string }) => {
      return api.post(`/requisitions/${id}/reject`, { comment });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals-queue"] });
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      setRejectModalOpen(false);
      setSelectedReq(null);
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

  const openApprove = (req: Requisition) => {
    setSelectedReq(req);
    setApprovalComment("");
    setActionError(null);
    setApproveModalOpen(true);
  };

  const openReject = (req: Requisition) => {
    setSelectedReq(req);
    setRejectReason("");
    setActionError(null);
    setRejectModalOpen(true);
  };

  return (
    <RoleGate
      roles={["ADMIN", "DEPARTMENT_MANAGER", "FINANCE_OFFICER"]}
      fallback={
        <div className="p-8 text-center text-slate-500">
          You do not have permission to view approval queues.
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Pending Approvals Queue
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review, verify department budget limits, and decide on pending requisitions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Role: {user?.role.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {isLoading ? (
          <Spinner size="lg" label="Loading approval requests..." />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="All caught up!"
            description="There are currently no requisitions waiting for your approval decision."
          />
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requisition #</TableHead>
                  <TableHead>Requestor</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Estimated Total</TableHead>
                  <TableHead>Required Date</TableHead>
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
                    <TableCell className="font-semibold text-slate-900">
                      {req.employeeName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {req.departmentName}
                    </TableCell>
                    <TableCell>
                      <Badge status={req.priority} className="text-[11px]">
                        {req.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge status={req.status} className="text-[11px]" />
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">
                      {formatCurrency(req.estimatedTotal)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(req.requiredDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/requisitions/${req.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Inspect details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReject(req)}
                          title="Reject"
                          className="hover:bg-red-50"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openApprove(req)}
                          title="Approve"
                          className="hover:bg-emerald-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        </Button>
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

        {/* Approve Modal */}
        <Modal
          isOpen={approveModalOpen}
          onClose={() => setApproveModalOpen(false)}
          title="Approve Requisition"
          description={`Confirm approval for ${selectedReq?.requisitionNumber}`}
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
                onClick={() =>
                  selectedReq &&
                  approveMutation.mutate({
                    id: selectedReq.id,
                    comment: approvalComment,
                  })
                }
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

            {selectedReq && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Requestor:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedReq.employeeName} ({selectedReq.departmentName})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requisition Amount:</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(selectedReq.estimatedTotal)}
                  </span>
                </div>

                {departmentInfo && (
                  <div className="pt-2 border-t border-slate-200 mt-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                      <Building className="w-3.5 h-3.5" />
                      <span>Department Annual Budget:</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Total Allocated Budget:</span>
                      <span className="font-semibold">
                        {formatCurrency(departmentInfo.budget)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Optional Approval Comment
              </label>
              <textarea
                rows={3}
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Optional notes or instructions for the procurement team..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </Modal>

        {/* Reject Modal */}
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Requisition"
          description={`Reject ${selectedReq?.requisitionNumber}. A specific reason is required.`}
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
                onClick={() =>
                  selectedReq &&
                  rejectMutation.mutate({
                    id: selectedReq.id,
                    comment: rejectReason,
                  })
                }
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
                placeholder="Provide a detailed reason explaining why this requisition cannot be approved..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </Modal>
      </div>
    </RoleGate>
  );
}
