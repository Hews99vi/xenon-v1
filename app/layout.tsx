import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const instrument = localFont({
  src: "../public/fonts/InstrumentSans-Variable.ttf",
  variable: "--font-instrument",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: "Xenon",
  description: "Monochrome luxury fashion. Crafted in Sri Lanka.",
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
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${instrument.variable} h-full antialiased font-sans`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[var(--x-ivory)] text-[var(--x-black)]">
        {children}
      </body>
    </html>
  );
}
