import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";

export const metadata: Metadata = {
  title: "Account | Xenon",
  description: "Manage your Xenon shopping experience.",
};

export default function AccountPage() {
  return (
    <section className="bg-[var(--x-ivory)]">
      <div className="x-container flex min-h-[60vh] items-center py-16 sm:py-24">
        <div className="max-w-2xl">
          <h1 className="max-w-[15ch] text-4xl font-normal leading-[1.1] tracking-[-0.035em] sm:text-6xl">
            Guest shopping, made simple.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-black/60">
            Xenon currently supports guest checkout, so you can shop without creating a password or account.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="store-button"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Shop collection
            </Link>
            <Link
              href="/products?tag=new"
              className="admin-secondary"
            >
              New arrivals
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
