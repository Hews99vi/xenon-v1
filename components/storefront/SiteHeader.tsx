"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, type FormEvent } from "react";
import { Menu, Search, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/BrandLogo";
import { CartDrawer } from "@/components/cart/CartDrawer";
import type { SiteContent } from "@/lib/content/schema";

export function SiteHeader({ site, audiences }: { site: SiteContent; audiences: string[] }) {
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const links = site.navigation.filter(n => n.label && n.href && (n.audience === "all" || audiences.includes(n.audience)));
  if (!links.some(n => n.audience !== "all") && !links.some(n => n.href === "/products")) {
    links.unshift({ label: "All products", href: "/products", audience: "all", children: [] });
  }
  function search(event: FormEvent) {
    event.preventDefault();
    setSearchOpen(false);
    setMenu(false);
    router.push(query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : "/products");
  }
  return (
    <div className="sticky top-0 z-40 bg-white">
      {site.announcement.enabled && site.announcement.text && (
        <div className="bg-black px-5 py-2 text-center text-xs text-white">
          {site.announcement.href ? <Link href={site.announcement.href}>{site.announcement.text}</Link> : site.announcement.text}
        </div>
      )}
      <header className="border-b border-neutral-200 bg-white text-black">
        <div className="x-container flex h-[68px] items-center justify-between gap-4 lg:h-[88px]">
          <div className="flex items-center gap-3">
            <button ref={menuTrigger} className="icon-button -ml-2 lg:hidden" type="button" aria-label="Open navigation menu" aria-expanded={menu} onClick={() => setMenu(true)}><Menu size={20} strokeWidth={1.5}/></button>
            <Link href="/" aria-label="Xenon home"><BrandLogo/></Link>
          </div>
          <nav aria-label="Primary navigation" className="hidden items-center gap-8 text-[13px] lg:flex">
            {links.map(n => n.children.length ? (
              <details key={n.label} className="relative" onKeyDown={event => {
                if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); }
              }}>
                <summary className="cursor-pointer py-5">{n.label}</summary>
                <div className="absolute left-0 top-full grid min-w-60 gap-1 border border-neutral-200 bg-white p-5 shadow-lg">
                  <Link className="py-2 font-medium" href={n.href}>Shop all {n.label}</Link>
                  {n.children.filter(c=>c.label&&c.href).map(c=><Link className="py-2 hover:underline" key={c.href} href={c.href}>{c.label}</Link>)}
                </div>
              </details>
            ) : <Link key={n.label} className="nav-link py-5" aria-current={pathname === n.href ? "page" : undefined} href={n.href}>{n.label}</Link>)}
          </nav>
          <div className="flex items-center gap-2 sm:gap-5">
            <button ref={searchTrigger} className="icon-button gap-2 text-[13px]" type="button" aria-label="Search products" onClick={()=>setSearchOpen(true)}><Search size={18} strokeWidth={1.5}/><span className="hidden sm:inline">Search</span></button>
            <CartDrawer/>
          </div>
        </div>
      </header>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent finalFocus={menuTrigger} side="left" className="w-[min(90vw,400px)] overflow-y-auto bg-white p-6 text-black">
          <SheetTitle className="mb-1 text-2xl font-medium">Explore Xenon</SheetTitle>
          <SheetDescription>Collections, clothing and accessories.</SheetDescription>
          <nav aria-label="Mobile navigation" className="mt-8">
            {links.map(n=><div className="border-b border-neutral-200 py-3" key={n.label}>
              {n.children.length ? <details><summary className="py-3 text-lg">{n.label}</summary><Link href={n.href} className="block py-3 text-sm" onClick={()=>setMenu(false)}>Shop all {n.label}</Link>{n.children.filter(c=>c.label&&c.href).map(c=><Link href={c.href} key={c.href} className="block py-3 pl-4 text-sm text-neutral-600" onClick={()=>setMenu(false)}>{c.label}</Link>)}</details> : <Link href={n.href} onClick={()=>setMenu(false)} className="flex items-center justify-between py-3 text-lg">{n.label}<ArrowRight size={18} strokeWidth={1.5}/></Link>}
            </div>)}
          </nav>
          <button className="admin-secondary mt-8" type="button" onClick={()=>{setMenu(false);setSearchOpen(true);}}>Search products</button>
        </SheetContent>
      </Sheet>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent finalFocus={searchTrigger} className="max-w-[calc(100%-2rem)] rounded-sm bg-white p-6 sm:max-w-2xl sm:p-9">
          <DialogTitle className="text-2xl font-medium tracking-tight">Find your next piece</DialogTitle>
          <DialogDescription>Search products by name or description.</DialogDescription>
          <form onSubmit={search} className="mt-3 flex gap-3">
            <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search the collection" className="store-input min-w-0 flex-1" placeholder="Name or keyword"/>
            <button type="submit" className="store-button">Search</button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
