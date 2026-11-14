"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/axios";
import {
  Supplier,
  SupplierRequest,
  SupplierPurchaseHistory,
  Category,
  PageResponse,
} from "@/types";
import { RoleGate } from "@/components/layout/RoleGate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  History,
  ShoppingBag,
} from "lucide-react";

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState<SupplierRequest>({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    status: "ACTIVE",
    notes: "",
    categoryIds: [],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: categoriesData } = useQuery<PageResponse<Category>>({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const res = await api.get("/categories", { params: { size: 100 } });
      return res.data;
    },
  });

  const { data, isLoading } = useQuery<PageResponse<Supplier>>({
    queryKey: ["suppliers", { page, search }],
    queryFn: async () => {
      const res = await api.get("/suppliers", {
        params: { page, size: 10, search: search || undefined },
      });
      return res.data;
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<
    SupplierPurchaseHistory[]
  >({
    queryKey: ["supplier-history", historySupplier?.id],
    queryFn: async () => {
      if (!historySupplier) return [];
      const res = await api.get(`/suppliers/${historySupplier.id}/purchase-history`);
      return res.data;
    },
    enabled: !!historySupplier && historyModalOpen,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: SupplierRequest) => {
      if (editingSupplier) {
        return api.put(`/suppliers/${editingSupplier.id}`, payload);
      }
      return api.post("/suppliers", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setModalOpen(false);
      setEditingSupplier(null);
      setAlert({
        type: "success",
        message: `Supplier ${editingSupplier ? "updated" : "created"} successfully.`,
      });
    },
    onError: (err: unknown) => {
      setFormError(getErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setDeleteModalOpen(false);
      setDeletingSupplier(null);
      setAlert({ type: "success", message: "Supplier deleted successfully." });
    },
    onError: (err: unknown) => {
      setAlert({ type: "error", message: getErrorMessage(err) });
      setDeleteModalOpen(false);
    },
  });

  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      status: "ACTIVE",
      notes: "",
      categoryIds: [],
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      contactName: s.contactName || "",
      email: s.email || "",
      phone: s.phone || "",
      address: s.address || "",
      status: s.status || "ACTIVE",
      notes: s.notes || "",
      categoryIds: s.categoryIds || [],
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openHistoryModal = (s: Supplier) => {
    setHistorySupplier(s);
    setHistoryModalOpen(true);
  };

  const handleCategoryToggle = (catId: number) => {
    const current = formData.categoryIds || [];
    if (current.includes(catId)) {
      setFormData({
        ...formData,
        categoryIds: current.filter((id) => id !== catId),
      });
    } else {
      setFormData({
        ...formData,
        categoryIds: [...current, catId],
      });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError("Supplier name is required.");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <RoleGate
      roles={["ADMIN", "PROCUREMENT_OFFICER"]}
      fallback={
        <div className="p-8 text-center text-slate-500">
          You do not have permission to view suppliers.
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Suppliers Directory
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Qualified vendors, category specializations, and historical purchase records.
            </p>
          </div>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
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
              placeholder="Search suppliers by name, contact, or email..."
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
          <Spinner size="lg" label="Loading suppliers..." />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No suppliers found"
            description="Register vendor partners to receive quotations and fulfill purchase orders."
            action={
              <Button onClick={openCreateModal} size="sm">
                Add Supplier
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email & Phone</TableHead>
                  <TableHead>Categories Served</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900">
                        {s.name}
                      </div>
                      {s.address && (
                        <div className="text-xs text-slate-400 truncate max-w-xs">
                          {s.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {s.contactName || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-800">{s.email || "—"}</div>
                      <div className="text-xs text-slate-500">{s.phone || ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {s.categoryNames && s.categoryNames.length > 0 ? (
                          s.categoryNames.map((catName) => (
                            <span
                              key={catName}
                              className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {catName}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={s.status === "ACTIVE" ? "success" : "secondary"}
                        className="text-[11px]"
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openHistoryModal(s)}
                          title="View Purchase History"
                        >
                          <History className="w-3.5 h-3.5 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(s)}
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingSupplier(s);
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
          title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}
          description="Enter vendor contact details and specialized product categories."
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
                {editingSupplier ? "Save Changes" : "Create Supplier"}
              </Button>
            </>
          }
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {formError && <Alert type="error" message={formError} />}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Supplier Company Name"
                required
                placeholder="e.g. Dell Enterprise Solutions"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />

              <Input
                label="Primary Contact Person"
                placeholder="e.g. Michael Scott"
                value={formData.contactName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="sales@dell.com"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />

              <Input
                label="Phone Number"
                placeholder="+1-800-555-0199"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <Input
              label="Business Address"
              placeholder="e.g. One Dell Way, Round Rock, TX"
              value={formData.address || ""}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Supplied Categories
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                {categoriesData?.content.map((cat) => {
                  const isChecked = (formData.categoryIds || []).includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCategoryToggle(cat.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span className="truncate">{cat.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </form>
        </Modal>

        {/* Purchase History Modal */}
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title={`Purchase History: ${historySupplier?.name}`}
          description="Historical purchase orders and expenditure records with this vendor."
          size="lg"
          footer={
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
              Close
            </Button>
          }
        >
          {historyLoading ? (
            <Spinner size="md" label="Loading purchase history..." />
          ) : !historyData || historyData.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No purchase orders"
              description="No historical purchase orders found for this supplier."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Line Items</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.map((hist) => (
                  <TableRow key={hist.purchaseOrderId}>
                    <TableCell className="font-mono text-xs font-bold text-blue-600">
                      {hist.poNumber}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(hist.orderDate)}
                    </TableCell>
                    <TableCell>
                      <Badge status={hist.status} className="text-[11px]" />
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {hist.itemCount} items
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      {formatCurrency(hist.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Supplier"
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
                  deletingSupplier && deleteMutation.mutate(deletingSupplier.id)
                }
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Are you sure you want to delete supplier{" "}
            <span className="font-bold text-slate-900">
              {deletingSupplier?.name}
            </span>
            ? This action cannot be undone.
          </p>
        </Modal>
      </div>
    </RoleGate>
  );
}
