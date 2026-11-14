"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/axios";
import { Department, DepartmentRequest, PageResponse } from "@/types";
import { RoleGate } from "@/components/layout/RoleGate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import { Building2, Plus, Search, Edit2, Trash2 } from "lucide-react";

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);

  const [formData, setFormData] = useState<DepartmentRequest>({
    name: "",
    code: "",
    budget: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data, isLoading } = useQuery<PageResponse<Department>>({
    queryKey: ["departments", { page, search }],
    queryFn: async () => {
      const res = await api.get("/departments", {
        params: { page, size: 10, search: search || undefined },
      });
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: DepartmentRequest) => {
      if (editingDept) {
        return api.put(`/departments/${editingDept.id}`, payload);
      }
      return api.post("/departments", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      setModalOpen(false);
      setEditingDept(null);
      setAlert({
        type: "success",
        message: `Department ${editingDept ? "updated" : "created"} successfully.`,
      });
    },
    onError: (err: unknown) => {
      setFormError(getErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/departments/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      setDeleteModalOpen(false);
      setDeletingDept(null);
      setAlert({ type: "success", message: "Department deleted successfully." });
    },
    onError: (err: unknown) => {
      setAlert({ type: "error", message: getErrorMessage(err) });
      setDeleteModalOpen(false);
    },
  });

  const openCreateModal = () => {
    setEditingDept(null);
    setFormData({ name: "", code: "", budget: 0 });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      budget: dept.budget,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError("Department name is required.");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <RoleGate
      roles={["ADMIN"]}
      fallback={
        <div className="p-8 text-center text-slate-500">
          You do not have permission to view Master Data settings.
        </div>
      }
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Departments
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage organizational departments and their allocated procurement budgets.
            </p>
          </div>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </Button>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by department name or code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <Spinner size="lg" label="Loading departments..." />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No departments found"
            description="Create your first organization department to organize users and manage budgets."
            action={
              <Button onClick={openCreateModal} size="sm">
                Add Department
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Allocated Budget</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-mono text-xs font-semibold text-blue-600">
                      {dept.code || "—"}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {dept.name}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700">
                      {formatCurrency(dept.budget)}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {formatDate(dept.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(dept)}
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingDept(dept);
                            setDeleteModalOpen(true);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
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

        {/* Create / Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingDept ? "Edit Department" : "Add New Department"}
          description="Enter department details and allocated procurement budget."
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleFormSubmit}
                isLoading={saveMutation.isPending}
              >
                {editingDept ? "Save Changes" : "Create Department"}
              </Button>
            </>
          }
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {formError && <Alert type="error" message={formError} />}

            <Input
              label="Department Name"
              required
              placeholder="e.g. Information Technology"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />

            <Input
              label="Department Code"
              placeholder="e.g. IT, FIN, HR"
              value={formData.code || ""}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
            />

            <Input
              label="Annual Budget ($)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.budget || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  budget: parseFloat(e.target.value) || 0,
                })
              }
            />
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Department"
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
                onClick={() =>
                  deletingDept && deleteMutation.mutate(deletingDept.id)
                }
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Are you sure you want to delete department{" "}
            <span className="font-bold text-slate-900">{deletingDept?.name}</span>?
            This action cannot be undone.
          </p>
        </Modal>
      </div>
    </RoleGate>
  );
}
