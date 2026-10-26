"use client";

import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAdminAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {
  message: "",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(
    signInAdminAction,
    initialState,
  );

  return (
    <div className="w-full max-w-md bg-white p-7 sm:p-10">
      <Link href="/" aria-label="Xenon home" className="mb-10 inline-block"><BrandLogo/></Link>
      <div className="mb-8"><h1 className="text-3xl font-normal tracking-tight">Sign in to your workspace</h1><p className="mt-3 text-sm leading-6 text-neutral-600">Manage your catalog, website and orders.</p></div>

      <form className="space-y-5" action={formAction}>
        <input
          type="hidden"
          name="redirectedFrom"
          value={searchParams.get("redirectedFrom") || ""}
        />
        <div>
          <label
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-neutral-700"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="admin-input"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-neutral-700"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="admin-input"
          />
        </div>

        {state.message ? (
          <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="admin-button w-full"
        >
          {isPending ? "Signing in" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
