"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Shirt, Folder, PanelsTopLeft, FileText, Package, Tag, Truck, Mail, type LucideIcon } from "lucide-react";
const groups: {title:string;links:{label:string;href:string;icon:LucideIcon}[]}[]=[
  {title:"Overview",links:[{label:"Dashboard",href:"/admin/dashboard",icon:LayoutDashboard}]},
  {title:"Catalog",links:[{label:"Products",href:"/admin/products",icon:Shirt},{label:"Categories",href:"/admin/categories",icon:Folder}]},
  {title:"Website",links:[{label:"Website editor",href:"/admin/website",icon:PanelsTopLeft},{label:"Pages & journal",href:"/admin/content",icon:FileText}]},
  {title:"Operations",links:[{label:"Orders",href:"/admin/orders",icon:Package},{label:"Promotions",href:"/admin/promotions",icon:Tag},{label:"Delivery",href:"/admin/delivery-zones",icon:Truck},{label:"Newsletter",href:"/admin/newsletter",icon:Mail}]},
];
export function AdminNavigation({onNavigate}:{onNavigate?:()=>void}){
 const path=usePathname();
 return <nav aria-label="Admin navigation" className="space-y-7">{groups.map(g=><div key={g.title}><p className="mb-2 px-3 text-xs text-neutral-600">{g.title}</p><div className="space-y-1">{g.links.map(({label,href,icon:Icon})=><Link key={href} href={href} onClick={onNavigate} aria-current={path.startsWith(href)?"page":undefined} className={`flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm transition-colors ${path.startsWith(href)?"bg-neutral-100 font-medium text-black":"text-neutral-600 hover:bg-neutral-50 hover:text-black"}`}><Icon size={17} strokeWidth={1.5}/>{label}</Link>)}</div></div>)}</nav>;
}
