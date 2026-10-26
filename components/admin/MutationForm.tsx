"use client";

import { useActionState, type ReactNode } from "react";
import type { AdminActionState } from "./AdminActionForm";

export function MutationForm({
  action,
  children,
  confirmation,
  className,
  id,
}: {
  action: (data: FormData) => Promise<AdminActionState>;
  children: ReactNode;
  confirmation?: string;
  className?: string;
  id?: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_previous: AdminActionState, data: FormData) => {
      try {
        return await action(data);
      } catch {
        return { ok: false, message: "The change could not be saved. Please try again." };
      }
    },
    { ok: false, message: "" },
  );

  return (
    <form
      id={id}
      action={formAction}
      className={className}
      aria-busy={pending}
      onSubmit={(event) => {
        if (pending || (confirmation && !window.confirm(confirmation))) {
          event.preventDefault();
        }
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      <p role="status" className={`mutation-message ${state.ok ? "" : "text-red-800"}`}>
        {pending ? "Saving…" : state.message}
      </p>
    </form>
  );
}
