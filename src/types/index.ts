import { Role } from "@/lib/permissions";

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  budget: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentRequest {
  name: string;
  code?: string;
  budget?: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface CategoryRequest {
  name: string;
  description?: string;
}

export interface Item {
  id: number;
  sku: string;
  name: string;
  description?: string;
  categoryId: number;
  categoryName?: string;
  unit: string;
  unitPrice: number;
  reorderLevel: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemRequest {
  sku: string;
  name: string;
  description?: string;
  categoryId: number;
  unit: string;
  unitPrice: number;
  reorderLevel: number;
  active?: boolean;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  departmentId: number;
  departmentName?: string;
  enabled: boolean;
  createdAt?: string;
}

export interface UserRequest {
  fullName: string;
  email: string;
  password?: string;
  role: Role;
  departmentId?: number;
  enabled?: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
  notes?: string;
  categoryIds?: number[];
  categoryNames?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierRequest {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  notes?: string;
  categoryIds?: number[];
}

export interface SupplierPurchaseHistory {
  purchaseOrderId: number;
  poNumber: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  itemCount: number;
}

export interface RequisitionItem {
  id?: number;
  itemId: number;
  itemSku?: string;
  itemName?: string;
  itemUnit?: string;
  quantity: number;
  estimatedUnitPrice: number;
  subtotal?: number;
}

export interface Requisition {
  id: number;
  requisitionNumber: string;
  employeeId: number;
  employeeName: string;
  departmentId: number;
  departmentName: string;
  justification: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  requiredDate: string;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "MANAGER_APPROVAL"
    | "FINANCE_APPROVAL"
    | "PROCUREMENT"
    | "ORDERED"
    | "RECEIVED"
    | "COMPLETED"
    | "REJECTED";
  version: number;
  estimatedTotal: number;
  items: RequisitionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface RequisitionRequest {
  justification: string;
  priority: string;
  requiredDate: string;
  items: {
    itemId: number;
    quantity: number;
    estimatedUnitPrice: number;
  }[];
}

export interface Approval {
  id: number;
  requisitionId: number;
  stage: string;
  decision: "APPROVED" | "REJECTED";
  actorId: number;
  actorName: string;
  comment?: string;
  createdAt: string;
}

export interface Quotation {
  id: number;
  requisitionId: number;
  supplierId: number;
  supplierName: string;
  totalAmount: number;
  validUntil?: string;
  selected: boolean;
  notes?: string;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
}

export interface QuotationRequest {
  supplierId: number;
  totalAmount: number;
  validUntil?: string;
  notes?: string;
}

export interface PurchaseOrderItem {
  id: number;
  itemId: number;
  itemSku: string;
  itemName: string;
  itemUnit: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  requisitionId: number;
  requisitionNumber: string;
  supplierId: number;
  supplierName: string;
  quotationId?: number;
  status: "ORDERED" | "RECEIVED" | "COMPLETED" | "CANCELLED";
  expectedDeliveryDate?: string;
  totalAmount: number;
  createdById: number;
  createdByName: string;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderRequest {
  requisitionId: number;
  supplierId?: number;
  quotationId?: number;
  expectedDeliveryDate?: string;
  items?: {
    itemId: number;
    quantity: number;
    unitPrice?: number;
  }[];
}
