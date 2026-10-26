"use client";
import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
type ControlProps = {
  id?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};
export function AdminField({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const uid = useId(),
    labelId = `${uid}-label`,
    errorId = `${uid}-error`,
    hintId = `${uid}-hint`;
  const control = isValidElement(children)
    ? (children as ReactElement<ControlProps>)
    : null;
  const id = control?.props.id || uid;
  return (
    <div className="editor-field" data-invalid={Boolean(error)}>
      <label
        id={labelId}
        htmlFor={id}
        className="mb-2 block text-sm font-medium"
      >
        {label}
      </label>
      {control
        ? cloneElement(control, {
            id,
            "aria-labelledby": labelId,
            "aria-invalid": Boolean(error) || control.props["aria-invalid"],
            "aria-describedby":
              [
                control.props["aria-describedby"],
                error ? errorId : null,
                hint ? hintId : null,
              ]
                .filter(Boolean)
                .join(" ") || undefined,
          })
        : children}
      {hint && (
        <p id={hintId} className="mt-2 text-xs text-neutral-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
