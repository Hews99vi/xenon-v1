"use client";

import { useCallback, useEffect, useState, useRef, useTransition, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CategorySummary, ProductSummary } from "@/lib/storefront";
import { ProductCard } from "./ProductCard";

type Filters = { gender?: string; category: string; color: string; size: string; minPrice: string; maxPrice: string; search: string; sort: string };
type Props = {
  initialProducts: ProductSummary[];
  categories: CategorySummary[];
  colors: string[];
  sizes: string[];
  pagination: { currentPage: number; pageSize: number; totalCount: number; totalPages: number; hasNextPage: boolean };
  selectedFilters: Filters;
};
const sorts = [{label:"Newest",value:"newest"},{label:"Price: low to high",value:"price-asc"},{label:"Price: high to low",value:"price-desc"}];

export function ProductFilters({initialProducts,categories,colors,sizes,pagination,selectedFilters}:Props) {
  const router=useRouter(),pathname=usePathname(),searchParams=useSearchParams();
  const [pending,startTransition]=useTransition();
  const [searchInput,setSearchInput]=useState({value:selectedFilters.search,source:selectedFilters.search});
  const search=searchInput.source===selectedFilters.search?searchInput.value:selectedFilters.search;
  const setSearch=(value:string)=>setSearchInput({value,source:selectedFilters.search});
  const [open,setOpen]=useState(false);
  const trigger=useRef<HTMLButtonElement>(null);
  const update=useCallback((key:string,value:string)=>{
    const params=new URLSearchParams(searchParams.toString());
    if(value)params.set(key,value);else params.delete(key);
    if(key!=="page")params.delete("page");
    let destination=pathname;
    if(key==="category"&&pathname.startsWith("/categories/")){
      destination=value?`/categories/${encodeURIComponent(value)}`:"/products";params.delete("category");
    }
    startTransition(()=>router.replace(params.size?`${destination}?${params}`:destination,{scroll:false}));
  },[pathname,router,searchParams]);
  useEffect(()=>{
    if(search===selectedFilters.search)return;
    const timeout=window.setTimeout(()=>update("q",search),350);return()=>window.clearTimeout(timeout);
  },[search,selectedFilters.search,update]);
  const applied=[
    {key:"q",value:selectedFilters.search,label:`Search: ${selectedFilters.search}`},
    {key:"gender",value:selectedFilters.gender,label:selectedFilters.gender==="women"?"Women":"Men"},
    {key:"category",value:selectedFilters.category,label:categories.find(c=>c.slug===selectedFilters.category)?.name||selectedFilters.category},
    {key:"color",value:selectedFilters.color,label:selectedFilters.color},
    {key:"size",value:selectedFilters.size,label:`Size: ${selectedFilters.size}`},
    {key:"minPrice",value:selectedFilters.minPrice,label:`From LKR ${selectedFilters.minPrice}`},
    {key:"maxPrice",value:selectedFilters.maxPrice,label:`Up to LKR ${selectedFilters.maxPrice}`},
  ].filter(f=>f.value);
  function clear(){setSearch("");startTransition(()=>router.replace("/products",{scroll:false}));setOpen(false);}
  const controls=<div className="grid gap-5 sm:grid-cols-2">
    <Field label="Search"><input className="store-input" placeholder="Name or keyword" value={search} onChange={e=>setSearch(e.target.value)}/></Field>
    <Field label="Audience"><Select value={selectedFilters.gender||""} onChange={v=>update("gender",v)}><option value="">All audiences</option><option value="women">Women</option><option value="men">Men</option></Select></Field>
    <Field label="Category"><Select value={selectedFilters.category} onChange={v=>update("category",v)}><option value="">All categories</option>{categories.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</Select></Field>
    <Field label="Color"><Select value={selectedFilters.color} onChange={v=>update("color",v)}><option value="">All colors</option>{colors.map(c=><option key={c} value={c}>{c}</option>)}</Select></Field>
    <Field label="Size"><Select value={selectedFilters.size} onChange={v=>update("size",v)}><option value="">All sizes</option>{sizes.map(s=><option key={s} value={s}>{s}</option>)}</Select></Field>
    <Field label="Minimum price (LKR)"><input className="store-input" type="number" min="0" step="0.01" value={selectedFilters.minPrice} placeholder="No minimum" onChange={e=>update("minPrice",e.target.value)}/></Field>
    <Field label="Maximum price (LKR)"><input className="store-input" type="number" min="0" step="0.01" value={selectedFilters.maxPrice} placeholder="No maximum" onChange={e=>update("maxPrice",e.target.value)}/></Field>
  </div>;
  const {currentPage,pageSize,totalCount,totalPages,hasNextPage}=pagination;
  const from=(currentPage-1)*pageSize+1,to=Math.min(currentPage*pageSize,totalCount);
  return <div aria-busy={pending}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-y border-neutral-200 py-4">
      <button ref={trigger} type="button" className="inline-flex min-h-11 items-center gap-3 text-sm" onClick={()=>setOpen(true)}><SlidersHorizontal size={17} strokeWidth={1.5}/>Filter{applied.length?` (${applied.length})`:""}</button>
      <p className="order-3 w-full text-sm text-neutral-600 sm:order-none sm:w-auto" role="status">{pending?"Updating results…":totalCount?`${from}–${to} of ${totalCount} pieces`:"0 pieces"}</p>
      <label className="flex min-h-11 items-center gap-2 text-sm"><span className="sr-only">Sort products</span><select className="max-w-[190px] border-0 bg-white py-2 text-sm" value={selectedFilters.sort||"newest"} onChange={e=>update("sort",e.target.value==="newest"?"":e.target.value)}>{sorts.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
    </div>
    {applied.length>0&&<div className="mb-7 flex flex-wrap items-center gap-2">{applied.map(f=><button key={f.key} className="inline-flex min-h-11 items-center gap-3 border border-neutral-300 px-3 text-xs hover:border-black" onClick={()=>{if(f.key==="q")setSearch("");update(f.key,"");}} aria-label={`Remove filter ${f.label}`}>{f.label}<X size={14}/></button>)}<button className="min-h-11 px-3 text-xs underline" onClick={clear}>Clear all</button></div>}
    <Sheet open={open} onOpenChange={setOpen}><SheetContent finalFocus={trigger} className="w-full overflow-y-auto bg-white p-6 sm:w-[480px] sm:max-w-[95vw]">
      <SheetTitle className="text-2xl font-medium tracking-tight">Refine the collection</SheetTitle><SheetDescription>Choose the pieces that suit you. Results update as you filter.</SheetDescription>
      <div className="my-6">{controls}</div><div className="mt-auto flex flex-wrap gap-3 border-t pt-5"><button className="store-button flex-1" onClick={()=>setOpen(false)}>Show results</button>{applied.length>0&&<button className="admin-secondary" onClick={clear}>Clear all</button>}</div>
    </SheetContent></Sheet>
    {initialProducts.length?<><div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">{initialProducts.map(p=><ProductCard key={p.id} product={p}/>)}</div>
      {totalPages>1&&<nav aria-label="Product pagination" className="mt-12 flex items-center justify-between gap-3 border-t pt-5"><button className="admin-secondary !px-3" disabled={currentPage<=1||pending} onClick={()=>update("page",currentPage>2?String(currentPage-1):"")}><ChevronLeft size={17}/>Previous</button><p className="text-sm text-neutral-600">{currentPage} / {totalPages}</p><button className="admin-secondary !px-3" disabled={!hasNextPage||pending} onClick={()=>update("page",String(currentPage+1))}>Next<ChevronRight size={17}/></button></nav>}</>:<div className="flex min-h-80 flex-col items-center justify-center bg-neutral-50 px-6 text-center"><h2 className="text-2xl font-normal tracking-tight">No matching pieces</h2><p className="mb-6 mt-3 max-w-sm text-sm text-neutral-600">Try another search or remove a filter to see more of the collection.</p><button className="store-button" onClick={clear}>Browse all products</button></div>}
  </div>;
}
function Field({label,children}:{label:string;children:ReactNode}){return <label className="editor-field"><span>{label}</span>{children}</label>;}
function Select({value,onChange,children}:{value:string;onChange:(value:string)=>void;children:ReactNode}){return <select className="store-input" value={value} onChange={e=>onChange(e.target.value)}>{children}</select>;}
