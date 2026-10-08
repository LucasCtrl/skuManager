import { useState, type ReactNode } from "react";
import { STATUSES, type Status } from "../shared/rpc";
import { useT } from "./i18n";

export const btn =
  "rounded-md px-3 py-1.5 text-sm font-medium border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50";
export const btnPrimary =
  "rounded-md px-3 py-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50";
export const input =
  "w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm";

export function Modal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-neutral-900"
      >
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

const badge: Record<Status, string> = {
  "In development": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Active: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Retired: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300",
};

export function StatusBadge({ status }: { status: Status }) {
  const t = useT();
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${badge[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}

export const ErrorText = ({ error }: { error: string | null }) =>
  error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null;

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

type FormValues = { name: string; description: string; status: Status };

// Create (no status field) and edit dialog.
export function ProductDialog({
  title,
  initial,
  withStatus,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  title: string;
  initial: FormValues;
  withStatus: boolean;
  submitLabel: string;
  onSubmit: (v: FormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(v);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={title}>
      <form
        onSubmit={submit}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        className="space-y-3"
      >
        <label className="block text-sm">
          {t("product.name")} *
          <input
            autoFocus
            required
            className={`${input} mt-1`}
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          {t("product.description")}
          <textarea
            rows={4}
            className={`${input} mt-1`}
            value={v.description}
            onChange={(e) => setV({ ...v, description: e.target.value })}
          />
        </label>
        {withStatus && (
          <label className="block text-sm">
            {t("product.status")}
            <select
              className={`${input} mt-1`}
              value={v.status}
              onChange={(e) => setV({ ...v, status: e.target.value as Status })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        <ErrorText error={error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btn} onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button type="submit" className={btnPrimary} disabled={busy || !v.name.trim()}>
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
