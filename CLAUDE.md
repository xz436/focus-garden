# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `npm run dev` (runs on localhost:3000)
- **Build**: `npm run build --webpack` (uses webpack, not turbopack, due to serwist PWA requirement)
- **Lint**: `npm run lint` (runs eslint with flat config)
- **No test framework is configured.**

## Architecture

Focus Garden is an offline-first PWA productivity app built with Next.js 16 (App Router). It tracks focus sessions across customizable life categories using a Pomodoro timer, with a virtual garden that grows as users complete sessions.

### Data Layer

All data is stored in **localStorage** via `src/lib/store.ts`. There is no active backend — Supabase client files exist (`src/lib/supabase.ts`, `src/lib/supabase-server.ts`) but are not used by any pages. The store module is the single source of truth for all app state.

Storage keys are prefixed with `fg_` (e.g., `fg_sessions`, `fg_settings`, `fg_problems`). The store exposes plain functions (not hooks) that read/write localStorage directly. Pages call these functions inside `useEffect` and manage their own React state.

Key data entities: `Session`, `Blind75Problem`, `DailyPlanLocal`, `AppSettings`, `GardenSnapshot`, `Achievement`, `BabyDailyLog`.

### Page Structure

All pages are client components (`"use client"`) in `src/app/*/page.tsx`. There are no server components, API routes, or middleware in active use.

- `/` — Landing page (redirects to `/dashboard` if onboarded)
- `/onboarding` — First-time setup
- `/dashboard` — Main hub: today's sessions, garden preview, quick-add, calendar
- `/timer` — Pomodoro timer with ambient sounds, break management, focus mode
- `/garden` — Visual garden showing plant growth stages per category
- `/blind75` — Blind 75 LeetCode problem tracker
- `/plan` — Daily planning with intentions and per-category goals
- `/review` — Weekly review with shareable report generation
- `/summary` — Weekly summary with category breakdown charts (uses recharts)
- `/trends` — Historical trends and heatmap visualization
- `/stats` — Streaks, achievements, and heatmap
- `/settings` — User preferences, category management, data export/import, theme
- `/baby` — Baby development activity tracker (age-based)

### Categories & Garden System

Categories are user-customizable (defined in `AppSettings.categories`, defaults in `src/lib/constants.ts`). Each category has an emoji, plant type, color, default timer duration, and weekly target. Plants evolve through 5 stages (Seed → Sprout → Growing → Bloom → Full Flower) based on session count thresholds defined in `PLANT_STAGES`.

### UI Components

Shared UI lives in `src/components/ui/`: `Button`, `Card`, `ProgressBar`, `BottomNav` (mobile tab bar with expandable "More" menu), `Toast` (global notification system via `showToast()`), `Confetti` (triggered via `triggerConfetti()`), `ThemeProvider` (light/dark/system), `MonthCalendar`, `SessionEditModal`.

### Styling

Tailwind CSS v4 with CSS custom properties for theming (defined in `src/app/globals.css`). Dark mode uses the `.dark` class on `<html>`. The path alias `@/*` maps to `./src/*`.

### PWA

Service worker is configured via Serwist (`@serwist/next`). Source at `src/sw.ts`, built to `public/sw.js`. Disabled in development. Manifest at `public/manifest.json`.
