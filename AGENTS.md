# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 14 App Router application in strict TypeScript. Routes and layouts live in `src/app`; route groups separate authenticated pages (`(app)`) from login/setup pages (`(auth)`). React components are in `src/components`, with primitives under `src/components/ui`. Put shared calculations, validation, and database helpers in `src/lib`; keep server actions and domain services in `src/server`. Prisma schema, migrations, and seed data live in `prisma/`. Product behavior is documented in `docs/PROJECT_SPEC.md`.

## Build, Test, and Development Commands

- `pnpm install` installs locked dependencies with pnpm 11.
- `cp .env.example .env` creates local configuration; replace secrets before use.
- `pnpm prisma:dev` creates and applies a development migration.
- `pnpm dev` starts the local Next.js server.
- `pnpm test` runs all Vitest tests once; `pnpm test:watch` reruns affected tests.
- `pnpm build` generates Prisma Client and produces a production build.
- `pnpm db:seed` seeds the configured PostgreSQL database.
- `docker compose up -d --build` runs the complete app and database stack.

## Coding Style & Naming Conventions

Follow the existing two-space indentation, semicolons, and double quotes. Prefer small typed functions and named exports. Use `PascalCase` for components and types, `camelCase` for functions and variables, and kebab-case filenames such as `category-form.tsx`. Import internal modules through `@/`. Keep authorization and user scoping in server services, and validate input with the existing Zod schemas. No standalone formatter or lint script is configured; match surrounding code and ensure `pnpm build` passes.

## Testing Guidelines

Vitest discovers colocated `src/**/*.test.ts` files. Name tests after the module, cover edge cases for money, dates, authorization, and data replacement, and mock only external boundaries. Run `pnpm test` before every pull request. Playwright is configured for future browser tests under `tests/e2e`; run them with `pnpm exec playwright test` when that directory is present. No numeric coverage threshold is enforced.

## Commit & Pull Request Guidelines

History follows Conventional Commit-style prefixes: `feat:`, `refactor:`, `docs:`, and `merge:`. Use an imperative, scoped summary, for example `feat: add asset search`. Pull requests should explain the user-visible change, call out schema or environment changes, link the relevant issue, and include screenshots for UI work. Report `pnpm test` and `pnpm build` results; commit Prisma migrations with schema changes.

## Security & Configuration

Never commit `.env`, production credentials, or exported backup files. Preserve per-user filtering in database queries. Treat full-site JSON exports as sensitive because they contain password hashes and user data.
