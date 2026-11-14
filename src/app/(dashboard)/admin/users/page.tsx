"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/axios";
import { User, UserRequest, Department, PageResponse } from "@/types";
import { RoleGate } from "@/components/layout/RoleGate";
import { Role, formatRoleName, getRoleBadgeColor } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
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
import { formatDate } from "@/lib/utils";
import { Users, Plus, Search, Edit2, Trash2 } from "lucide-react";

const ROLES: { label: string; value: Role }[] = [
  { label: "System Administrator", value: "ADMIN" },
  { label: "Department Manager", value: "DEPARTMENT_MANAGER" },
  { label: "Finance Officer", value: "FINANCE_OFFICER" },
  { label: "Procurement Officer", value: "PROCUREMENT_OFFICER" },
  { label: "Store Keeper", value: "STORE_KEEPER" },
  { label: "Employee", value: "EMPLOYEE" },
];

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<UserRequest>({
    fullName: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    departmentId: 0,
    enabled: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: deptData } = useQuery<PageResponse<Department>>({
    queryKey: ["departments-all"],
    queryFn: async () => {
      const res = await api.get("/departments", { params: { size: 100 } });
      return res.data;
    },
  });

  const { data, isLoading } = useQuery<PageResponse<User>>({
    queryKey: ["users", { page, search }],
    queryFn: async () => {
      const res = await api.get("/users", {
        params: { page, size: 10, search: search || undefined },
      });
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: UserRequest) => {
      if (editingUser) {
        return api.put(`/users/${editingUser.id}`, payload);
      }
      return api.post("/users", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setModalOpen(false);
      setEditingUser(null);
      setAlert({
        type: "success",
        message: `User ${editingUser ? "updated" : "created"} successfully.`,
      });
    },
    onError: (err: unknown) => {
      setFormError(getErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setDeleteModalOpen(false);
      setDeletingUser(null);
      setAlert({ type: "success", message: "User deleted successfully." });
    },
    onError: (err: unknown) => {
      setAlert({ type: "error", message: getErrorMessage(err) });
      setDeleteModalOpen(false);
    },
  });

  const openCreateModal = () => {
    setEditingUser(null);
    const firstDeptId = deptData?.content[0]?.id || 0;
    setFormData({
      fullName: "",
      email: "",
      password: "",
      role: "EMPLOYEE",
      departmentId: firstDeptId,
      enabled: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormData({
      fullName: u.fullName,
      email: u.email,
      password: "", // Leave blank if not updating
      role: u.role,
      departmentId: u.departmentId,
      enabled: u.enabled,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.fullName.trim() || !formData.email.trim()) {
      setFormError("Full name and email are required.");
      return;
    }
    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    const payload: UserRequest = {
      ...formData,
      password: formData.password ? formData.password : undefined,
    };
    saveMutation.mutate(payload);
  };

  return (
    <RoleGate
      roles={["ADMIN"]}
      fallback={
        <div className="p-8 text-center text-slate-500">
          You do not have permission to access user management.
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              User Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Administer system accounts, assign RBAC security roles, and map users to departments.
            </p>
          </div>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </Button>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {isLoading ? (
          <Spinner size="lg" label="Loading users..." />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Add personnel to your system with assigned roles and departments."
            action={
              <Button onClick={openCreateModal} size="sm">
                Add User
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900">
                        {u.fullName}
                      </div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeColor(
                          u.role
                        )}`}
                      >
                        {formatRoleName(u.role)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-700">
                      {u.departmentName || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.enabled ? "success" : "secondary"}
                        className="text-[11px]"
                      >
                        {u.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(u)}
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingUser(u);
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

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingUser ? "Edit User Account" : "Add New User Account"}
          description="Provide user credentials, organizational role, and department assignment."
          size="lg"
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
                {editingUser ? "Save Changes" : "Create Account"}
              </Button>
            </>
          }
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {formError && <Alert type="error" message={formError} />}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                required
                placeholder="e.g. Jane Doe"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />

              <Input
                label="Email Address"
                type="email"
                required
                placeholder="jane.doe@procureflow.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={
                  editingUser
                    ? "Password (leave blank to keep existing)"
                    : "Password"
                }
                type="password"
                required={!editingUser}
                placeholder="••••••••••••"
                value={formData.password || ""}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                helperText="Minimum 6 characters"
              />

              <Select
                label="System Role"
                required
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as Role })
                }
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <Select
                label="Department"
                value={formData.departmentId || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    departmentId: Number(e.target.value),
                  })
                }
              >
                <option value="">Select Department...</option>
                {deptData?.content.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </Select>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="enabled-user"
                  checked={formData.enabled}
                  onChange={(e) =>
                    setFormData({ ...formData, enabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label
                  htmlFor="enabled-user"
                  className="text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  Account Enabled
                </label>
              </div>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete User"
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
                  deletingUser && deleteMutation.mutate(deletingUser.id)
                }
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Are you sure you want to delete user{" "}
            <span className="font-bold text-slate-900">
              {deletingUser?.fullName} ({deletingUser?.email})
            </span>
            ? This action cannot be undone.
          </p>
        </Modal>
      </div>
    </RoleGate>
  );
}
