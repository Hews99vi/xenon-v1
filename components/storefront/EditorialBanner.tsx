"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Banner } from "@/lib/storefront";

type EditorialBannerProps = {
  banner?: Banner | null;
  heading?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string | null;
};

export function EditorialBanner({
  banner = null,
  heading,
  body,
  ctaLabel,
  ctaHref,
  imageUrl,
}: EditorialBannerProps) {
  const resolvedHeading = banner?.title || heading || "THE MONOCHROME UNIFORM";
  const resolvedBody =
    banner?.subtitle ||
    body ||
    "Built for quiet confidence — tailored essentials for day and night.";
  const resolvedCtaLabel = banner?.ctaLabel || ctaLabel || "SHOP NOW";
  const resolvedCtaHref = banner?.ctaUrl || ctaHref || "/products";
  const resolvedImageUrl = banner?.imageUrl || imageUrl || "/images/hero.png";
  const sectionRef = useRef<HTMLElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const image = imageRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!section || !image || reduceMotion.matches) {
      return;
    }

    const bannerSection = section;
    const bannerImage = image;
    let frame = 0;

    function update() {
      frame = 0;
      const rect = bannerSection.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const progress =
        (viewportHeight - rect.top) / (viewportHeight + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      const offset = (clamped - 0.5) * 34;

      bannerImage.style.transform = `translate3d(0, ${offset}px, 0) scale(1.06)`;
    }

    function requestUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-[clamp(24rem,64vw,44rem)] w-full overflow-hidden bg-black text-white"
      aria-label="Xenon campaign"
    >
      <img
        ref={imageRef}
        src={resolvedImageUrl}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-[112%] w-full object-cover object-center will-change-transform motion-reduce:h-full motion-reduce:transform-none"
        style={{ transform: "translate3d(0, 0, 0) scale(1.06)" }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.46) 34%, rgba(0,0,0,0.12) 72%), linear-gradient(0deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.06) 52%)",
        }}
        aria-hidden="true"
      />

      <div className="absolute inset-x-0 bottom-0 z-10 px-2 pb-6 sm:px-4 sm:pb-8 lg:px-6 lg:pb-12">
        <div className="max-w-[44rem]">
          <h2 className="max-w-[15ch] text-[clamp(1.7rem,4.2vw,4.75rem)] font-black uppercase italic leading-[0.92] tracking-[-0.015em] text-white">
            {resolvedHeading}
          </h2>
          <p className="mt-2 max-w-[31rem] text-xs font-medium leading-5 text-white/82 sm:text-[0.82rem]">
            {resolvedBody}
          </p>
          <Link
            href={resolvedCtaHref}
            className="mt-4 inline-flex bg-white px-5 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            {resolvedCtaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
