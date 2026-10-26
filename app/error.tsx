"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="mx-auto max-w-xl px-6 py-24"><h1 className="text-3xl font-semibold">We couldn’t load the website</h1><p className="my-5">Please try again in a moment.</p><button className="store-button" onClick={reset}>Try again</button></main>;}
