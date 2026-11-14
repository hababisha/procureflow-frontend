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
