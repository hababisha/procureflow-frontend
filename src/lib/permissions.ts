export type Role =
  | "ADMIN"
  | "EMPLOYEE"
  | "DEPARTMENT_MANAGER"
  | "PROCUREMENT_OFFICER"
  | "STORE_KEEPER"
  | "FINANCE_OFFICER";

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: Role[];
  badgeKey?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: "LayoutDashboard",
        roles: [
          "ADMIN",
          "EMPLOYEE",
          "DEPARTMENT_MANAGER",
          "PROCUREMENT_OFFICER",
          "STORE_KEEPER",
          "FINANCE_OFFICER",
        ],
      },
    ],
  },
  {
    title: "Requisitions & Approvals",
    items: [
      {
        title: "Requisitions",
        href: "/requisitions",
        icon: "FileText",
        roles: [
          "ADMIN",
          "EMPLOYEE",
          "DEPARTMENT_MANAGER",
          "PROCUREMENT_OFFICER",
          "FINANCE_OFFICER",
        ],
      },
      {
        title: "Pending Approvals",
        href: "/approvals",
        icon: "CheckSquare",
        roles: ["ADMIN", "DEPARTMENT_MANAGER", "FINANCE_OFFICER"],
      },
    ],
  },
  {
    title: "Procurement",
    items: [
      {
        title: "Quotations",
        href: "/quotations",
        icon: "Tag",
        roles: ["ADMIN", "PROCUREMENT_OFFICER"],
      },
      {
        title: "Purchase Orders",
        href: "/purchase-orders",
        icon: "ShoppingCart",
        roles: [
          "ADMIN",
          "PROCUREMENT_OFFICER",
          "STORE_KEEPER",
          "FINANCE_OFFICER",
        ],
      },
      {
        title: "Suppliers",
        href: "/suppliers",
        icon: "Truck",
        roles: ["ADMIN", "PROCUREMENT_OFFICER"],
      },
    ],
  },
  {
    title: "Warehouse & Inventory",
    items: [
      {
        title: "Receiving",
        href: "/receiving",
        icon: "PackageCheck",
        roles: ["ADMIN", "STORE_KEEPER"],
      },
      {
        title: "Inventory",
        href: "/inventory",
        icon: "Boxes",
        roles: ["ADMIN", "STORE_KEEPER", "DEPARTMENT_MANAGER"],
      },
      {
        title: "Stock Movements",
        href: "/stock-movements",
        icon: "ArrowLeftRight",
        roles: ["ADMIN", "STORE_KEEPER"],
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        title: "Reports",
        href: "/reports",
        icon: "BarChart3",
        roles: [
          "ADMIN",
          "FINANCE_OFFICER",
          "PROCUREMENT_OFFICER",
          "DEPARTMENT_MANAGER",
        ],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Users",
        href: "/admin/users",
        icon: "Users",
        roles: ["ADMIN"],
      },
      {
        title: "Departments",
        href: "/admin/departments",
        icon: "Building2",
        roles: ["ADMIN"],
      },
      {
        title: "Categories",
        href: "/admin/categories",
        icon: "FolderTree",
        roles: ["ADMIN"],
      },
      {
        title: "Catalog Items",
        href: "/admin/items",
        icon: "Package",
        roles: ["ADMIN"],
      },
    ],
  },
];

export function hasPermission(userRole: Role | undefined | null, allowedRoles: Role[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export function getRoleBadgeColor(role: Role | string): string {
  switch (role) {
    case "ADMIN":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "DEPARTMENT_MANAGER":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "FINANCE_OFFICER":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "PROCUREMENT_OFFICER":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "STORE_KEEPER":
      return "bg-cyan-100 text-cyan-800 border-cyan-200";
    case "EMPLOYEE":
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

export function formatRoleName(role: Role | string): string {
  switch (role) {
    case "ADMIN":
      return "System Administrator";
    case "DEPARTMENT_MANAGER":
      return "Department Manager";
    case "FINANCE_OFFICER":
      return "Finance Officer";
    case "PROCUREMENT_OFFICER":
      return "Procurement Officer";
    case "STORE_KEEPER":
      return "Store Keeper";
    case "EMPLOYEE":
      return "Employee";
    default:
      return role;
  }
}
