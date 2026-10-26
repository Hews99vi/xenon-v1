import Link from "next/link";
import type {ReactNode} from "react";
import {ExternalLink,LogOut} from "lucide-react";
import {BrandLogo} from "@/components/BrandLogo";
import {AdminNavigation} from "@/components/admin/AdminNavigation";
import {AdminMenu} from "@/components/admin/AdminMenu";
import {signOutAdmin} from "./actions";
export function AdminLayout({title,action,children}:{eyebrow?:string;title:string;action?:ReactNode;children:ReactNode}){
 return <div className="admin-shell admin-workspace">
  <a href="#admin-main" className="skip-link">Skip to workspace</a>
  <header className="admin-topbar"><div className="flex min-w-0 items-center gap-3"><AdminMenu/><Link href="/admin/dashboard" aria-label="Xenon admin home"><BrandLogo/></Link><span className="hidden border-l border-neutral-300 pl-5 text-xs text-neutral-600 sm:inline">Workspace</span></div><div className="flex items-center gap-3 sm:gap-6"><Link href="/" target="_blank" className="inline-flex min-h-11 items-center gap-2 text-xs sm:text-sm">View store<ExternalLink size={14} strokeWidth={1.5}/></Link><form action={signOutAdmin}><button className="inline-flex min-h-11 items-center gap-2 text-xs sm:text-sm" type="submit"><LogOut size={16} strokeWidth={1.5}/><span className="hidden sm:inline">Sign out</span><span className="sr-only sm:hidden">Sign out</span></button></form></div></header>
  <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]"><aside className="hidden min-h-[calc(100vh-76px)] border-r border-neutral-200 bg-white p-5 lg:block"><div className="sticky top-6"><AdminNavigation/></div></aside><main id="admin-main" className="admin-main"><div className="admin-page-heading"><h1>{title}</h1>{action}</div>{children}</main></div>
 </div>;
}
