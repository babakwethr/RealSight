# RealSight Design System
> Source: Linear DESIGN.md (getdesign.md/linear.app/design-md) adapted for RealSight.
> This is the single design reference. Every page, component and feature must follow this.

---

## 1. Visual Theme & Atmosphere

RealSight is a dark-native financial intelligence platform. Like Linear, darkness is the native medium — not a theme applied over light. Content emerges from near-black like data on a trading terminal. The visual language communicates precision, trust, and intelligence.

**Key characteristics (from Linear, applied to RealSight):**
- Dark-mode native: `#0B1120` page background, `#0f1218` panel surfaces, `#141b26` elevated cards
- Inter Variable with `"cv01", "ss03"` globally — cleaner, geometric letterforms
- Weight **510** as signature emphasis between regular (400) and medium (500)
- Negative letter-spacing at display sizes: `-1.056px` at 48px, `-0.704px` at 32px
- Semi-transparent white borders throughout: `rgba(255,255,255,0.06)` to `rgba(255,255,255,0.10)`
- Surface elevation via background luminance steps — not shadows
- **RealSight accent: Emerald `#22C55E`** (replaces Linear's indigo) — the ONLY chromatic color in UI chrome
- **RealSight brand gold: `#C9A84C`** — premium badges, plan indicators only
- Berkeley Mono for all prices, numbers, AED values — technical precision

---

## 2. Color Palette

### Background Surfaces
```
Page background:    #0B1120   (RealSight deep navy-black — the canvas)
Panel dark:         #0f1218   (sidebar, panel backgrounds)
Surface elevated:   #141b26   (card backgrounds, dropdowns)
Surface hover:      #1a2232   (hover state on cards)
```

### Text Hierarchy
```
Primary text:       #f7f8f8   (near-white — never pure #fff, prevents eye strain)
Secondary text:     #d0d6e0   (silver-gray — body, descriptions)
Tertiary text:      #8a8f98   (muted — placeholders, metadata)
Quaternary text:    #62666d   (most subdued — timestamps, disabled)
```

### Borders (always semi-transparent white — never solid dark)
```
Border subtle:      rgba(255,255,255,0.05)
Border default:     rgba(255,255,255,0.08)
Border hover:       rgba(255,255,255,0.13)
Border active:      rgba(255,255,255,0.20)
```

### Accent Colors
```
Primary (Emerald):  #22C55E   — CTAs, active states, growth indicators
Primary hover:      #16A34A
Primary dim:        rgba(34,197,94,0.10)

Gold (Brand):       #C9A84C   — plan badges (Portfolio Pro, Adviser), premium UI
Gold dim:           rgba(201,168,76,0.12)

Positive:           #22C55E
Negative:           #EF4444
Caution:            #F59E0B
Info:               #3B82F6
```

### Animated Gradient (headings and hero metrics only)
```css
background: linear-gradient(90deg, #22C55E, #3B82F6, #A855F7, #C9A84C, #22C55E);
background-size: 300% 100%;
animation: gradient-flow 6s ease infinite;
```

---

## 3. Typography

### Font Families
```
Display / UI:  Inter Variable — font-feature-settings: "cv01", "ss03"
               Fallbacks: SF Pro Display, -apple-system, system-ui
Numbers/AED:   Berkeley Mono — all prices, sqft values, transaction amounts
               Fallbacks: ui-monospace, SF Mono, Menlo, monospace
```

**Critical: `font-feature-settings: "cv01", "ss03"` must be set globally on all Inter text.**
- `cv01` = single-story lowercase 'a' (cleaner, geometric)
- `ss03` = adjusted letterforms for a more precise look
- Without these, it's generic Inter, not RealSight's Inter

### Type Scale
| Role | Size | Weight | Line Height | Letter Spacing | Use |
|------|------|--------|-------------|----------------|-----|
| Display Hero | 48px | 510 | 1.00 | -1.056px | Page hero titles |
| Display | 32px | 510 | 1.13 | -0.704px | Section headings |
| Heading 1 | 24px | 510 | 1.33 | -0.288px | Card headings, modals |
| Heading 2 | 20px | 590 | 1.33 | -0.240px | Feature titles |
| **KPI Value** | **28–32px** | **900** | **1.00** | **-0.5px** | **The hero of every stat card** |
| Body Large | 18px | 400 | 1.60 | -0.165px | Introductions |
| Body | 16px | 400 | 1.50 | normal | Standard reading |
| Body Medium | 16px | 510 | 1.50 | normal | Navigation, labels |
| Small | 15px | 400 | 1.60 | -0.165px | Secondary body |
| Caption | 13px | 510 | 1.50 | -0.130px | Metadata, timestamps |
| Label | 12px | 510 | 1.40 | normal | Badges, small labels |
| Micro | 11px | 510 | 1.40 | normal | Overlines, table headers |
| AED Values | 14–32px | 400–700 | 1.50 | normal | Berkeley Mono always |

### Weight System (Linear's three-tier)
- **400** — reading, body text
- **510** — emphasis, navigation, UI labels (signature between regular and medium)
- **590** — strong emphasis, card titles, announce
- **900** — KPI hero numbers only (maximum visual dominance)
- ❌ Never use 700 (bold) in headings — 590 is the maximum for headings

---

## 4. Component System

### Glass Card (base pattern for all cards)
```css
background: rgba(255,255,255,0.03);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 16px;
backdrop-filter: blur(12px);
/* Top inner highlight — always present */
::before {
  content: '';
  position: absolute; top: 0; left: 16px; right: 16px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
}
/* Hover */
:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.13);
}
```

### Surface Elevation (Linear's luminance stepping)
```
Level 0 — Page:     #0B1120         (the canvas)
Level 1 — Panel:    #0f1218         (sidebar, drawers)
Level 2 — Card:     rgba(w,0.03)    (standard cards)
Level 3 — Elevated: rgba(w,0.05)    (hovered/active cards, dropdowns)
Level 4 — Float:    rgba(w,0.07)    (modals, popovers, command palette)
```
✅ Elevation = lighter background opacity. Never use drop-shadows on dark surfaces.

### KPI Stat Card
```
Label (11px 510 muted, uppercase, tracking wide)  [tiny trend icon right]
───────────────────────────────────────────────
Hero Number (28–32px 900, Berkeley Mono for AED)
Change badge (pill, 10px, emerald/red)
```
Rule: **The number is always the largest element on the card.** Labels are secondary.

### Area Card (performance-colored gradient)
```
Gradient based on YoY performance:
  ≥15% YoY + ≥7% yield → from-emerald-950/80 (green)
  ≥10% YoY             → from-blue-950/80
  ≥7% yield            → from-purple-950/80
  default              → from-slate-900/80

Layout:
  [Rank badge]  Area Name  [YoY badge]
  Sparkline (zoomed Y domain: min×0.97 → max×1.03)
  2×2 stat grid
```

### Buttons
```
Primary (Emerald):
  background: #22C55E
  color: #ffffff (or #0B1120 for contrast)
  padding: 8px 20px; border-radius: 10px; font-weight: 600

Ghost (default):
  background: rgba(255,255,255,0.03)
  border: 1px solid rgba(255,255,255,0.08)
  color: #d0d6e0
  padding: 8px 16px; border-radius: 8px

Pill (filter chips):
  border-radius: 9999px
  Same glass background as ghost
  Active: bg-primary, text-white
```

### Dropdowns
```
background: #0f1218
border: 1px solid rgba(255,255,255,0.12)
border-radius: 12px
box-shadow: 0 16px 48px rgba(0,0,0,0.6)
z-index: 9999
/* CRITICAL: must escape any backdrop-blur stacking context */
```

### Data Table
```
Container: glass card (rounded-2xl)
Header: bg rgba(w,0.02), 10px 510 uppercase muted, tracking 0.08em
Rows: hover bg rgba(w,0.04); border-bottom rgba(w,0.04)
Numbers (AED, sqft): Berkeley Mono, font-weight 600
Badges: rounded-full, 10px 800 uppercase
Clickable: cursor-pointer, group-hover:text-primary
```

### Navigation Sidebar
```
Width: 60px collapsed → 224px expanded (w-56)
Background: #0A0F1A
Transition: width 200ms ease-in-out (width only, not position)
Layout: sticky top-0, h-screen — pushes content, no overlay

Item active:   bg rgba(34,197,94,0.10), 3px left accent bar
Item hover:    bg rgba(255,255,255,0.05)
Icon size:     18px
Label:         14px 510 weight
Section dividers: 9px 510, uppercase, tracking 0.12em, opacity 30%
```

### Upsell Bar (inline, non-blocking)
```
Gradient left-accent: from-primary/10 to-transparent
border: 1px solid rgba(34,197,94,0.20)
Rounded-2xl, p-5
[Icon] [Title 14px 700] [Description 12px muted] [CTA button right]
Never blocks — always additive to page
```

### Feature Gate Modal
```
Fixed overlay: bg-black/60 backdrop-blur-sm
Card: #141b26, border rgba(w,0.10), rounded-2xl, p-8
Emerald lock icon → Plan badge → Title 18px → Desc 14px → Full-width CTA
```

---

## 5. Spacing & Layout

```
Base unit: 8px
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px
Page padding: 24px (mobile: 16px)
Section gap: 20–24px
Card gap: 12px
Max content width: 1400px centered
```

### Border Radius Scale
```
Micro (2px):    inline badges, table cells
Tight (4px):    small labels
Standard (6px): buttons, inputs
Card (12–16px): cards, panels (use rounded-2xl = 16px consistently)
Pill (9999px):  filter chips, area pills, status tags
Circle (50%):   avatar, icon buttons
```

---

## 6. Animations

```css
/* Gradient text — section headings and hero labels */
@keyframes gradient-flow {
  0%, 100% { background-position: 0% 50%; }
  50%       { background-position: 100% 50%; }
}
.gradient-heading { animation: gradient-flow 6s ease infinite; }
.gradient-word    { animation: gradient-flow 4s ease infinite; }

/* Card entrance */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Hover lift — area cards, feature cards */
transition: transform 0.2s ease, box-shadow 0.2s ease;
:hover { transform: translateY(-2px); }
```

---

## 7. Do's and Don'ts

**DO:**
- Set `font-feature-settings: "cv01", "ss03"` globally on all Inter text
- Use weight **510** as the default emphasis weight for UI labels and navigation
- Use **Berkeley Mono** for ALL AED prices, sqft values, and numeric data
- Make KPI numbers the largest element — `text-2xl font-black` minimum
- Use **negative letter-spacing** at display sizes: `-0.7px` at 32px, `-1.056px` at 48px
- Use `rgba(255,255,255,X)` for ALL borders — never solid dark borders on dark backgrounds
- Use emerald green ONLY for primary CTAs, active states, positive metrics
- Use gold ONLY for plan badges (Portfolio Pro, Adviser) and brand marks
- Add the top inner highlight (1px gradient) to every glass card
- Zoom Y-axis on sparklines: `domain={[min*0.97, max*1.03]}` for visible trends
- Apply animated gradient to section headings on key featured words only

**DON'T:**
- ❌ Don't use `font-weight: 700` (bold) on headings — max is 590, KPI hero is 900 only
- ❌ Don't use `overflow-hidden` on containers that have dropdown children — clips z-index
- ❌ Don't use drop-shadows on dark surfaces — use background luminance steps
- ❌ Don't use sparkline charts inside small KPI stat cards — only in area cards
- ❌ Don't use pure `#ffffff` as primary text — always `#f7f8f8`
- ❌ Don't use solid colored backgrounds for buttons except primary CTA
- ❌ Don't add warm colors to UI chrome — palette is cool dark with emerald/gold accent
- ❌ Don't gate entire pages — gate features within pages
- ❌ Don't nest `backdrop-blur` containers inside other `backdrop-blur` containers (stacking context)
- ❌ Don't mention competitor names anywhere in the UI

---

## 8. Example Component Prompts

**KPI Card:**
```
Background: rgba(255,255,255,0.03), border rgba(255,255,255,0.08), rounded-2xl, backdrop-blur-md.
Label: 11px Inter 510, uppercase, tracking 0.08em, color #8a8f98.
Value: 28px Berkeley Mono weight 700, color #f7f8f8, letter-spacing -0.5px.
Change: pill badge, 10px 800, emerald (#22C55E) bg-opacity-10.
```

**Hero section:**
```
Background: #0B1120. Headline: 48px Inter Variable 510, line-height 1.00, 
letter-spacing -1.056px, color #f7f8f8, font-feature-settings "cv01" "ss03".
Accent word: animated gradient span (.gradient-heading).
Subtitle: 18px Inter 400, line-height 1.60, color #8a8f98.
CTA: #22C55E bg, #0B1120 text, 10px radius, 8px 24px padding, 600 weight.
```

**Data table row:**
```
Hover: bg rgba(255,255,255,0.04). Border-bottom: rgba(255,255,255,0.04).
Area name: 14px Inter 700, color #f7f8f8. Price: 14px Berkeley Mono 600.
YoY badge: rounded-full, 10px 800. Demand: 12px 510, color per level.
```
