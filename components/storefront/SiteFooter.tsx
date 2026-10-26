"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { subscribeToNewsletter, type NewsletterActionState } from "@/app/newsletter/actions";
import type { SiteContent } from "@/lib/content/schema";
const initial: NewsletterActionState = { ok: false, message: "" };

export function SiteFooter({ site }: { site: SiteContent }) {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initial);
  const f = site.footer;
  return (
    <footer className="mt-auto bg-[#111] text-white">
      <div className="x-container py-12 sm:py-16">
        <div className="grid gap-12 border-b border-white/20 pb-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <Link href="/" aria-label="Xenon home" className="mb-7 inline-block"><BrandLogo light/></Link>
            {site.newsletter.enabled && <>
              <h2 className="text-2xl font-normal tracking-tight">{site.newsletter.title}</h2>
              {site.newsletter.body && <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-300">{site.newsletter.body}</p>}
              <form action={action} className="mt-5 flex max-w-md gap-3">
                <label className="sr-only" htmlFor="newsletter-email">Email address</label>
                <input id="newsletter-email" name="email" type="email" required autoComplete="email" placeholder="Email address" className="min-h-12 min-w-0 flex-1 border-b border-neutral-500 bg-transparent px-0 text-base text-white placeholder:!text-neutral-300"/>
                <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden"/>
                <button disabled={pending} className="inline-flex min-h-12 items-center gap-3 border-b border-white px-2 text-sm disabled:opacity-50" type="submit" aria-label={pending?"Joining newsletter":"Sign up for newsletter"}>{pending?"Joining…":"Sign up"}<ArrowRight size={18} strokeWidth={1.5}/></button>
              </form>
              {state.message && <p role="status" className={`mt-3 text-sm ${state.ok?"text-neutral-200":"text-red-300"}`}>{state.message}</p>}
            </>}
            {(f.supportEmail||f.supportPhone)&&<div className="mt-6 space-y-2 text-sm text-neutral-300">{f.supportEmail&&<a className="block underline" href={`mailto:${f.supportEmail}`}>{f.supportEmail}</a>}{f.supportPhone&&<a className="block" href={`tel:${f.supportPhone}`}>{f.supportPhone}</a>}</div>}
            <div className="mt-5 flex flex-wrap gap-5 text-sm text-neutral-300">
              {f.instagramUrl&&<a href={f.instagramUrl}>Instagram</a>}{f.tiktokUrl&&<a href={f.tiktokUrl}>TikTok</a>}{f.whatsappNumber&&<a href={`https://wa.me/${f.whatsappNumber.replace(/\D/g,"")}`}>WhatsApp</a>}
            </div>
          </div>
          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {f.columns.map((c,i)=><div key={i}><h3 className="mb-4 text-sm font-medium text-white">{c.title}</h3><ul className="space-y-1">{c.links.filter(l=>l.label&&l.href).map((l,j)=><li key={j}><Link className="inline-flex min-h-11 items-center text-sm text-neutral-300 hover:text-white hover:underline" href={l.href}>{l.label}</Link></li>)}</ul></div>)}
          </nav>
        </div>
        <div className="flex flex-wrap justify-between gap-4 pt-6 text-xs text-neutral-300"><span>LKR · Sri Lanka</span>{f.tagline&&<p>{f.tagline}</p>}<p>© {new Date().getFullYear()} Xenon</p></div>
      </div>
    </footer>
  );
}
