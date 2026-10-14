import { useT } from "../i18n";

// "All" + one chip per status, each with its count. `null` = All.
export function FilterChips<S extends string>({
  value,
  options,
  onChange,
}: {
  value: S | null;
  options: { key: S | null; label: string; count: number }[];
  onChange: (v: S | null) => void;
}) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t("list.filter")} className="-mt-1 flex flex-wrap gap-2">
      {options.map(({ key, label, count }) => {
        const on = value === key;
        return (
          <button
            key={key ?? "all"}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(key)}
            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium hover:border-ink ${
              on ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-ink"
            }`}
          >
            {label}
            <span className="text-xs tabular-nums opacity-75">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
