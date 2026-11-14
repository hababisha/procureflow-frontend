"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/axios";
import { Category, CategoryRequest, PageResponse } from "@/types";
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
import { FolderTree, Plus, Search, Edit2, Trash2 } from "lucide-react";

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState<CategoryRequest>({
    name: "",
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data, isLoading } = useQuery<PageResponse<Category>>({
    queryKey: ["categories", { page, search }],
    queryFn: async () => {
      const res = await api.get("/categories", {
        params: { page, size: 10, search: search || undefined },
      });
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: CategoryRequest) => {
      if (editingCategory) {
        return api.put(`/categories/${editingCategory.id}`, payload);
      }
      return api.post("/categories", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setModalOpen(false);
      setEditingCategory(null);
      setAlert({
        type: "success",
        message: `Category ${editingCategory ? "updated" : "created"} successfully.`,
      });
    },
    onError: (err: unknown) => {
      setFormError(getErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setDeleteModalOpen(false);
      setDeletingCategory(null);
      setAlert({ type: "success", message: "Category deleted successfully." });
    },
    onError: (err: unknown) => {
      setAlert({ type: "error", message: getErrorMessage(err) });
      setDeleteModalOpen(false);
    },
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError("Category name is required.");
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
              Item Categories
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Organize catalog inventory items and supplier capabilities by category.
            </p>
          </div>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
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
              placeholder="Search categories by name..."
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
          <Spinner size="lg" label="Loading categories..." />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="No categories found"
            description="Create categories such as IT Equipment, Office Supplies, or Hardware."
            action={
              <Button onClick={openCreateModal} size="sm">
                Add Category
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-mono text-xs text-slate-500">
                      #{cat.id}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {cat.name}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {cat.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(cat)}
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingCategory(cat);
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
          title={editingCategory ? "Edit Category" : "Add New Category"}
          description="Enter the item category name and optional description."
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
                {editingCategory ? "Save Changes" : "Create Category"}
              </Button>
            </>
          }
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {formError && <Alert type="error" message={formError} />}

            <Input
              label="Category Name"
              required
              placeholder="e.g. IT Equipment"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />

            <Input
              label="Description"
              placeholder="e.g. Laptops, monitors, networking gear"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </form>
        </Modal>

        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Category"
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
                  deletingCategory && deleteMutation.mutate(deletingCategory.id)
                }
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Are you sure you want to delete category{" "}
            <span className="font-bold text-slate-900">
              {deletingCategory?.name}
            </span>
            ? This action cannot be undone.
          </p>
        </Modal>
      </div>
    </RoleGate>
  );
}
