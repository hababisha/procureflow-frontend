# ProcureFlow Frontend: Build Instructions

Procurement & Inventory Management System, web client.
Repository: `procureflow-frontend` (replace with your actual repo name).

This client talks to the Spring Boot API described in `BACKEND_INSTRUCTIONS.md`. Build the frontend in phases and commit at the end of each one (see section 13).

---

## 1. Tech Stack (fixed)

| Concern | Technology |
|---|---|
| Framework | **Next.js** (App Router) + TypeScript (replaces plain React + React Router) |
| Routing | Next.js file-based routing (no React Router) |
| Global state | **Zustand** (replaces Redux Toolkit) |
| Server data fetching / caching | **TanStack Query** (replaces RTK Query; PRD allows another documented approach) |
| HTTP client | Axios |
| Forms | React Hook Form + Zod (`@hookform/resolvers`) |
| Styling | Tailwind CSS (recommended; swap if you prefer) |
| Runtime / infra | Node.js, Docker, Docker Compose |

**Intentionally excluded:** automated testing (no Jest, Vitest, React Testing Library, Cypress, or Playwright). Do not install them. Verify by using the app against the running backend.

**Documentation:** the API is documented with Swagger on the backend (`/swagger-ui.html`). Use it as your reference for request and response shapes. Optionally generate TypeScript types from `/v3/api-docs` with `openapi-typescript`.

---

## 2. Project Structure

```
procureflow-frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # sidebar + topbar, role-aware nav
│   │   │   ├── page.tsx                # dashboard
│   │   │   ├── requisitions/           # list, new, [id]
│   │   │   ├── approvals/              # pending approvals queue
│   │   │   ├── suppliers/  quotations/  purchase-orders/
│   │   │   ├── receiving/  inventory/  stock-movements/
│   │   │   ├── reports/
│   │   │   └── admin/                  # users, departments, categories, items
│   │   ├── api/
│   │   │   ├── auth/login/route.ts     # sets httpOnly cookie
│   │   │   ├── auth/logout/route.ts
│   │   │   └── backend/[...path]/route.ts   # authenticated proxy to Spring Boot
│   │   ├── layout.tsx  forbidden/page.tsx  not-found.tsx
│   ├── components/
│   │   ├── ui/                         # Button, Input, Modal, Table, Badge, Pagination...
│   │   ├── forms/                      # RequisitionForm, ReceiptForm...
│   │   └── layout/                     # Sidebar, Topbar, RoleGate
│   ├── features/                       # one folder per module: api.ts, hooks.ts, schemas.ts, types.ts
│   │   ├── auth/ requisitions/ approvals/ suppliers/ purchase-orders/
│   │   ├── receiving/ inventory/ reports/ admin/
│   ├── lib/
│   │   ├── axios.ts                    # configured Axios instance
│   │   ├── queryClient.ts
│   │   └── permissions.ts              # role to nav / action map (UX only)
│   ├── store/
│   │   ├── authStore.ts
│   │   └── filtersStore.ts
│   └── middleware.ts                   # redirect unauthenticated users (UX only)
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. Authentication Flow (secure approach)

Avoid putting the JWT in `localStorage` (readable by any XSS). Use Next.js route handlers as a thin proxy:

1. **Login:** the login form posts to `POST /api/auth/login` (a Next route handler). The handler calls the Spring API `POST /api/auth/login`, receives the JWT, and stores it in an **httpOnly, Secure (in prod), SameSite=Lax** cookie. It returns only the user info (id, name, role, department) to the browser.
2. **API calls:** the browser's Axios instance uses `baseURL: "/api/backend"`. The catch-all route handler `app/api/backend/[...path]/route.ts` reads the cookie, forwards the request (method, query, body, `Idempotency-Key` header) to `BACKEND_URL` with `Authorization: Bearer <token>`, and passes the response and status code back unchanged.
3. **Session restore:** on app load, call `GET /api/backend/auth/me` and put the result into the auth store. If it returns 401, clear the store and redirect to `/login`.
4. **Logout:** `POST /api/auth/logout` clears the cookie and the Zustand auth store.
5. **Axios interceptor:** on a 401 response, clear the auth store and redirect to `/login`. On 403, show a "not permitted" message.

`middleware.ts` checks that the cookie exists for dashboard routes and redirects to `/login` otherwise. **This is a convenience only.** The backend is the real security boundary.

> Security reminder from the PRD: route guards and hidden buttons improve UX but are not security. Never assume the UI prevented an action. Always handle 401/403/404/409/422 responses from the backend and show their messages.

---

## 4. State Management (explain every choice)

| State | Where it lives | Why |
|---|---|---|
| Modal open/closed, active tab, dropdown open, selected row | `useState` (local) | Only one component cares, and it dies with the component |
| Form field values and validation errors | React Hook Form + Zod | Purpose-built, avoids re-render storms, validated per field |
| Authenticated user, role, department | Zustand `authStore` | Needed by many unrelated components (nav, guards, buttons) |
| Shared filters (for example selected date range, department, status reused across dashboard and reports) | Zustand `filtersStore` | Shared across pages, survives navigation |
| Requisitions, POs, inventory, reports, suppliers (anything from the API) | TanStack Query cache | It is server state: needs caching, refetching, loading and error states, invalidation after mutations |
| List page, page size, sort, search text on a single list | URL search params (`useSearchParams`) | Shareable and bookmarkable, and back button works |

**Do not** put every variable in Zustand, and never copy API data into Zustand. Include a short `docs/state-management.md` in the repo explaining these decisions (the PRD requires it).

Example stores:

```ts
// store/authStore.ts
import { create } from "zustand";

type Role = "ADMIN" | "EMPLOYEE" | "DEPARTMENT_MANAGER"
  | "PROCUREMENT_OFFICER" | "STORE_KEEPER" | "FINANCE_OFFICER";

interface AuthState {
  user: { id: number; fullName: string; role: Role; departmentId: number } | null;
  setUser: (u: AuthState["user"]) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clear: () => set({ user: null }),
}));
```

Do not persist the auth user to localStorage. Re-fetch `/auth/me` on load. Only `filtersStore` may use Zustand's `persist`, and only for non-sensitive values.

---

## 5. Pages by Role

| Role | Pages / actions |
|---|---|
| EMPLOYEE | Dashboard, My Requisitions, New/Edit Requisition (DRAFT), submit, track status and approval history |
| DEPARTMENT_MANAGER | Department requisitions, **Pending Approvals** (approve / reject with reason), department stats |
| FINANCE_OFFICER | Pending finance approvals (shows department budget remaining), reports |
| PROCUREMENT_OFFICER | Suppliers, Quotations (add, compare side by side, select), Create Purchase Order, PO list (outstanding/completed) |
| STORE_KEEPER | Receiving (pick PO, enter received/accepted quantities, delivery note no.), Inventory, Issue to Department, Stock Movements, Low-stock |
| ADMIN | Users, Departments, Categories, Items, all of the above read access |

Navigation items and action buttons are filtered with `permissions.ts` and a `<RoleGate roles={[...]}>` component. This hides what the user cannot do, but the backend still enforces it.

---

## 6. Key Screens and Behaviours

**Requisition form** (React Hook Form + `useFieldArray` for line items)

- Fields: justification, priority, required delivery date, line items (item, quantity, estimated unit price), auto-computed total.
- Zod schema: at least one line item, quantity is an integer greater than 0, price is 0 or more, date is today or later, justification is required.
- Save as draft and submit as separate buttons.

**Approval screen**

- Shows the requisition details, line items and the full approval timeline (actor, timestamp, decision, comment).
- Approve (optional comment) and Reject (comment **required**, enforced in the Zod schema and by the backend).
- After a mutation, invalidate the related TanStack Query keys so the list and details refresh.

**Receiving screen (critical)**

- Generate a UUID with `crypto.randomUUID()` **when the form opens** and send it as the `Idempotency-Key` header on submit. Keep the same key if the user retries after a network error. Create a new key only for a genuinely new receipt.
- Disable the submit button while the request is in flight, to avoid accidental double clicks. This is only UX. The backend idempotency is what truly prevents duplicates.
- Show the backend's response clearly: success, "already received" (409), or over-receipt (422).

**Lists (every table)**

- Server-side pagination, sorting, search and filters using URL params and the backend's `page`, `size`, `sort`, `search`, `status` parameters.
- Loading skeletons, empty states, and error states on every list.

**Dashboard and reports**

- Cards: total requisitions, pending approvals, total POs, outstanding orders, expenditure for the selected period, inventory valuation, low-stock count.
- Charts (Recharts): spend over time, requisitions by status, spend by department/supplier.
- Report filters: date range, department, supplier, status, category (kept in `filtersStore`).

---

## 7. Forms and Validation

- Every form uses React Hook Form with `zodResolver`. Keep schemas in `features/<module>/schemas.ts`.
- Infer types from schemas: `type RequisitionInput = z.infer<typeof requisitionSchema>`.
- Map backend `fieldErrors` from the standard error body onto form fields with `setError`.
- Frontend validation is for user experience only. The backend validates everything again.

Standard backend error shape to handle:

```ts
interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors?: { field: string; message: string }[];
}
```

---

## 8. Data Fetching Pattern (TanStack Query)

```ts
// features/requisitions/hooks.ts
export const useRequisitions = (params: ListParams) =>
  useQuery({
    queryKey: ["requisitions", params],
    queryFn: () => api.get("/requisitions", { params }).then(r => r.data),
    placeholderData: keepPreviousData,
  });

export const useApproveRequisition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment?: string }) =>
      api.post(`/requisitions/${id}/approve`, { comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requisitions"] }),
  });
};
```

Use consistent query-key conventions per module (`["requisitions"]`, `["requisitions", id]`, `["inventory"]`, ...). Wrap the app in `QueryClientProvider` inside a client `Providers` component in `app/layout.tsx`.

---

## 9. Environment Variables

```env
# .env.example
BACKEND_URL=http://localhost:8080          # server-side only, used by route handlers
NEXT_PUBLIC_APP_NAME=ProcureFlow
```

- `BACKEND_URL` has no `NEXT_PUBLIC_` prefix on purpose: it stays on the server.
- In Docker Compose use the service name, for example `BACKEND_URL=http://api:8080`.
- Commit only `.env.example`. `.env`, `.env.local`, `.next/`, `node_modules/`, and `*.log` go in `.gitignore`.

---

## 10. Docker

- `next.config.ts`: set `output: "standalone"`.
- `Dockerfile`: multi-stage (deps, build, slim runner using `node:20-alpine`, non-root user, `CMD ["node", "server.js"]`).
- `docker-compose.yml`: a `web` service on port 3000 that loads `.env`. For a fully integrated run, document how to join the backend's Compose network, or provide a root-level compose file in a small third location (or in the README) that starts `db`, `api`, and `web` together.
- The app must start with `docker compose up --build`.

---

## 11. UI and Quality Guidelines

- Reusable components in `components/ui`: Button, Input, Select, Modal, Table, Badge (status colors), Pagination, EmptyState, Spinner, Toast.
- Status badges for every workflow stage: DRAFT, SUBMITTED, MANAGER_APPROVAL, FINANCE_APPROVAL, PROCUREMENT, ORDERED, RECEIVED, COMPLETED, REJECTED.
- Responsive layout (usable on a tablet), accessible labels, keyboard-friendly modals.
- Use Server Components for static layout and Client Components (`"use client"`) for anything using hooks, forms, or stores.
- No `any` in TypeScript. Keep ESLint clean (`npm run lint`) before every commit.

---

## 12. Build Order (phases)

1. **Foundation:** `create-next-app` (TypeScript, App Router, Tailwind, ESLint, src dir), folder structure, Docker, `.env.example`.
2. **Auth:** login page, route handlers (login, logout, proxy), Axios instance, auth store, `/auth/me`, middleware, layout with role-aware sidebar.
3. **Shared UI kit:** table with pagination, modal, badges, toast, empty/loading states.
4. **Admin and master data:** users, departments, categories, items, suppliers.
5. **Requisitions:** list with filters, create/edit form with line items, detail page with timeline, submit.
6. **Approvals:** manager and finance queues, approve/reject dialogs.
7. **Procurement:** quotations (compare and select), purchase order creation and list.
8. **Receiving and inventory:** receiving form with idempotency key, inventory list, issue form, stock movements, low-stock.
9. **Dashboard and reports.**
10. **Polish:** error handling pass, `docs/state-management.md`, README.

---

## 13. Git and GitHub

**Setup (once)**

```bash
cd procureflow-frontend
npx create-next-app@latest . --typescript --eslint --tailwind --src-dir --app --use-npm
git init -b main            # skip if create-next-app already initialized git
git remote add origin https://github.com/<your-username>/<frontend-repo>.git
git add .
git commit -m "chore: initialize Next.js project with TypeScript and Tailwind"
git push -u origin main
```

**Branching:** `main` always builds. One branch per feature from `main` (`feat/auth-flow`, `feat/requisition-form`, `feat/receiving-screen`, `fix/table-pagination`). Merge via Pull Request with a short description, and delete the branch afterwards.

**Commit messages:** Conventional Commits, small and focused.

```
feat(auth): add login page and httpOnly cookie route handlers
feat(requisitions): add requisition form with dynamic line items
feat(approvals): add approve and reject dialogs with required reason
feat(receiving): send idempotency key when submitting goods receipt
fix(inventory): correct low-stock badge threshold
style(ui): align table spacing and status badge colors
chore(docker): add standalone Dockerfile and compose file
docs: add state management explanation
```

**Suggested milestones** (push at least daily)

1. Project setup and Docker
2. Auth and layout
3. UI kit
4. Admin and master data
5. Requisitions
6. Approvals
7. Procurement (quotations, POs)
8. Receiving and inventory
9. Dashboard and reports
10. Docs and final cleanup

**Rules**

- Never commit `.env*` files (except `.env.example`), `node_modules`, or `.next`.
- Run `npm run lint` and `npm run build` before opening a PR.
- Do not commit the `package-lock.json` selectively. Commit it alongside any dependency change in the same commit.
- Tag the finished version: `git tag -a v1.0.0 -m "ProcureFlow frontend v1.0.0" && git push origin v1.0.0`.

**README must contain:** overview, stack, how to run locally (`npm install`, `cp .env.example .env.local`, `npm run dev`) and with Docker, required backend URL, demo accounts per role (from the backend seed data), and a link to `docs/state-management.md`.

---

## Definition of Done

- [ ] Each role sees only its own navigation and actions
- [ ] Employee creates and submits a multi-line requisition
- [ ] Manager and finance approve/reject (reason required on reject)
- [ ] Procurement compares quotations and issues a PO
- [ ] Storekeeper receives goods with an idempotency key, and a double submit is harmless
- [ ] Reports and dashboard render with filters
- [ ] All 401/403/404/409/422 backend errors produce readable messages
- [ ] `docker compose up --build` starts the app from a clean clone
