"use client";

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
    <div className="w-full max-w-md border border-black bg-white p-8 shadow-[12px_12px_0_#0a0a0a]">
      <div className="mb-8 border-b border-black pb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-neutral-600">
          Admin access
        </p>
        <h1 className="text-3xl font-semibold tracking-normal text-black">
          Sign in to Xenon
        </h1>
      </div>

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
            className="h-12 w-full border border-black bg-white px-4 text-sm text-black outline-none transition focus:shadow-[4px_4px_0_#0a0a0a]"
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
            className="h-12 w-full border border-black bg-white px-4 text-sm text-black outline-none transition focus:shadow-[4px_4px_0_#0a0a0a]"
          />
        </div>

        {state.message ? (
          <p className="border border-black bg-neutral-100 px-4 py-3 text-sm text-black">
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="h-12 w-full border border-black bg-black px-5 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-500"
        >
          {isPending ? "Signing in" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
