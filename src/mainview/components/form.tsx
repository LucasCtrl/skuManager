import { type ReactNode, useState } from "react";
import { errMsg } from "./text";

export const Field = ({
  id,
  label,
  children,
}: {
  id?: string;
  label: ReactNode;
  children: ReactNode;
}) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <label htmlFor={id} className="text-[13px] font-medium">
      {label}
    </label>
    {children}
  </div>
);

export const Req = () => (
  <span className="text-danger" aria-hidden="true">
    *
  </span>
);

// Shared submit/busy/error handling for the create and edit dialogs.
export function useSubmit(fn: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };
  return { busy, error, submit };
}
