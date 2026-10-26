"use client";
import {useRef,useState} from "react";
import {Menu} from "lucide-react";
import {Sheet,SheetContent,SheetTitle,SheetDescription} from "@/components/ui/sheet";
import {AdminNavigation} from "./AdminNavigation";
export function AdminMenu(){
 const [open,setOpen]=useState(false);const trigger=useRef<HTMLButtonElement>(null);
 return <div className="lg:hidden"><button ref={trigger} className="icon-button" aria-label="Open admin navigation" aria-expanded={open} onClick={()=>setOpen(true)}><Menu size={20} strokeWidth={1.5}/></button><Sheet open={open} onOpenChange={setOpen}><SheetContent finalFocus={trigger} side="left" className="w-[min(90vw,320px)] overflow-y-auto bg-white p-6"><SheetTitle className="text-xl font-medium">Xenon workspace</SheetTitle><SheetDescription>Catalog, website and store operations.</SheetDescription><div className="mt-7"><AdminNavigation onNavigate={()=>setOpen(false)}/></div></SheetContent></Sheet></div>;
}
