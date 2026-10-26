/**
 * MarqueeBar — Pure-CSS infinite horizontal ticker.
 * Two identical spans are placed side-by-side and the first half is
 * continuously scrolled to the left, creating a seamless loop.
 * Zero JS, no dependencies beyond Tailwind.
 */

type MarqueeBarProps = {
  items?: string[];
  dark?: boolean;
  className?: string;
};

const DEFAULT_ITEMS = [
  "Free shipping on orders over LKR 10,000",
  "New arrivals — SS26 Collection",
  "Made in Sri Lanka",
  "Monochrome essentials",
  "Complimentary gift wrapping available",
];

export function MarqueeBar({
  items = DEFAULT_ITEMS,
  dark = true,
  className = "",
}: MarqueeBarProps) {
  const separator = " · ";
  const text = items.join(separator) + separator;

  return (
    <div
      className={[
        "relative overflow-hidden",
        dark
          ? "bg-[--xenon-black] text-[--xenon-white]"
          : "bg-[--xenon-warm] text-[--xenon-black]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ height: 36 }}
      aria-label="Announcements"
    >
      {/* Fade-out edges */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16"
        style={{
          background: dark
            ? "linear-gradient(to right, #080808, transparent)"
            : "linear-gradient(to right, #f2efe9, transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16"
        style={{
          background: dark
            ? "linear-gradient(to left, #080808, transparent)"
            : "linear-gradient(to left, #f2efe9, transparent)",
        }}
      />

      <div className="flex h-full items-center animate-ticker whitespace-nowrap will-change-transform">
        {/* Two identical copies for seamless wrap */}
        <span
          className="inline-block px-8"
          style={{
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            fontSize: "0.625rem",
            fontWeight: 500,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}
        >
          {text}
          {text}
        </span>
        <span
          className="inline-block px-8"
          aria-hidden="true"
          style={{
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            fontSize: "0.625rem",
            fontWeight: 500,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}
        >
          {text}
          {text}
        </span>
      </div>
    </div>
  );
}
