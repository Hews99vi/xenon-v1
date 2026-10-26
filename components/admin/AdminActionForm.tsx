"use client";

import { useActionState, type ReactNode } from "react";

export type AdminActionState = {
  ok: boolean;
  message: string;
};

type AdminAction = (
  previousState: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

export function AdminActionForm({
  action,
  children,
  className,
}: {
  action: AdminAction;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {
    ok: false,
    message: "",
  });

  return (
    <form action={formAction} className={className}>
      <fieldset disabled={isPending} className="min-w-0 space-y-4 contents">
        {children}
      </fieldset>
      {state.message ? (
        <p
          className={
            state.ok
              ? "border border-black/20 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
              : "border border-red-700/40 bg-red-50 px-3 py-2 text-sm text-red-900"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <span className="block text-sm text-neutral-600" aria-live="polite">
        {isPending ? "Saving…" : ""}
      </span>
    </form>
  );
}
