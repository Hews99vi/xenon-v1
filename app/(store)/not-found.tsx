import Link from "next/link";
export default function NotFound(){return <section className="x-container py-20"><p className="text-sm text-neutral-500">404</p><h1 className="my-4 text-3xl font-semibold">Page not found</h1><p className="mb-6 text-neutral-600">This page or product is no longer available.</p><Link className="store-button" href="/products">Shop the collection</Link></section>;}
