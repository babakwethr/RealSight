# Clone Checklist: Ghazal Investor Lounge

This document lists all branding elements, text strings, assets, and configuration values that must be updated when cloning this project for a new real estate agent.

---

## ⭐ START HERE: Brand Config File

**Most values are now centralized in a single file:**

```
src/config/brand.ts
```

Update this file FIRST - it contains:
- Company name and variations
- Contact information (phone, email, address)
- Market/location settings
- Email configuration for edge functions
- AI assistant context and topics
- SEO metadata

After updating `brand.ts`, proceed with the remaining checklist items below for assets and hardcoded values that couldn't be centralized.

---

## Quick Reference

| Current Value | Replace With | Used In |
|---------------|--------------|---------|
| `Ghazal` | New Agent Name | `src/config/brand.ts` + components |
| `ghazal.ae` | New domain | `src/config/brand.ts` |
| `ghazal.investments` | New email domain | `src/config/brand.ts` |
| `#D4AF37` / `43 74% 49%` | New gold accent (HSL) | CSS variables |
| `Dubai` | New location | `src/config/brand.ts` + components |

---

## 1. HTML Meta Tags

### File: `index.html`

- [ ] **Line 7** - Document title
  ```html
  <!-- Current -->
  <title>Lovable App</title>
  <!-- Change to -->
  <title>[NEW_AGENT] Investor Lounge</title>
  ```

- [ ] **Line 8** - Meta description
  ```html
  <!-- Current -->
  <meta name="description" content="GHAZAL Investor Lounge">
  <!-- Change to -->
  <meta name="description" content="[NEW_AGENT] Investor Lounge">
  ```

- [ ] **Line 20-23** - OpenGraph & Twitter tags
  ```html
  <meta property="og:title" content="[NEW_AGENT] Investor Lounge">
  <meta name="twitter:title" content="[NEW_AGENT] Investor Lounge">
  <meta property="og:description" content="[NEW_AGENT] Investor Lounge">
  <meta name="twitter:description" content="[NEW_AGENT] Investor Lounge">
  ```

- [ ] **Line 15, 19** - OpenGraph images (optional)
  ```html
  <meta property="og:image" content="[NEW_OG_IMAGE_URL]">
  <meta name="twitter:image" content="[NEW_OG_IMAGE_URL]">
  ```

---

## 2. Logo & Favicon Assets

### Directory: `public/`

- [ ] `public/favicon.ico` - Browser tab icon
- [ ] `public/favicon.png` - PNG favicon (gold "G" on black)

### Directory: `src/assets/`

- [ ] `ghazal-main-logo.png` - Primary portal logo
- [ ] `ghazal-investor-lounge-logo.png` - Public home branding
- [ ] `ghazal-sidebar-logo.png` - Sidebar navigation logo
- [ ] `ghazal-logo.png` - General purpose logo
- [ ] `xr-logo.jpeg` - XR branding (bottom-right corner)
- [ ] `xr-logo-white.png` - White variant of XR logo
- [ ] `xr-logo-black.png` - Black variant of XR logo

---

## 3. Background Images

### Hero/Landing Page Backgrounds

- [ ] `src/assets/gh2_desktop_1920x1080.jpg` - Desktop hero (1920×1080)
- [ ] `src/assets/gh2_ipad_2048x1536.jpg` - Tablet hero (2048×1536)
- [ ] `src/assets/gh2_mobile_1080x1920.jpg` - Mobile hero (1080×1920)
- [ ] `src/assets/luxury-lounge-bg.jpg` - Alternative luxury background

### About Page Sections (Landscape - Desktop)

- [ ] `src/assets/about-section-1.png`
- [ ] `src/assets/about-section-2.png`
- [ ] `src/assets/about-section-3.png`
- [ ] `src/assets/about-section-4.png`
- [ ] `src/assets/about-section-5.png`
- [ ] `src/assets/about-section-6.png`

### About Page Sections (Portrait - Mobile)

- [ ] `src/assets/about-section-1-portrait.png`
- [ ] `src/assets/about-section-2-portrait.png`
- [ ] `src/assets/about-section-3-portrait.png`
- [ ] `src/assets/about-section-4-portrait.png`
- [ ] `src/assets/about-section-5-portrait.png`
- [ ] `src/assets/about-section-6-portrait.png`

---

## 4. Component Text Updates

### File: `src/pages/public/PublicHome.tsx`

- [ ] **Line 27** - Main heading
  ```tsx
  // Current
  Ghazal Investor <span className="text-gold">Lounge</span>
  // Change to
  [NEW_AGENT] Investor <span className="text-gold">Lounge</span>
  ```

- [ ] **Line 29-30** - Subtitle
  ```tsx
  // Current
  Ask Ghazal AI Assistant about Dubai real estate.
  // Change to
  Ask [NEW_AGENT] AI Assistant about [NEW_LOCATION] real estate.
  ```

- [ ] **Lines 7-15** - Quick chips (update for new market)
  ```tsx
  const quickChips = [
    '[NEW_LOCATION] market overview',
    'Best areas to invest',
    'ROI & rental yields',
    // ... update all chips for new location
  ];
  ```

### File: `src/pages/public/About.tsx`

- [ ] All section headings mentioning "Ghazal"
- [ ] All descriptive text about Dubai market
- [ ] Company history and founding story
- [ ] Team member names and bios (if any)

### File: `src/pages/Login.tsx`

- [ ] Login page title/branding
- [ ] Welcome back message

### File: `src/pages/public/InvestorLoungeInfo.tsx`

- [ ] All references to "Ghazal Investor Lounge"
- [ ] Feature descriptions

### File: `src/pages/public/Projects.tsx`

- [ ] Mock project data (Dubai-specific properties)
- [ ] Developer names
- [ ] Location references

### File: `src/pages/public/RequestAccess.tsx`

- [ ] Form header text
- [ ] Success/confirmation messages

---

## 5. Layout Components

### File: `src/components/layout/PublicLayout.tsx`

- [ ] Logo imports and references
- [ ] Navigation text
- [ ] Footer content (if any)

### File: `src/components/layout/AppSidebar.tsx`

- [ ] Logo import path
- [ ] Brand name in sidebar header
- [ ] Navigation labels (if branded)

### File: `src/components/layout/AdminSidebar.tsx`

- [ ] Admin panel branding
- [ ] Logo references

### File: `src/components/layout/MobileNav.tsx`

- [ ] Mobile menu branding
- [ ] Logo display

### File: `src/components/layout/MobileDrawer.tsx`

- [ ] Drawer header branding

---

## 6. Contact Information

### File: `src/pages/public/Contact.tsx`

- [ ] **Lines 44-45** - Phone numbers
  ```tsx
  // Current
  <p className="text-sm text-foreground/60">+971 4 XXX XXXX</p>
  <p className="text-sm text-foreground/60">+971 50 XXX XXXX</p>
  ```

- [ ] **Lines 51-52** - Email addresses
  ```tsx
  // Current
  <p className="text-sm text-foreground/60">info@ghazal.investments</p>
  <p className="text-sm text-foreground/60">invest@ghazal.investments</p>
  ```

- [ ] **Lines 58-61** - Office address
  ```tsx
  // Current
  Downtown Dubai<br />
  Boulevard Plaza, Tower 1<br />
  Dubai, UAE
  ```

- [ ] **Lines 68-70** - Working hours
  ```tsx
  // Current
  Sunday - Thursday<br />
  9:00 AM - 6:00 PM GST
  ```

### WhatsApp Links (search all files)

- [ ] Search for `wa.me` or `whatsapp` links
- [ ] Update phone numbers in WhatsApp URLs

---

## 7. Edge Function Email Templates

### File: `supabase/functions/create-user/index.ts`

- [ ] **From address** - Update email sender
  ```typescript
  // Current
  from: "Ghazal Investments <noreply@ghazal.ae>"
  // Change to
  from: "[NEW_AGENT] Investments <noreply@[NEW_DOMAIN]>"
  ```

- [ ] **Email subject**
  ```typescript
  // Current
  subject: "Welcome to Ghazal Investor Lounge"
  // Change to
  subject: "Welcome to [NEW_AGENT] Investor Lounge"
  ```

- [ ] **Email body content** - Update all "Ghazal" references in HTML template

### File: `supabase/functions/resend-invitation/index.ts`

- [ ] **Line 108** - From address
  ```typescript
  // Current
  from: "Ghazal Investments <noreply@ghazal.ae>"
  // Change to
  from: "[NEW_AGENT] Investments <noreply@[NEW_DOMAIN]>"
  ```

- [ ] **Line 110** - Email subject
  ```typescript
  // Current
  subject: "Your Invitation to Ghazal Investor Lounge"
  // Change to
  subject: "Your Invitation to [NEW_AGENT] Investor Lounge"
  ```

- [ ] **Lines 125-132** - Email body HTML
  ```html
  <!-- Update heading -->
  Welcome to [NEW_AGENT]
  
  <!-- Update body text -->
  You have been invited to join the [NEW_AGENT] Investor Lounge.
  ```

---

## 8. Theme Colors

### File: `src/index.css`

- [ ] **Gold accent color** (search for `--gold`)
  ```css
  /* Current - HSL format */
  --gold: 43 74% 49%;
  --gold-light: 45 80% 60%;
  --gold-dark: 40 70% 40%;
  
  /* Change to new brand color */
  --gold: [NEW_HUE] [NEW_SAT]% [NEW_LIGHT]%;
  ```

- [ ] **Background colors** (if changing from dark theme)
  ```css
  --background: 0 0% 4%;
  --foreground: 0 0% 98%;
  ```

- [ ] **Glass effect colors**
  ```css
  --glass: 0 0% 100% / 0.05;
  --glass-border: 0 0% 100% / 0.1;
  ```

### File: `tailwind.config.ts`

- [ ] **Lines 60-69** - Custom color definitions
  ```typescript
  gold: {
    DEFAULT: "hsl(var(--gold))",
    light: "hsl(var(--gold-light))",
    dark: "hsl(var(--gold-dark))",
  },
  ```

- [ ] Consider renaming `gold` to match new brand (e.g., `accent`, `brand`)

---

## 9. AI / Concierge Context

### File: `src/pages/Concierge.tsx`

- [ ] **System prompt** - Update AI persona
  ```typescript
  // Current context references
  "Ghazal AI Assistant"
  "Dubai real estate"
  
  // Change to
  "[NEW_AGENT] AI Assistant"
  "[NEW_LOCATION] real estate"
  ```

- [ ] **Welcome message**
- [ ] **Suggested questions/prompts**
- [ ] **Market-specific knowledge context**

### File: `src/components/layout/AIBar.tsx` (if exists)

- [ ] AI branding references
- [ ] Placeholder text

---

## 10. Environment & Domain Configuration

### Resend Email Domain

- [ ] Verify new domain at https://resend.com/domains
- [ ] Update `RESEND_API_KEY` secret if using new Resend account
- [ ] Update sender domain in all edge functions

### Supabase Configuration

- [ ] **File: `supabase/config.toml`**
  - Project ID will change automatically with new Supabase project

- [ ] **File: `.env`** (auto-generated, reference only)
  ```env
  VITE_SUPABASE_PROJECT_ID="[NEW_PROJECT_ID]"
  VITE_SUPABASE_PUBLISHABLE_KEY="[NEW_ANON_KEY]"
  VITE_SUPABASE_URL="https://[NEW_PROJECT_ID].supabase.co"
  ```

### Secrets to Configure

- [ ] `RESEND_API_KEY` - For email sending
- [ ] Any other API keys used by the application

---

## 11. Database Content (Optional)

If seeding demo data, update:

- [ ] Project names and descriptions in `projects` table
- [ ] Sample investor data
- [ ] Demo holdings and payments

---

## 12. Search & Replace Summary

Use your IDE's global search to find and replace:

| Search Term | Files Affected |
|-------------|----------------|
| `Ghazal` | ~15 files |
| `ghazal` | ~20 files (case-insensitive) |
| `Dubai` | ~10 files |
| `ghazal.ae` | 2 edge functions |
| `ghazal.investments` | Contact page |
| `+971` | Contact page, WhatsApp links |

---

## Completion Checklist

- [ ] All logo/favicon assets replaced
- [ ] All background images replaced
- [ ] All "Ghazal" text strings updated
- [ ] Contact information updated
- [ ] Email templates updated
- [ ] Theme colors adjusted (if desired)
- [ ] AI context updated
- [ ] Resend domain verified
- [ ] Application tested end-to-end
- [ ] Mobile responsiveness verified

---

*Document created for Ghazal Investor Lounge clone process*
*Last updated: January 2026*
