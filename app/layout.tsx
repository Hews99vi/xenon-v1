import type { Metadata } from "next";
import Link from "next/link";
import { CartDrawer } from "@/components/cart/CartDrawer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Xenon",
  description: "A luxury storefront foundation built with Next.js and Supabase.",
  manifest: "/favicon/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      {
        url: "/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-black bg-white/95">
            <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 sm:px-8">
              <Link
                href="/"
                className="text-sm font-semibold uppercase tracking-[0.32em]"
              >
                Xenon
              </Link>
              <div className="flex items-center gap-5">
                <nav
                  aria-label="Primary navigation"
                  className="hidden items-center gap-8 text-xs font-medium uppercase tracking-[0.22em] text-neutral-700 sm:flex"
                >
                  <Link className="transition hover:text-black" href="/products">
                    Collection
                  </Link>
                  <Link
                    className="transition hover:text-black"
                    href="/categories/signature-collection"
                  >
                    Atelier
                  </Link>
                  <Link className="transition hover:text-black" href="/blog">
                    Blog
                  </Link>
                  <a
                    className="transition hover:text-black"
                    href="mailto:hello@example.com"
                  >
                    Contact
                  </a>
                </nav>
                <CartDrawer />
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-black bg-black text-white">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 text-xs uppercase tracking-[0.22em] text-neutral-300 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p>Footer placeholder</p>
              <p>Luxury commerce foundation</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
