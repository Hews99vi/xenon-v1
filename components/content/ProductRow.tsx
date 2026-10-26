"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { ProductSummary } from "@/lib/storefront";
import type { ContentLink } from "@/lib/content/schema";

export function ProductRow({products,title,eyebrow,body,link}: {products:ProductSummary[];title:string;eyebrow?:string;body?:string;link?:ContentLink}) {
  const row=useRef<HTMLDivElement>(null);
  const [edges,setEdges]=useState({previous:false,next:false});
  useEffect(()=>{
    const element=row.current;if(!element)return;
    const update=()=>setEdges({previous:element.scrollLeft>2,next:element.scrollLeft+element.clientWidth<element.scrollWidth-2});
    const observer=new ResizeObserver(update);observer.observe(element);element.addEventListener("scroll",update,{passive:true});update();
    return()=>{observer.disconnect();element.removeEventListener("scroll",update);};
  },[products.length]);
  if(!products.length)return null;
  const pages=Array.from({length:Math.ceil(products.length/4)},(_,i)=>products.slice(i*4,i*4+4));
  const scroll=(direction:number)=>row.current?.scrollBy({left:direction*row.current.clientWidth,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  return <section className="content-section" aria-label={title}>
    <div className="x-container section-header">
      <div><h2 className="section-heading">{title}</h2>{eyebrow&&<p className="mt-3 text-sm text-neutral-600">{eyebrow}</p>}{body&&<p className="mt-3 max-w-xl text-base text-neutral-600">{body}</p>}</div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {link?.label&&link.href&&<Link className="section-link" href={link.href}>{link.label}</Link>}
        {pages.length>1&&<div className="flex gap-1"><button className="icon-button border border-neutral-300" aria-label="Previous products" disabled={!edges.previous} onClick={()=>scroll(-1)}><ArrowLeft size={18} strokeWidth={1.5}/></button><button className="icon-button border border-neutral-300" aria-label="Next products" disabled={!edges.next} onClick={()=>scroll(1)}><ArrowRight size={18} strokeWidth={1.5}/></button></div>}
      </div>
    </div>
    <div ref={row} className="tile-row product-row" tabIndex={pages.length>1?0:undefined} aria-label={pages.length>1?`${title}, scroll for more products`:undefined}>
      {pages.map((page,i)=><div className="product-row-page" key={i}>{page.map(p=><ProductCard key={p.id} product={p} imageSizes="(min-width: 1024px) 25vw, 50vw"/>)}</div>)}
    </div>
  </section>;
}
