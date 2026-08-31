"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn btn-primary w-full",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? "در حال انجام..." : children}
    </button>
  );
}

export function AuthForm({
  action,
  children,
}: {
  action: (
    prev: { error?: string; ok?: boolean } | null,
    formData: FormData,
  ) => Promise<{ error?: string; ok?: boolean }>;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3">
      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-ok">
          درخواست با موفقیت ثبت شد.
        </p>
      )}
      {children}
    </form>
  );
}
