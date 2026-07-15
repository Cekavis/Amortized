# Amortized Project Specification

Last updated: 2026-07-15

This document is the source of truth for building Amortized from an empty
repository. Future agents should be able to implement the application without
needing additional product context.

## 1. Product Summary

Amortized is a centralized self-hosted web application for tracking personal
assets, purchase cost, usage duration, resale value, and category-level daily
amortized cost.

The core user question is:

> I own these things. Given what I paid, how long I have used them, and what I
> sold them for, how is my known net cost allocated per day today and
> historically?

Confirmed product defaults:

- Product name: `Amortized`.
- Deployment model: centralized Docker deployment on one server or local machine.
- UI language: Simplified Chinese.
- Currency: CNY only for v1.
- Account model: multi-account, private per-user data.
- Registration model: closed registration.
- Amortization model: user-selected average or logarithmic current-known net
  cost backfill; average is the default.
- GitHub repository visibility: public.
- Initial app version: `0.1.0`.

## 2. Repository State And Local Tooling

The repository currently starts as an empty Git repository:

- Path: `/Users/xuechang/Documents/Amortized`.
- Branch: `main`.
- Initial state: no commits yet.
- No application framework, README, Docker files, or package manifests exist at
  the time this spec is written.

Observed local tooling:

- Docker CLI: `/usr/local/bin/docker`.
- Docker Compose: `/usr/local/bin/docker compose`.
- Observed Compose version: `v5.1.2`.
- GitHub CLI: `/opt/homebrew/bin/gh`.
- `gh` may not be on the default sandbox `PATH`; use the absolute path above.
- Node.js and pnpm can be used from the Codex bundled runtime if system Node is
  missing:
  - Node: `/Users/xuechang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`
  - pnpm: `/Users/xuechang/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm`

If a future implementation agent needs network access for package installation,
GitHub, or Docker image pulls and the sandbox blocks it, request escalation
instead of silently changing the implementation strategy.

## 3. Required Technology Stack

Implement the application with this stack unless the user explicitly changes the
spec:

- Framework: Next.js App Router.
- Language: TypeScript.
- Styling: Tailwind CSS.
- Component system: shadcn/ui.
- Charts: Recharts.
- ORM: Prisma.
- Database: PostgreSQL.
- Authentication: Auth.js with credentials-based login.
- Deployment: Docker Compose.
- Package manager: pnpm.

Recommended supporting libraries:

- Zod for input validation and form schemas.
- React Hook Form for asset/category/user forms.
- date-fns or Temporal-compatible helpers for date calculations.
- bcrypt or argon2 for password hashing.
- next-themes for light/dark theme switching.
- Vitest for unit tests.
- Playwright for end-to-end and visual workflow tests.

## 4. Deployment Architecture

The application must be deployable through Docker Compose with at least two
services:

- `app`: the Next.js production server.
- `postgres`: PostgreSQL database with a persistent Docker volume.

The Compose setup must:

- Build the app image from a repository `Dockerfile`.
- Persist database data in a named Docker volume.
- Expose the web app on a configurable host port.
- Use environment variables for database URL, auth secret, initial setup flags,
  and public app URL.
- Include health checks where practical.
- Avoid committing real secrets.

Required files for the future implementation:

- `Dockerfile`
- `docker-compose.yml` or `compose.yml`
- `.env.example`
- `README.md`
- Prisma schema and migrations
- Seed/setup script or first-run setup flow

Production deployment command for this machine:

```sh
/usr/local/bin/docker compose up -d --build
```

The app should continue to work after container restart, with user data retained
through the PostgreSQL volume.

## 5. Authentication And Account Model

Amortized is multi-account and privacy-first.

### 5.1 Registration

Registration is closed by default.

Required behavior:

- On first launch, if no users exist, the app allows creation of the first
  administrator account.
- After the first administrator exists, public self-registration is disabled.
- Administrators can create or invite additional users.
- v1 does not need email delivery. If invitation UX is implemented, it may show
  a one-time setup link/token directly in the admin UI.

### 5.2 Roles

Minimum roles:

- `admin`: can manage user accounts and app setup.
- `user`: can manage only their own categories and assets.

Admin privacy rule:

- Administrators do not automatically view or edit other users' asset data.
- Admin permissions in v1 are for account management, not global asset browsing.

### 5.3 Data Isolation

Every category and asset belongs to exactly one user.

Required access control:

- A user can list, create, update, and delete only their own assets.
- A user can list, create, update, and delete only their own categories.
- Server-side queries must always scope category and asset operations by the
  authenticated user's `userId`.
- Client-side filtering is not sufficient for security.

## 6. Domain Model

Use clear database names. The exact Prisma syntax may vary, but the schema must
preserve these relationships and constraints.

### 6.1 User

Required fields:

- `id`
- `email` or `username`
- `passwordHash`
- `name`
- `role`
- `amortizationModel` (`average` or `logarithmic`, default `average`)
- `createdAt`
- `updatedAt`

Constraints:

- Login identifier must be unique.
- Passwords must never be stored in plaintext.

### 6.2 Category

Required fields:

- `id`
- `userId`
- `name`
- `color`
- `sortOrder`
- `createdAt`
- `updatedAt`

Rules:

- Only one category level is supported.
- Nested categories are out of scope for v1.
- Category name must be unique per user.
- Each category belongs to exactly one user.
- A category may have many assets.

Deletion behavior:

- Do not allow deleting a category that still has assets unless the UI requires
  the user to move those assets to another category in the same transaction.
- Never leave assets without a category.

### 6.3 Asset

Required fields:

- `id`
- `userId`
- `categoryId`
- `name`
- `priceCents`
- `startDate`
- `endDate`
- `isActive`
- `soldPriceCents`
- `createdAt`
- `updatedAt`

Rules:

- Every asset belongs to exactly one user.
- Every asset belongs to exactly one category.
- `priceCents` is required and must be an integer number of cents.
- `soldPriceCents` is optional in the UI but should be normalized as `0` or
  `null` consistently in the database. Calculation code must treat missing sold
  price as `0`.
- `startDate` is required.
- `endDate` is optional. If absent, the asset is still in use.
- If `endDate` exists, it must not be before `startDate`.
- `isActive` should be derived from `endDate` where possible. If stored, keep it
  consistent with `endDate`.
- Category ownership must match asset ownership.

Optional but useful v1 fields:

- `notes`
- `purchaseDate`
- `brand`
- `model`
- `serialNumber`
- `imageUrl` or attachment placeholder

Do not implement multi-currency in v1.

## 7. Money And Date Semantics

### 7.1 Money

Currency:

- v1 supports only CNY.
- UI displays values as RMB with two decimal places.
- Database stores money as integer cents.
- Avoid floating-point storage for money.

Formatting examples:

- `123456` cents -> `¥1,234.56`
- `0` cents -> `¥0.00`
- Negative amortized values are allowed if resale exceeds purchase price.

### 7.2 Dates

Timezone:

- Use `Asia/Shanghai` for natural-day semantics.

Rules:

- `startDate` and `endDate` are dates, not date-times from the user's point of
  view.
- Usage day ranges are inclusive.
- If `endDate` is missing, the active range ends at today's date in
  `Asia/Shanghai`.
- Active day count must be at least `1`.

Example:

- Start: 2026-07-01
- End: 2026-07-01
- Active days: 1

## 8. Amortization Rules

This section is critical. Do not change the calculation model without explicit
user approval.

### 8.1 User-Level Model Selection

The amortization model belongs to the user, not to an asset. Each user selects
one of:

- `average`: equal allocation across usage days; this is the default.
- `logarithmic`: higher allocation near the start date, declining by natural
  logarithm.

The Dashboard must provide two compact controls near the top for switching the
current user's model. The choice is persisted and applies consistently to that
user's Dashboard aggregates, asset list values, and daily-cost sorting.

### 8.2 Per-Asset Calculation

Definitions:

- `grossCostCents = priceCents`
- `soldPriceCentsForCalculation = soldPriceCents ?? 0`
- `netCostCents = priceCents - soldPriceCentsForCalculation`
- `activeEndDate = endDate ?? today(Asia/Shanghai)`
- `n = inclusiveDays(startDate, activeEndDate)`, minimum `1`
- `i = inclusiveDays(startDate, date)` for a date inside the active range

Allocated daily cost may be fractional in calculation results. Store money
inputs as integer cents, keep calculation and aggregation values unrounded, and
round only when displaying.

### 8.3 Model Formulas

Average allocation:

```text
d_i = netCostCents / n
```

Logarithmic allocation, using the natural logarithm (`Math.log`):

```text
w_i = ln(n / i) + 1
Z_n = sum(j = 1..n, ln(n / j) + 1)
d_i = netCostCents * w_i / Z_n
```

The weights cover the asset's complete current-known usage range. A chart that
shows only part of that range must not renormalize the visible days. Build the
per-asset denominator once, then reuse it for each requested date.

### 8.4 Historical Backfill Model

Historical charts use current-known net cost backfill.

For each asset:

1. Compute its current-known net cost.
2. Compute its current-known active day range.
3. Allocate the net cost across every active usage day with the user's selected
   model.
4. Add each date's allocated amount to the historical series.

Implications:

- If an asset is sold later, historical daily cost for that asset is recalculated
  using `purchase price - sold price`.
- Historical charts may change when the user edits price, dates, category, or
  sold price.
- For an active asset, advancing today changes `n` and therefore recalculates
  its complete history. An ended asset is unaffected by later dates.
- This is intentional current-known net cost backfill. UI copy must not describe
  it as market value, residual value, or a price forecast.

### 8.5 Category Aggregation

For a date range:

- Include an asset on a date if the date is within its inclusive active range.
- Group each asset's daily cost under the asset's current category.
- Dashboard totals are the sum of the user's own assets only.

If future category history is needed, that is a new feature. v1 can use the
asset's current category for historical aggregation.

### 8.6 Edge Cases

Required handling:

- Same-day usage: active days = 1.
- Still in use: end date = today's date for calculations.
- Sold price missing: use 0.
- Sold price equals purchase price: net daily cost is 0.
- Sold price greater than purchase price: net daily cost is negative.
- Price 0: allowed only if the UI intentionally supports free items; if allowed,
  daily cost is 0.
- A one-day range has `n = 1`; both models allocate the entire net cost that day.
- Invalid date ranges must be rejected before saving.

## 9. Required Views And UX

The UI must work well on both phones and desktop screens. It should feel modern,
calm, and suitable for repeated personal finance usage.

Use shadcn/ui components and Tailwind tokens consistently. Avoid a decorative
marketing landing page. The first authenticated screen should be the actual
dashboard.

### 9.1 Unauthenticated Screens

Required:

- Login page.
- First-admin setup page when no users exist.
- Clear locked-registration state after setup exists.

Optional:

- Password reset is out of scope for v1 unless local admin reset tooling is
  added.

### 9.2 App Shell

Required:

- Responsive navigation for desktop and mobile.
- Dashboard route.
- Assets route.
- Categories route.
- Admin/user management route visible only to admins.
- Theme toggle for light/dark mode.
- Current user menu with sign out.

### 9.3 Dashboard

At minimum, show:

- Today's total daily amortized cost.
- Change or comparison against a recent period if easy to compute.
- Category breakdown for today's daily cost.
- Historical daily total chart.
- Category stacked chart or category share chart.
- A compact list/table of assets with each asset's current daily cost.

The top of the Dashboard must also provide a compact average/logarithmic model
switch. All totals, comparisons, history, category breakdowns, and asset ranks
must use the selected user model. Explain charts as current-known net cost
backfill, not asset valuation.

Chart design may be richer than the minimum, but must preserve the calculation
model in this spec.

Suggested dashboard controls:

- Date range selector: 30 days, 90 days, 1 year, all time.
- Category filter.
- Active/ended asset filter.

### 9.4 Assets Management

Required:

- List assets.
- Create asset.
- Edit asset.
- Delete asset.
- Filter by category.
- Filter by active vs ended.
- Sort by start date, price, daily cost, and name.
- Display category, price, start date, end/active status, sold price, and daily
  cost, with the current user's allocation model identified. For active assets,
  show today's allocation; for ended assets, show the end-date allocation.

Asset form fields:

- Name
- Category
- Price
- Start usage date
- Status: still in use or ended
- End usage date when ended
- Sold price, optional

Validation:

- Name required.
- Category required.
- Price required and valid CNY amount.
- Start date required.
- End date cannot be before start date.
- Sold price must be a valid amount if provided.

### 9.5 Categories Management

Required:

- List categories.
- Create category.
- Edit category.
- Delete category when safe.
- Show asset count per category.
- Choose category color.
- Set or adjust sort order.

Validation:

- Name required.
- Name unique per user.
- Color required or defaulted.

### 9.6 Admin User Management

Required for admins:

- List users.
- Create a user or generate an invite/setup token.
- Set role.
- Disable or delete users only if implemented safely.

Do not expose other users' assets in v1 admin screens.

## 10. API And Server Behavior

The implementation may use Server Actions, Route Handlers, or a combination.
Regardless of transport, server behavior must satisfy these contracts:

- All mutations require authentication.
- All category and asset reads are scoped to the current user.
- All category and asset writes verify ownership.
- Admin-only routes verify role on the server.
- Form inputs are validated with shared schemas.
- Errors are shown in the UI with actionable messages in Chinese.

JSON backup schema v2 stores `amortizationModel` in personal and site-wide user
data. v1 remains importable and defaults a missing model to `average`. Personal
restore updates the current user's model in the same transaction as their
categories and assets; site-wide restore preserves each user's model.

Recommended route groups:

- Public auth/setup routes.
- Authenticated app routes.
- Admin-only routes.

Recommended service modules:

- Auth/account service.
- Asset service.
- Category service.
- Amortization calculation service.
- Dashboard aggregation service.

Keep amortization logic in reusable pure functions so it can be unit tested
without the database or UI.

## 11. Styling And Frontend Standards

Required:

- Responsive layouts for mobile and desktop.
- Dark mode support.
- Accessible controls with labels.
- Keyboard-friendly forms and dialogs.
- Empty states for no assets/categories.
- Loading states for data-heavy dashboard/chart views.
- Destructive actions require confirmation.

Visual direction:

- Modern, polished, quiet, and practical.
- Suitable for personal finance and asset tracking.
- Avoid oversized marketing hero sections.
- Avoid UI cards nested inside other UI cards.
- Keep dashboard information dense but readable.

Suggested components:

- shadcn/ui Button, Dialog, Sheet, DropdownMenu, Table, Card, Tabs, Select,
  Calendar/Popover, Input, Form, Badge, Alert, Separator, Tooltip.
- lucide-react icons where icons are needed.
- Recharts LineChart, BarChart, AreaChart, PieChart or RadialBarChart as useful.

## 12. Environment Variables

Create `.env.example` during implementation.

Required variables:

```env
DATABASE_URL="postgresql://amortized:amortized@postgres:5432/amortized?schema=public"
AUTH_SECRET="replace-with-a-secure-random-secret"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Amortized"
```

Optional variables:

```env
APP_TIME_ZONE="Asia/Shanghai"
APP_DEFAULT_CURRENCY="CNY"
APP_PORT="3000"
POSTGRES_DB="amortized"
POSTGRES_USER="amortized"
POSTGRES_PASSWORD="replace-with-a-local-secret"
```

Never commit real production secrets.

## 13. Versioning, Git, And GitHub Workflow

During implementation:

1. Create `package.json`.
2. Set `version` to `0.1.0`.
3. Add and maintain README startup/deployment instructions.
4. Commit documentation separately if practical:
   - `docs: add Amortized project specification`
5. Commit initial implementation separately:
   - `feat: build initial Amortized web app`

GitHub publishing requirement:

- Create a public GitHub repository named `Amortized`.
- Use `/opt/homebrew/bin/gh`.
- Push `main`.
- If GitHub connectivity is unstable, retry. If it still fails, report the exact
  failed command and let the user manually retry.

Suggested command shape:

```sh
/opt/homebrew/bin/gh auth status
/opt/homebrew/bin/gh repo create Amortized --public --source=. --remote=origin --push
```

Before pushing:

- Ensure `.env` and other secrets are ignored.
- Ensure `git status --short` contains only intended changes.
- Ensure tests/build have passed.

## 14. Testing Requirements

### 14.1 Unit Tests

Required coverage:

- Inclusive date counting.
- Same-day asset usage.
- Still-in-use assets using today's Asia/Shanghai date.
- Sold price omitted.
- Sold price equal to purchase price.
- Sold price greater than purchase price.
- Negative net cost.
- Zero price if supported.
- Per-asset daily cost.
- Average and logarithmic allocation, including `netCostCents = 60000`, `n = 3`
  producing approximately `[27956.166430490204, 18722.570475109133,
  13321.263094400665]` and summing to the net cost within floating-point
  tolerance.
- Partial chart windows retaining full-range logarithmic weights.
- Active-asset history changing when `today` advances, while ended-asset history
  remains unchanged.
- Historical backfill series.
- Category aggregation.

### 14.2 Integration Tests

Required coverage:

- First administrator setup.
- Closed registration after setup.
- Admin creates or invites a user.
- User cannot read another user's assets.
- User cannot mutate another user's categories.
- Category name uniqueness per user.
- Asset must have exactly one category.
- Asset category must belong to the same user.

### 14.3 UI Tests

Required coverage:

- Login/setup flow.
- Asset create/edit/delete.
- Category create/edit/delete.
- Dashboard renders non-empty charts with seed data.
- Mobile viewport layout.
- Desktop viewport layout.
- Dark mode toggle.

Use Playwright screenshots during final verification if practical, especially
for responsive and dark-mode checks.

### 14.4 Deployment Tests

Required coverage:

- Docker image builds.
- Compose stack starts.
- Database migrations run.
- First admin can be created.
- Data persists after container restart.

Suggested verification commands:

```sh
/usr/local/bin/docker compose build
/usr/local/bin/docker compose up -d
/usr/local/bin/docker compose ps
/usr/local/bin/docker compose logs app
```

## 15. Out Of Scope For v1

Do not implement these unless the user explicitly expands scope:

- Multi-currency support.
- Exchange rates.
- Team workspaces.
- Shared family asset database.
- Open public registration.
- OAuth login.
- Email delivery.
- Native iOS or Android apps.
- Receipt OCR.
- Attachment storage beyond simple placeholders.
- Category history.
- Nested categories.
- Asset sharing between users.

## 16. Implementation Acceptance Criteria

The initial implementation is complete when all of the following are true:

- The app starts through Docker Compose.
- A first administrator can be created from a fresh database.
- The administrator can create at least one normal user.
- A user can create, edit, delete, filter, and sort categories and assets.
- Every asset belongs to exactly one category.
- User A cannot access User B's assets or categories.
- Dashboard shows today's total daily amortized cost.
- Dashboard shows historical daily cost chart data.
- Dashboard shows category breakdown.
- Dark mode works.
- Mobile and desktop layouts are usable.
- `package.json` version is `0.1.0` or intentionally bumped after a release.
- `.env.example` exists and no real `.env` secrets are committed.
- Tests for amortization logic pass.
- Production build passes.
- Docker deployment on this machine succeeds.
- Changes are committed.
- Public GitHub repository `Amortized` is created and synchronized, or a precise
  GitHub connectivity failure is reported with retry instructions.

## 17. Notes For Future Agents

- Treat this document as the product contract.
- Ask the user before changing amortization semantics, account isolation, or
  repository visibility.
- Prefer building the actual app UI first, not a marketing page.
- Keep calculation logic pure and well-tested.
- Keep Docker deployment working throughout the project.
- Use absolute local tool paths when the sandbox `PATH` does not include Docker,
  GitHub CLI, Node, or pnpm.
