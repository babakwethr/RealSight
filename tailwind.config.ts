import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
        // Design package: Space Grotesk for display numbers / hero values (tabular).
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        // Preserved: Berkeley Mono for inline numbers, tables, code.
        mono: ['Berkeley Mono', 'SF Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        glass: {
          DEFAULT: "hsl(var(--glass))",
          border: "hsl(var(--glass-border))",
        },
        "accent-green": {
          DEFAULT: "hsl(var(--accent-green))",
          light: "hsl(var(--accent-green-light))",
          dark: "hsl(var(--accent-green-dark))",
        },
        "accent-blue": "hsl(var(--accent-blue))",
        "accent-purple": "hsl(var(--accent-purple))",
        // Design-package surface ladder (dark canvas strata)
        panel:      "var(--panel)",
        surface:    "var(--surface)",
        "surface-hi": "var(--surface-hi)",
        hero:       "var(--hero)",
        // Design-package brand accents (raw hex, no HSL conversion lossiness)
        emerald: {
          DEFAULT: "var(--emerald)",      // #10E3B0 primary signal / buy
          deep:    "var(--emerald-2)",    // #0AC291 hover
        },
        "violet-brand": {
          DEFAULT: "var(--violet)",       // #7B5CFF AI · intelligence
          2:       "var(--violet-2)",     // #A88BFF on-dark variant
        },
        "gold-brand":   "var(--gold)",    // #C9A84C premium · Adviser Pro
        "blue-brand":   "var(--blue)",    // #4AA8FF info · yield · data viz
        "amber-brand":  "var(--amber)",   // #F5B433 warning · caution
        "red-brand":    "var(--red)",     // #FF5577 danger · sell
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "gradient-flow": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-ring": {
          "0%":   { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.3)", opacity: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "ambient-drift": {
          "0%": { transform: "scale(1) translate(0, 0)" },
          "33%": { transform: "scale(1.02) translate(1%, -1%)" },
          "66%": { transform: "scale(0.98) translate(-1%, 1%)" },
          "100%": { transform: "scale(1.01) translate(0.5%, -0.5%)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "gradient-flow":  "gradient-flow 6s ease infinite",
        "pulse-ring":     "pulse-ring 2s ease-out infinite",
        "fade-up":        "fade-up 420ms cubic-bezier(0.22, 0.61, 0.36, 1.00)",
        "ambient-drift":  "ambient-drift 20s ease-in-out infinite alternate",
        marquee: "marquee var(--duration) linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
