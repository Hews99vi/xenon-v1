"use client";

export function PrintButton() {
  return (
    <button
      className="border border-black bg-black px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white"
      type="button"
      onClick={() => window.print()}
    >
      Print
    </button>
  );
}
