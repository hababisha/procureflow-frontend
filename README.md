# ProcureFlow Web Client

Enterprise Procurement & Inventory Management System web frontend built with **Next.js 14 (App Router)**, **TypeScript**, and **Tailwind CSS**.

This frontend client interacts with the Spring Boot API service. It features full role-based access control (RBAC), multi-stage requisition pipelines, quotation comparison, official purchase order issuance, transactional goods receipt with duplicate submission protection via UUID idempotency keys, and real-time inventory management.

---

## 1. Technology Stack

| Concern | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) + TypeScript |
| **Styling** | Tailwind CSS + Lucide Icons |
| **Global Session & Filter State** | Zustand |
| **Server Data Caching** | TanStack Query v5 |
| **HTTP Client** | Axios (routed through Next.js proxy route handlers) |
| **Forms & Validation** | React Hook Form + Zod (`@hookform/resolvers`) |
| **Visual Analytics & Charts** | Recharts |
| **Containerization** | Docker (multi-stage build) + Docker Compose |

For a comprehensive explanation of how state is structured across the client, see the [State Management Guide](docs/state-management.md).

---

## 2. Key Architecture & Features

- **Secure Session Management:** The authentication flow uses Next.js Route Handlers (`/api/auth/login`) as a secure proxy that stores the Spring Boot JWT inside an `httpOnly, Secure, SameSite=Lax` cookie. Client scripts cannot access the raw token, protecting against XSS exploitation.
- **Backend API Proxy:** The catch-all route handler (`/api/backend/[...path]`) proxies API calls to the Spring Boot backend (`BACKEND_URL`), automatically attaching the bearer token and forwarding required headers such as `Idempotency-Key`.
- **Role-Based Access Control (RBAC):** Navigation and interface actions are filtered using `<RoleGate />` components corresponding to the 6 system roles: `ADMIN`, `EMPLOYEE`, `DEPARTMENT_MANAGER`, `FINANCE_OFFICER`, `PROCUREMENT_OFFICER`, and `STORE_KEEPER`.
- **Dynamic Requisition Form:** Built using `react-hook-form` and `useFieldArray` to support dynamic line items with automated line subtotals and real-time total order calculations.
- **Idempotency-Protected Goods Receiving:** Generates a standard UUID `Idempotency-Key` when the receiving form is initialized. If network disruptions occur, retrying with the same key guarantees that backend stock levels are not duplicated.
- **Live Inventory & Department Issues:** Track warehouse stock levels, receive automated low-stock warnings when inventory drops below reorder thresholds, and issue items to internal departments with an append-only audit trail.

---

## 3. Demo Accounts & Credentials

The system comes pre-seeded with 6 role-based demo accounts. All accounts use the standard password:

> **Password:** `password123`

| Role | Email | Responsibilities |
|---|---|---|
| **System Administrator** | `admin@procureflow.com` | Full master data management (users, departments, categories, items) and universal oversight. |
| **Employee (IT)** | `employee@procureflow.com` | Create, edit, and track department purchase requisitions. |
| **Department Manager** | `manager@procureflow.com` | Department requisition review, approval, and rejection with mandatory comments. |
| **Finance Officer** | `finance@procureflow.com` | Financial budget compliance review and procurement spend analytics. |
| **Procurement Officer** | `procurement@procureflow.com` | Supplier directory, quotation requests & comparisons, and Purchase Order issuance. |
| **Store Keeper** | `storekeeper@procureflow.com` | Idempotent goods receiving, warehouse inventory balance management, and department stock issuing. |

*(Quick-fill buttons are provided directly on the login screen for one-click access.)*

---

## 4. Getting Started Locally

### Prerequisites
- Node.js `v18.19.0` or later
- npm `9.x` or later
- The ProcureFlow Spring Boot backend running on `http://localhost:8080`

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Environment Configuration
Create your local environment file:
```bash
cp .env.example .env.local
```

Ensure `.env.local` contains:
```env
BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=ProcureFlow
```

### Step 3: Run the Development Server
```bash
npm run dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 5. Running with Docker

### Standalone Docker Run
To build and run the Next.js standalone container:
```bash
docker build -t procureflow-web .
docker run -p 3000:3000 -e BACKEND_URL=http://host.docker.internal:8080 procureflow-web
```

### Running with Docker Compose
```bash
docker compose up --build
```

---

## 6. Build & Quality Verification

Before opening pull requests or deploying, verify that linting and production builds pass with zero errors:

```bash
# Run ESLint validation
npm run lint

# Compile Next.js production standalone bundle
npm run build
```

---

## 7. Documentation
- [State Management Architecture](docs/state-management.md)
- [Backend Instructions](../procureflow-backend/BACKEND_INSTRUCTIONS.md)
- [Product Requirements Document (PRD)](../prd.md)
