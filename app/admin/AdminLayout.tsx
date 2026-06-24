import Link from "next/link";
import type { ReactNode } from "react";

type AdminLayoutProps = {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/delivery-zones", label: "Delivery" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/policies", label: "Policies" },
];

export function AdminLayout({
  eyebrow = "Xenon admin",
  title,
  action,
  children,
}: AdminLayoutProps) {
  return (
    <section className="bg-background">
      <div className="mx-auto grid min-h-[calc(100vh-10rem)] w-full max-w-7xl gap-8 px-6 py-10 sm:px-8 lg:grid-cols-[16rem_1fr]">
        <aside className="border border-black bg-white p-5 lg:sticky lg:top-6 lg:h-fit">
          <p className="mb-6 border-b border-black pb-4 text-xs font-semibold uppercase tracking-[0.3em]">
            Admin
          </p>
          <nav className="space-y-2" aria-label="Admin modules">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block border border-transparent px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-700 transition hover:border-black hover:text-black"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div>
          <div className="mb-8 flex flex-col gap-5 border-b border-black pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-neutral-600">
                {eyebrow}
              </p>
              <h1 className="text-4xl font-semibold tracking-normal text-black">
                {title}
              </h1>
            </div>
            {action}
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
