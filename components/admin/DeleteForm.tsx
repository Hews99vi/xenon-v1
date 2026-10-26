"use client";
import { useFormStatus } from "react-dom";
export function DeleteForm({
  action,
  id,
  label,
}: {
  action: (data: FormData) => Promise<void>;
  id: string;
  label: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${label}? This cannot be undone.`))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <DeleteButton />
    </form>
  );
}
function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="admin-button" disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
