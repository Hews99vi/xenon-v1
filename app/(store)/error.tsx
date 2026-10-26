"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="x-container py-20"><h1 className="text-3xl font-semibold">We couldn’t load this page</h1><p className="mb-6 mt-4 text-neutral-600">Please try again in a moment.</p><button className="store-button" onClick={reset}>Try again</button></section>;}
