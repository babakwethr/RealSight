# RealSight — Project Guide for Claude

This file orients Claude on the RealSight codebase, conventions, and in-flight work.
Read this before making changes.

---

## 0. How to talk to this user

**The user is not a developer.** Write every reply in short, plain language.

- Short replies. No long tables, no code-speak, no long bulleted lists.
- Explain like you're talking to a non-technical founder.
- Never repeat what you just said in the same reply.
- Use concrete words ("the home page looks wrong") not jargon ("the component render
  pipeline is misaligned").
- When the user reviews a change, always send them a **working link** to test, not
  just a summary.

---

## 1. What RealSight is

A Dubai-focused real-estate intelligence app. Surfaces deal scoring, market
analytics, portfolio tracking, and AI-driven verdicts for two primary personas:

- **Adviser / Admin** — brokers, agencies, internal staff. Gets the Deal
  Analyzer, Radar, admin panels.
- **Investor** — end users browsing opportunities, tracking their portfolio,
  talking to the AI Concierge.

Role-based navigation differs between the two (see `src/components/layout/MobileNav.tsx`
for the canonical example of how we split UX by role).

---

## 2. Stack

- **React 18.3** + **Vite 5** + **TypeScript 5**
- **Tailwind CSS 3.4** with HSL CSS variables (tokens live in `src/index.css`)
- **shadcn/ui** (Radix primitives) — full set in `src/components/ui/`
- **React Router 6** — routes defined in `src/App.tsx`
- **Framer Motion** for animations
- **Supabase** — auth + Postgres + edge functions (`supabase/functions/`)
- **TanStack Query** for server state
- **Recharts** / **Leaflet** for charts & maps
- **Capacitor** for iOS / Android builds
- **Vitest** + **Testing Library** for tests
- **i18next** for translations

Scripts:

```
npm run dev          # Vite dev server
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest watch
npm run mobile:ios   # Build + open iOS in Xcode
npm run mobile:android
```

---

## 3. THE GOLDEN RULE

> **Do NOT change any data flow, logic, features, menus, routes, or structure
> unless explicitly asked.**

Work in progress is almost always **visual / UX**, not behavioural. If a task
sounds like it requires touching a route, a hook, a Supabase call, or removing
a menu item — pause and confirm first.

Specifically:

- Don't rename or delete pages / routes.
- Don't change role-gating (`useUserRole`, `ProtectedRoute`, `AdminRoute`).
- Don't alter Supabase queries, edge function contracts, or RLS assumptions.
- Don't drop menu items from `MobileNav` / `AppSidebar` / `MobileDrawer`.
- Don't "simplify" components by removing props that are already in use.

If a refactor is genuinely needed, surface it as a proposal — don't just do it.

---

## 4. V3 Design Direction (in-flight)

We're mid-way through a **V3 visual upgrade**. The vibe:

- Dark, cinematic, aurora glows on deep navy.
- **Mint** (`#18D6A4`) as the hero accent.
- Glassmorphism on floating surfaces (navs, bars, overlays) —
  `backdrop-filter: blur(30px) saturate(1.6)` over `rgba(15,20,40,0.55)`.
- **Per-page hero cards** with different gradient variants, so the app feels
  layered instead of monotonous.
- Every meaningful data surface gets an **AI Verdict** nearby — a short, tonal,
  AI-authored read on what the numbers mean.

**Reference palette:** see `RealSight-Color-Palette.html` at the project root
(open in a browser — click to copy swatches).

---

## 5. Key reusable components

### `src/components/HeroMetricCard.tsx`
Gradient hero card with 8 variants (`blue` / `mint` / `purple` / `amber` /
`rose` / `cyan` / `sunset` / `night`). Props: `variant`, `badge`, `live`,
`label`, `metric`, `metricSuffix`, `verdict`, `verdictDirection`, `progress`,
`decoration` (`'rings' | 'spark' | 'none'`), `children`.

**Convention:** each page picks a different variant so no two heroes look
identical.
- MarketHome → `blue`
- Portfolio → `purple`
- MarketIntelligence → `mint` (Dubai-wide) / `cyan` (area selected)
- Default `decoration="rings"` (not `spark` — no star burst in BG).

### `src/components/AIVerdict.tsx`
"RealSight AI · Verdict" panel — glass card with tone-colored accent, sparkles
eyebrow, icon orb, headline, body, optional factor bullets. Tones: `positive` /
`caution` / `negative` / `neutral`. Use it paired with a HeroMetricCard to
explain the numbers.

### `src/components/layout/MobileNav.tsx`
Apple-style glass bottom bar with a **protruding mint FAB** in a semicircular
notch. Role-aware FAB: Adviser → `/deal-analyzer` (Analyze), Investor →
`/concierge` (Ask AI). **Don't** change the nav structure — icon or label
tweaks only.

Geometry worth preserving:
- bar height `72px`, `borderRadius 26px`, `mx-2 mb-3`
- notch mask: `radial-gradient(circle 40px at 50% 0, transparent 39px, #000 40px)`
- FAB orb `52px`, offset `-mt-8 mb-0.5`

---

## 6. Folder map

```
src/
├── pages/                  # Route components (one per route)
│   ├── admin/              # Admin-only pages
│   ├── public/             # Unauthenticated pages
│   └── preview/v3/         # V3 design previews (experimental, don't delete)
├── components/
│   ├── ui/                 # shadcn/ui primitives — don't edit casually
│   ├── layout/             # AppLayout, AppSidebar, MobileNav, MobileDrawer, AIBar
│   ├── charts/             # Recharts wrappers
│   ├── pdf/                # @react-pdf/renderer templates
│   ├── admin/              # Admin-only widgets
│   ├── portfolio/          # Portfolio-specific widgets
│   ├── HeroMetricCard.tsx  # ← reusable hero
│   └── AIVerdict.tsx       # ← reusable AI verdict
├── hooks/                  # useAuth, useUserRole, etc.
├── lib/                    # utils (cn), supabase client, helpers
├── integrations/supabase/  # Generated types + client
└── index.css               # Design tokens (HSL CSS vars)

supabase/functions/         # Edge functions
```

---

## 7. Conventions

- **Paths:** use `@/` alias (configured in `tsconfig.json` + `vite.config.ts`).
- **Styling:** Tailwind first, inline `style` only for dynamic values
  (gradients, computed colors). Avoid raw hex in JSX — prefer tokens from
  `index.css` or the variant maps in `HeroMetricCard`.
- **Icons:** `lucide-react` (or `@tabler/icons-react` for specific pages
  that already use it).
- **Animations:** Framer Motion `whileTap={{ scale: 0.92 }}` pattern for
  press feedback; `animate-pulse` for halos.
- **i18n:** user-visible strings should go through `t()` where surrounding
  code already uses it — don't introduce English-only strings into i18n'd
  pages.
- **Role checks:** `useUserRole()` + `user?.user_metadata?.signup_role`. Admins
  always fall into adviser UX.
- **Responsive:** `lg:` is the desktop breakpoint; `MobileNav` is hidden
  `lg:hidden`, desktop sidebar is `hidden lg:flex`.

---

## 8. Things to know before editing

- **Preview V3 pages** (`src/pages/preview/v3/*`) are **intentional scratch
  space** for design exploration. They're not dead code — don't delete them,
  but production work lives in the top-level `pages/` files.
- **`lovable-tagger`** appears in devDependencies — the project was originally
  scaffolded on Lovable. Safe to keep.
- **Two Portfolio files exist**: `src/pages/Portfolio.tsx` (live) and
  `src/pages/preview/v3/Portfolio.tsx` (preview). Modify the live one unless
  asked otherwise.
- **Color palette reference:** `/RealSight-Color-Palette.html` at repo root.
- Run `npm run lint` and `npm run test` before handing work back.

---

## 9. Recent work (for context)

- Built `HeroMetricCard` + `AIVerdict` as reusable primitives.
- Applied gradient hero + AI verdict to `MarketHome`, `Portfolio`,
  `MarketIntelligence`.
- Reshaped `MobileNav` bar to match the Apple-style reference (wider notch,
  tighter corners, glass fill).
- Shrunk mobile area pills and added a compact filter row
  (Sales/Rental + Beds/Status/Type) on `MarketHome`.
- Generated `RealSight-Color-Palette.html` as the design-system reference.

---

## 10. Magic MCP / 21st.dev — when and how to use it

Magic MCP (21st.dev) generates React component variants in a hosted chat
session. **Use it ONLY when Babak explicitly asks for it** — phrases like
"use Magic MCP", "use 21st.dev for this card", "give me variants for this
element". **Do NOT** reach for it for routine UI work you can just code
yourself.

### The locked workflow (every time)

1. **Generate variants.** Call `mcp__magic__21st_magic_component_builder`
   with a clear, specific brief — what the component is, what data it
   shows, what context it lives in, accent palette, dark mode, etc.
2. **Send Babak the chat URL.** The tool returns a
   `https://21st.dev/magic-chat/<id>?mcp=true&port=...` URL with 4–5 rendered
   variants in the right-hand sidebar. **Send him that URL directly in
   chat.** Do NOT build your own HTML preview file. Do NOT try to render the
   variants yourself.
3. **Wait for Babak to pick.** He opens the URL, browses Variants 1–5, and
   clicks the blue "Open in MCP" button on the one he likes. That action
   gives him a copy-paste prompt block. He pastes that prompt back to you
   in chat.
4. **Integrate.** Use the pasted prompt — it tells the MCP exactly which
   variant to pull. Fetch the chosen variant's code, adapt it to
   RealSight's data shape (props, types, store/query bindings), and place
   it in the right file.

### What NOT to do

- ❌ Build your own HTML samples copying ideas from the `inspiration`
  tool output (this happened once with `markets-card-samples.html` —
  never again).
- ❌ Pick a variant yourself — always wait for Babak's selection.
- ❌ Dismiss malformed tool output (`[object Object]`) — retry the call,
  inspect the saved file if the response was truncated.
- ❌ Use Magic MCP unprompted for routine UI changes.

### Trigger phrases that mean "use Magic MCP"

- "Use Magic MCP for this"
- "Use 21st.dev for this card / element / design"
- "Give me variants from Magic"
- Any direct mention of `21st.dev` or `Magic MCP` in the request
