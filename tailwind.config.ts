import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ── Colour tokens ───────────────────────────────────────────
         All are driven by CSS custom properties so you can retheme
         without touching this file.
      ────────────────────────────────────────────────────────────── */
      colors: {
        /* shadcn / Base UI primitive surface tokens */
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },

        /* Xenon brand palette */
        "x-black":  "var(--x-black)",   /* #0a0a0a   — pure editorial black       */
        "x-ink":    "var(--x-ink)",     /* #1a1a1a   — soft black for body text   */
        "x-ivory":  "var(--x-ivory)",   /* White page surface (legacy token name). */
        "x-smoke":  "var(--x-smoke)",   /* Neutral alternate surface. */
        "x-grey":   "var(--x-grey)",    /* #7a7673   — mid grey / placeholder     */
        "x-hairline":"var(--x-hairline)",/* rgba(10,10,10,0.10) — 1px borders      */

        /* Legacy aliases kept for backward compat */
        "xenon-black":  "var(--x-black)",
        "xenon-white":  "var(--x-ivory)",
        "xenon-warm":   "var(--x-smoke)",
        "xenon-muted":  "var(--x-grey)",
        "xenon-accent": "var(--x-grey)",
      },

      /* ── Typefaces ───────────────────────────────────────────── */
      fontFamily: {
        /* Self-hosted Instrument Sans; the logo remains original artwork. */
        display: ["var(--font-display)", "Impact", "sans-serif"],
        /* Shared reading and operational UI family. */
        sans:    ["var(--font-sans)",    "system-ui", "sans-serif"],
        mono:    ["Menlo", "Monaco", "Consolas", "monospace"],
      },

      /* ── Spacing scale extension ─────────────────────────────── */
      spacing: {
        "18":  "4.5rem",   /* 72px  */
        "22":  "5.5rem",   /* 88px  */
        "26":  "6.5rem",   /* 104px */
        "30":  "7.5rem",   /* 120px */
        "36":  "9rem",     /* 144px */
        "44":  "11rem",    /* 176px */
        "section-sm": "4rem",     /* mobile section pad  */
        "section-md": "6rem",     /* tablet section pad  */
        "section-lg": "9rem",     /* desktop section pad */
      },

      /* ── Max-widths ──────────────────────────────────────────── */
      maxWidth: {
        container:  "1440px",
        editorial:  "1280px",
        prose:      "720px",
        caption:    "480px",
      },

      /* ── Letter spacing ──────────────────────────────────────── */
      letterSpacing: {
        "micro":     "0.20em",
        "label":     "0.28em",
        "wide-xl":   "0.36em",
        "display":   "-0.02em",
        "heading":   "-0.01em",
        /* legacy */
        widest2:     "0.28em",
        widest3:     "0.36em",
      },

      /* ── Line-heights ────────────────────────────────────────── */
      lineHeight: {
        "display":  "0.92",
        "heading":  "1.05",
        "editorial":"1.15",
        "body":     "1.75",
        "loose":    "2.00",
      },

      /* ── Border widths ───────────────────────────────────────── */
      borderWidth: {
        DEFAULT: "1px",
        "0": "0",
        "2": "2px",
        "hairline": "1px",
      },

      /* ── Timing functions ────────────────────────────────────── */
      transitionTimingFunction: {
        silk:   "cubic-bezier(0.25, 0.1, 0.25, 1)",
        reveal: "cubic-bezier(0.16, 1, 0.3, 1)",
        expo:   "cubic-bezier(0.19, 1, 0.22, 1)",
        circ:   "cubic-bezier(0.77, 0, 0.175, 1)",
      },

      /* ── Durations ───────────────────────────────────────────── */
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
        "400": "400ms",
        "600": "600ms",
        "800": "800ms",
        "1000":"1000ms",
        "1200":"1200ms",
      },

      /* ── Keyframes ───────────────────────────────────────────── */
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeDown: {
          "0%":   { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%":   { opacity: "1" },
          "100%": { opacity: "0" },
        },
        scaleReveal: {
          "0%":   { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        ticker: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        slideInRight: {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideOutRight: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        slideInUp: {
          "0%":   { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        revealMask: {
          "0%":   { clipPath: "inset(0 100% 0 0)" },
          "100%": { clipPath: "inset(0 0% 0 0)" },
        },
      },

      /* ── Named animations ────────────────────────────────────── */
      animation: {
        "fade-up":         "fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both",
        "fade-up-slow":    "fadeUp 1.1s cubic-bezier(0.16,1,0.3,1) both",
        "fade-down":       "fadeDown 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in":         "fadeIn 0.6s ease both",
        "fade-out":        "fadeOut 0.4s ease both",
        "ticker":          "ticker 28s linear infinite",
        "slide-in-right":  "slideInRight 0.45s cubic-bezier(0.16,1,0.3,1) both",
        "slide-out-right": "slideOutRight 0.35s cubic-bezier(0.25,0.1,0.25,1) both",
        "slide-in-up":     "slideInUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "scale-reveal":    "scaleReveal 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "reveal-mask":     "revealMask 0.8s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
