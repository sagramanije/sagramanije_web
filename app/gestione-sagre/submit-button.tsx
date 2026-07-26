"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  pendingLabel = "Salvataggio…",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full rounded-2xl bg-primary px-5 py-3 font-bold text-white transition hover:bg-primary-ink disabled:cursor-wait disabled:opacity-60 sm:w-auto"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
