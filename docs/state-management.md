# ProcureFlow Frontend: State Management Architecture

This document articulates the state management strategy implemented across the ProcureFlow web client. In accordance with the project instructions and PRD requirements, each state category is placed in its optimal runtime scope rather than forcing all variables into a single global store.

---

## State Taxonomy & Placement

| State Category | Storage Location | Rationale |
|---|---|---|
| **Ephemeral UI State** | React `useState` (Local Component) | Modals (open/closed), active tabs, dropdown open states, and selected row highlights only matter to the local view and should terminate when the component unmounts. |
| **Form Data & Validation** | React Hook Form + Zod (`@hookform/resolvers`) | Form inputs require high-frequency updates, schema validation, and field-level error messages. Using React Hook Form avoids re-render storms across ancestor components and provides strict type safety via Zod schema inference. |
| **User Session & RBAC** | Zustand (`useAuthStore`) | The authenticated user's ID, full name, role, and department are needed across disparate components (navigation bars, layout guards, role gates). The JWT token itself is kept securely in an `httpOnly` cookie and never placed in client state. Re-fetched from `/api/backend/auth/me` on app load. |
| **Cross-Page Filters** | Zustand (`useFiltersStore`) | Shared analytics filters (e.g. date range, department selection, supplier filter) need to survive navigation between the dashboard, executive reports, and audit logs. Non-sensitive filters are retained across views. |
| **Server Entity State** | TanStack Query (`useQuery`, `useMutation`) | API entities (Requisitions, Purchase Orders, Catalog Items, Inventory Balances, Goods Receipts, Supplier records) represent server state. TanStack Query manages caching, automatic refetching, background revalidation, loading spinners, error states, and cache invalidation upon mutation. API entities are never duplicated into Zustand. |
| **List Navigation & Search** | URL Search Parameters (`useSearchParams`) | Table page index, page size, sort order, and keyword search strings live in the URL to enable bookmarkable links, browser history back/forward navigation, and deep linking. |

---

## Detailed Implementation Rationale

### 1. Ephemeral UI State (`useState`)
Components like `<Modal />`, `<Table />`, or `<Select />` encapsulate their internal UI state. For instance:
- `isOpen` and `isDeleteModalOpen` in admin pages.
- `selectedTab` in executive reports.
- `receivedQuantities` in the receiving checklist before final submission.

Placing these in global state would cause unnecessary coupling and memory retention across page unmounts.

### 2. Form State (React Hook Form + Zod)
Every data-entry workflow (such as multi-line purchase requisitions, supplier registrations, or catalog updates) utilizes `react-hook-form` with a Zod schema:
- **Performance:** Form inputs update uncontrolled or via isolated subscriptions, avoiding re-renders of entire page trees.
- **Dynamic Line Items:** The requisition form utilizes `useFieldArray` to seamlessly append, edit, and remove line items while calculating dynamic order totals.
- **Backend Error Mapping:** Field errors returned by Spring Boot's standard error response body (`fieldErrors: [{ field, message }]`) are directly mapped back onto form controls.

### 3. Global Authentication (`useAuthStore`)
The client avoids storing raw JWT tokens in `localStorage` or `sessionStorage` to mitigate Cross-Site Scripting (XSS) risks:
- The Next.js Route Handler (`/api/auth/login`) securely stores the JWT in an `httpOnly`, `SameSite=Lax` cookie.
- The browser application only stores the non-sensitive user identity object (`id`, `fullName`, `email`, `role`, `departmentId`, `departmentName`) in the in-memory Zustand store.
- On cold application launch, `Providers` triggers a call to `/api/backend/auth/me` to hydrate the session. If the token is missing or expired (401), the store is purged and the user is redirected to `/login`.

### 4. Shared Analytic Filters (`useFiltersStore`)
When an executive or finance officer selects a custom date range (e.g., Q4 fiscal year) on the dashboard, navigating to the Reports page maintains the same filter context. Placing this in `filtersStore` decouples the filter toolbar from individual route components while keeping server query keys synchronized.

### 5. Server State & Caching (TanStack Query)
All data retrieved from the Spring Boot API is managed through TanStack Query:
- **Consistent Query Keys:** Normalized keys such as `["requisitions", { page, search, status }]`, `["purchase-orders"]`, `["inventory"]`, and `["suppliers"]`.
- **Atomic Cache Invalidation:** When an action mutates state (e.g. approving a requisition, recording a goods receipt, or adjusting inventory count), `queryClient.invalidateQueries` immediately invalidates dependent keys, ensuring UI consistency without manual store synchronization.
- **Idempotency Protection:** The goods receiving process leverages dedicated mutation states to prevent double submissions while keeping the generated UUID idempotency key steady across retries.
