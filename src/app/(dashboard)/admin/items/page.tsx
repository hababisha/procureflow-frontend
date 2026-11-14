"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/axios";
import { Item, ItemRequest, Category, PageResponse } from "@/types";
import { RoleGate } from "@/components/layout/RoleGate";
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
import { formatCurrency } from "@/lib/utils";
import { Package, Plus, Search, Edit2, Trash2 } from "lucide-react";

export default function ItemsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);

  const [formData, setFormData] = useState<ItemRequest>({
    sku: "",
    name: "",
    description: "",
    categoryId: 0,
    unit: "PCS",
    unitPrice: 0,
    reorderLevel: 10,
    active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch categories for dropdown
  const { data: categoriesData } = useQuery<PageResponse<Category>>({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const res = await api.get("/categories", { params: { size: 100 } });
      return res.data;
    },
  });

  const { data, isLoading } = useQuery<PageResponse<Item>>({
    queryKey: ["items", { page, search, categoryId: selectedCategory }],
    queryFn: async () => {
      const res = await api.get("/items", {
        params: {
          page,
          size: 10,
          search: search || undefined,
          categoryId: selectedCategory ? Number(selectedCategory) : undefined,
        },
      });
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: ItemRequest) => {
      if (editingItem) {
        return api.put(`/items/${editingItem.id}`, payload);
      }
      return api.post("/items", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      setModalOpen(false);
      setEditingItem(null);
      setAlert({
        type: "success",
        message: `Catalog item ${editingItem ? "updated" : "created"} successfully.`,
      });
    },
    onError: (err: unknown) => {
      setFormError(getErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/items/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      setDeleteModalOpen(false);
      setDeletingItem(null);
      setAlert({ type: "success", message: "Catalog item deleted successfully." });
    },
    onError: (err: unknown) => {
      setAlert({ type: "error", message: getErrorMessage(err) });
      setDeleteModalOpen(false);
    },
  });

  const openCreateModal = () => {
    setEditingItem(null);
    const firstCatId = categoriesData?.content[0]?.id || 0;
    setFormData({
      sku: "",
      name: "",
      description: "",
      categoryId: firstCatId,
      unit: "PCS",
      unitPrice: 0,
      reorderLevel: 10,
      active: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setFormData({
      sku: item.sku,
      name: item.name,
      description: item.description || "",
      categoryId: item.categoryId,
      unit: item.unit,
      unitPrice: item.unitPrice,
      reorderLevel: item.reorderLevel,
      active: item.active,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.sku.trim() || !formData.name.trim()) {
      setFormError("SKU and Name are required.");
      return;
    }
    if (!formData.categoryId) {
      setFormError("Please select a category.");
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Catalog Items
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Standard catalog items available for requisitioning, procurement, and stock management.
            </p>
          </div>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Add Catalog Item</span>
          </Button>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU or item name..."
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
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(0);
              }}
              aria-label="Filter by category"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categoriesData?.content.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <Spinner size="lg" label="Loading items..." />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items found"
            description="Add standard items to your product catalog with unit pricing and reorder levels."
            action={
              <Button onClick={openCreateModal} size="sm">
                Add Catalog Item
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs font-bold text-slate-700">
                      {item.sku}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900">
                        {item.name}
                      </div>
                      {item.description && (
                        <div className="text-xs text-slate-500 truncate max-w-xs">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600">
                      {item.categoryName || "—"}
                    </TableCell>
                    <TableCell className="text-xs font-medium uppercase text-slate-500">
                      {item.unit}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-xs font-mono font-medium text-slate-700">
                      {item.reorderLevel}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.active ? "success" : "secondary"}
                        className="text-[11px]"
                      >
                        {item.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(item)}
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingItem(item);
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
          title={editingItem ? "Edit Catalog Item" : "Add Catalog Item"}
          description="Provide catalog item details, standard unit price, and reorder point."
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
                {editingItem ? "Save Changes" : "Create Item"}
              </Button>
            </>
          }
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {formError && <Alert type="error" message={formError} />}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="SKU / Item Code"
                required
                placeholder="e.g. IT-LAPTOP-001"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
              />

              <Input
                label="Item Name"
                required
                placeholder="e.g. ThinkPad T14 Gen 4"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <Input
              label="Description"
              placeholder="e.g. 16GB RAM, 512GB SSD, Core i7"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Category"
                required
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    categoryId: Number(e.target.value),
                  })
                }
              >
                {categoriesData?.content.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>

              <Input
                label="Unit of Measure"
                required
                placeholder="PCS, BOX, KG"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
              />

              <Input
                label="Unit Price ($)"
                required
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.unitPrice || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unitPrice: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <Input
                label="Reorder Level"
                type="number"
                min="0"
                placeholder="10"
                value={formData.reorderLevel || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reorderLevel: parseInt(e.target.value, 10) || 0,
                  })
                }
                helperText="Alert triggered when warehouse stock falls to or below this level."
              />

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="active-item"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label
                  htmlFor="active-item"
                  className="text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  Active in Catalog
                </label>
              </div>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Catalog Item"
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
                  deletingItem && deleteMutation.mutate(deletingItem.id)
                }
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Are you sure you want to delete item{" "}
            <span className="font-bold text-slate-900">
              {deletingItem?.name} ({deletingItem?.sku})
            </span>
            ? This action cannot be undone.
          </p>
        </Modal>
      </div>
    </RoleGate>
  );
}
