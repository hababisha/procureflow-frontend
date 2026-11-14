import { z } from "zod";

export const requisitionItemSchema = z.object({
  itemId: z.number().min(1, "Please select an item"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  estimatedUnitPrice: z.number().min(0, "Price must be greater than or equal to 0"),
});

export const requisitionFormSchema = z.object({
  justification: z
    .string()
    .min(5, "Justification must be at least 5 characters")
    .max(500, "Justification cannot exceed 500 characters"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  requiredDate: z.string().min(1, "Required delivery date is required"),
  items: z
    .array(requisitionItemSchema)
    .min(1, "At least one line item is required"),
});

export type RequisitionFormData = z.infer<typeof requisitionFormSchema>;
