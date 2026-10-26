"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { Banner } from "@/lib/storefront";

/* ── Easing ─────────────────────────────────────────────────── */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const CONTAINER = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.45 } },
};

const RISE = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.75, ease: EASE } },
};

/* ── Types ──────────────────────────────────────────────────── */
type HeroSectionProps = { hero: Banner | null };

/* ══════════════════════════════════════════════════════════════
   HeroSection

   Design principle: the image is the product. Text is a
   commanding footnote — bold, angular, brand-owned.

   Font: Helvetica Neue Black Italic (--font-sans) — matches editorial banner
   ══════════════════════════════════════════════════════════════ */
export function HeroSection({ hero }: HeroSectionProps) {
  const imgSrc   = hero?.imageUrl || "/images/hero.png";
  const mobileImgSrc = hero?.mobileImageUrl || imgSrc;
  /* Fallback copy — brand-owned, punchy, not generic */
  const headline = hero?.title || "NO NOISE.\nJUST FORM.";
  const subline  = hero?.subtitle || "Monochrome essentials. Zero compromise.";
  const eyebrow = hero?.eyebrow || "Xenon · SS26";
  const primaryCtaLabel = hero?.ctaLabel || "Shop Signature";
  const primaryCtaUrl = hero?.ctaUrl || "/products?category=signature-collection";
  const secondaryCtaLabel = hero?.secondaryCtaLabel || "Shop Evening Wear";
  const secondaryCtaUrl = hero?.secondaryCtaUrl || "/products?category=evening-wear";
  const heroHeight = "clamp(36rem, 84svh, 52rem)";

  return (
    <section
      className="relative w-full overflow-hidden bg-[var(--x-black)]"
      style={{ minHeight: heroHeight }}
      aria-label="Xenon hero"
    >

      {/* ── Full-bleed image ────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.8, ease: "easeOut" }}
      >
        <picture className="block h-full w-full">
          <source media="(max-width: 640px)" srcSet={mobileImgSrc} />
          <img
            src={imgSrc}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="h-full w-full object-cover object-top"
            style={{ opacity: 0.82 }}
          />
        </picture>

      </motion.div>

      {/* ── Content (copy + CTAs) ─────────────────────────────── */}
      <div
        className="relative z-10 flex flex-col justify-end px-2 sm:px-4 lg:px-6"
        style={{
          minHeight:     heroHeight,
          paddingBottom: "clamp(1rem, 2vw, 1.75rem)",
        }}
      >
        <motion.div
          className="flex flex-col"
          variants={CONTAINER}
          initial={false}
          animate="visible"
        >
          {/* Eyebrow — Space Grotesk, wide tracking */}
          <motion.p
            variants={RISE}
            style={{
              fontFamily:    "var(--font-sans), system-ui, sans-serif",
              fontSize:      "0.5625rem",
              fontWeight:    500,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color:         "rgba(248,246,242,0.42)",
              marginBottom:  "0.5rem",
            }}
          >
            {eyebrow}
          </motion.p>

          {/* Hero headline — Bold italic sans-serif, matching editorial banner */}
          <motion.h1
            variants={RISE}
            style={{
              fontFamily:    "var(--font-sans), system-ui, sans-serif",
              fontSize:      "clamp(2.3rem, 6.2vw, 7rem)",
              fontWeight:    900,          /* Black weight for maximum impact */
              fontStyle:     "italic",     /* Italic for editorial sophistication */
              lineHeight:    0.92,
              letterSpacing: "-0.015em",   /* Tighter tracking like editorial banner */
              textTransform: "uppercase",
              color:         "var(--x-ivory)",
              whiteSpace:    "pre-line",
              marginBottom:  "0.65rem",
              textShadow:    "0 2px 22px rgba(0,0,0,0.42)",
            }}
          >
            {headline}
          </motion.h1>

          {/* Subline — Space Grotesk, restrained */}
          <motion.p
            variants={RISE}
            style={{
              fontFamily:   "var(--font-sans), system-ui, sans-serif",
              fontSize:     "0.75rem",
              fontWeight:   400,
              lineHeight:   1.65,
              color:        "rgba(248,246,242,0.48)",
              maxWidth:     "26rem",
              marginBottom: "1rem",
            }}
          >
            {subline}
          </motion.p>

          {/* CTAs — solid black btn + ghost, compact */}
          <motion.div
            variants={RISE}
            className="flex flex-wrap items-center gap-2"
          >
            <Link
              href={primaryCtaUrl}
              style={{
                fontFamily:    "var(--font-sans), system-ui, sans-serif",
                fontSize:      "0.5625rem",
                fontWeight:    600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color:         "var(--x-black)",
                background:    "var(--x-ivory)",
                padding:       "0.65rem 1.5rem",
                display:       "inline-block",
                transition:    "background 220ms ease, color 220ms ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color      = "var(--x-ivory)";
                (e.currentTarget as HTMLAnchorElement).style.outline    = "1px solid rgba(248,246,242,0.55)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--x-ivory)";
                (e.currentTarget as HTMLAnchorElement).style.color      = "var(--x-black)";
                (e.currentTarget as HTMLAnchorElement).style.outline    = "none";
              }}
            >
              {primaryCtaLabel}
            </Link>

            <Link
              href={secondaryCtaUrl}
              style={{
                fontFamily:    "var(--font-sans), system-ui, sans-serif",
                fontSize:      "0.5625rem",
                fontWeight:    600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color:         "var(--x-ivory)",
                background:    "transparent",
                padding:       "0.65rem 1.5rem",
                display:       "inline-block",
                outline:       "1px solid rgba(248,246,242,0.35)",
                transition:    "outline-color 220ms ease, background 220ms ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background    = "var(--x-ivory)";
                (e.currentTarget as HTMLAnchorElement).style.color         = "var(--x-black)";
                (e.currentTarget as HTMLAnchorElement).style.outlineColor  = "var(--x-ivory)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background   = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color        = "var(--x-ivory)";
                (e.currentTarget as HTMLAnchorElement).style.outlineColor = "rgba(248,246,242,0.35)";
              }}
            >
              {secondaryCtaLabel}
            </Link>
          </motion.div>
        </motion.div>

        {/* ── Bottom meta bar ─────────────────────────────────── */}
        <motion.div
          className="mt-4 hidden items-center justify-between lg:flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.1, ease: EASE, delay: 1.3 }}
        >
          <p
            style={{
              fontFamily:    "var(--font-sans), system-ui, sans-serif",
              fontSize:      "0.5rem",
              fontWeight:    500,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color:         "rgba(248,246,242,0.20)",
            }}
          >
            01&thinsp;—&thinsp;Monochrome Edit
          </p>

          {/* Scroll indicator — desktop only */}
          <div className="hidden lg:flex flex-col items-center gap-2" aria-hidden="true">
            <p
              style={{
                fontFamily:    "var(--font-sans), system-ui, sans-serif",
                fontSize:      "0.5rem",
                fontWeight:    500,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color:         "rgba(248,246,242,0.20)",
                writingMode:   "vertical-lr",
              }}
            >
              Scroll
            </p>
            <div
              className="relative overflow-hidden"
              style={{ width: 1, height: 40, backgroundColor: "rgba(248,246,242,0.10)" }}
            >
              <motion.div
                className="absolute left-0 top-0 w-full"
                style={{ height: 14, backgroundColor: "rgba(248,246,242,0.45)" }}
                animate={{ y: [0, 40] }}
                transition={{ duration: 1.3, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.7 }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
