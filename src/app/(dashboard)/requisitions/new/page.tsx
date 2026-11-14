"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/axios";
import { Item, PageResponse } from "@/types";
import {
  requisitionFormSchema,
  RequisitionFormData,
} from "@/features/requisitions/schemas";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Calculator,
} from "lucide-react";

export default function NewRequisitionPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  // Default required date to 7 days from today
  const defaultRequiredDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  };

  // Fetch catalog items for selection
  const { data: itemsData } = useQuery<PageResponse<Item>>({
    queryKey: ["items-all"],
    queryFn: async () => {
      const res = await api.get("/items", { params: { size: 200 } });
      return res.data;
    },
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionFormSchema),
    defaultValues: {
      justification: "",
      priority: "MEDIUM",
      requiredDate: defaultRequiredDate(),
      items: [{ itemId: 0, quantity: 1, estimatedUnitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");

  // Calculate estimated total
  const estimatedTotal = (watchedItems || []).reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.estimatedUnitPrice) || 0;
    return acc + qty * price;
  }, 0);

  const handleItemSelect = (index: number, itemId: number) => {
    setValue(`items.${index}.itemId`, itemId);
    const selectedCatalogItem = itemsData?.content.find((i) => i.id === itemId);
    if (selectedCatalogItem) {
      setValue(
        `items.${index}.estimatedUnitPrice`,
        Number(selectedCatalogItem.unitPrice)
      );
    }
  };

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      submitAfter,
    }: {
      data: RequisitionFormData;
      submitAfter: boolean;
    }) => {
      const res = await api.post("/requisitions", data);
      const created = res.data;
      if (submitAfter && created?.id) {
        await api.post(`/requisitions/${created.id}/submit`);
      }
      return created;
    },
    onSuccess: (data) => {
      router.push(`/requisitions/${data.id}`);
    },
    onError: (err: unknown) => {
      setFormError(getErrorMessage(err));
    },
  });

  const onSubmit = (data: RequisitionFormData, submitAfter: boolean) => {
    setFormError(null);
    createMutation.mutate({ data, submitAfter });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/requisitions">
          <Button variant="outline" size="sm" className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            New Purchase Requisition
          </h1>
          <p className="text-sm text-slate-500">
            Specify justification, delivery urgency, and catalog line items.
          </p>
        </div>
      </div>

      {formError && <Alert type="error" message={formError} />}

      <form className="space-y-6">
        {/* Basic Details Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Requisition Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Priority Level"
              required
              {...register("priority")}
              error={errors.priority?.message}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>

            <Input
              label="Required By Date"
              type="date"
              required
              {...register("requiredDate")}
              error={errors.requiredDate?.message}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Business Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              {...register("justification")}
              placeholder="Explain the business need, project context, or urgency..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            {errors.justification && (
              <p className="text-xs text-red-600 font-medium mt-1">
                {errors.justification.message}
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Line Items Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Requested Items
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Add catalog items and quantities to be procured.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ itemId: 0, quantity: 1, estimatedUnitPrice: 0 })
              }
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </Button>
          </div>

          {errors.items?.message && (
            <p className="text-xs text-red-600 font-medium">
              {errors.items.message}
            </p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => {
              const currentItem = watchedItems?.[index];
              const lineSubtotal =
                (Number(currentItem?.quantity) || 0) *
                (Number(currentItem?.estimatedUnitPrice) || 0);

              return (
                <div
                  key={field.id}
                  className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Catalog Item #{index + 1}
                    </label>
                    <select
                      value={currentItem?.itemId || 0}
                      onChange={(e) =>
                        handleItemSelect(index, Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>Select a catalog item...</option>
                      {itemsData?.content.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.sku}) — {formatCurrency(item.unitPrice)}/{item.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      {...register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="w-full sm:w-36">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Unit Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`items.${index}.estimatedUnitPrice`, {
                        valueAsNumber: true,
                      })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="w-full sm:w-32 text-left sm:text-right pt-2 sm:pt-4">
                    <span className="text-[11px] text-slate-400 block uppercase font-medium">
                      Subtotal
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(lineSubtotal)}
                    </span>
                  </div>

                  {fields.length > 1 && (
                    <div className="pt-2 sm:pt-4 self-end sm:self-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grand Total Footer */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>Estimated Requisition Total</span>
            </div>
            <div className="text-xl font-bold text-blue-900">
              {formatCurrency(estimatedTotal)}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <Link href="/requisitions">
            <Button variant="outline">Cancel</Button>
          </Link>

          <Button
            type="button"
            variant="outline"
            isLoading={createMutation.isPending}
            onClick={handleSubmit((data) => onSubmit(data, false))}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save as Draft</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            isLoading={createMutation.isPending}
            onClick={handleSubmit((data) => onSubmit(data, true))}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Submit Requisition</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
