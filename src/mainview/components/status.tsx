import { type Lang, type Status } from "../../shared/rpc";
import { fmtDateTime, useT } from "../i18n";

export const statusTone: Record<Status, { bg: string; fg: string; dot: string }> = {
  "In development": { bg: "bg-dev-bg", fg: "text-dev-fg", dot: "bg-dev-fg" },
  Active: { bg: "bg-active-bg", fg: "text-active-fg", dot: "bg-active-fg" },
  Retired: { bg: "bg-retired-bg", fg: "text-retired-fg", dot: "bg-retired-fg" },
  Research: { bg: "bg-research-bg", fg: "text-research-fg", dot: "bg-research-fg" },
};

export const Dot = ({ status, size = 6 }: { status: Status; size?: number }) => (
  <span
    className={`inline-block shrink-0 rounded-full ${statusTone[status].dot}`}
    style={{ width: size, height: size }}
  />
);

export function StatusBadge({ status }: { status: Status }) {
  const t = useT();
  const s = statusTone[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.fg}`}
    >
      <Dot status={status} />
      {t(`status.${status}`)}
    </span>
  );
}

// Collapsible list of status changes, newest first.
export function StatusHistory({
  history,
  lang,
}: {
  history: { status: Status; changedAt: string }[];
  lang: Lang;
}) {
  const t = useT();
  return (
    <details className="text-[13px] text-muted">
      <summary className="inline-flex min-h-8 cursor-pointer items-center font-medium text-ink">
        {t("product.history")}
      </summary>
      <ol className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0">
        {history
          .map((h, i) => ({ ...h, from: i ? history[i - 1].status : null }))
          .reverse()
          .map((h, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="w-[150px] tabular-nums">{fmtDateTime(h.changedAt, lang)}</span>
              <span
                className={`inline-flex items-center gap-1.5 font-medium ${statusTone[h.status].fg}`}
              >
                <Dot status={h.status} />
                {t(`status.${h.status}`)}
              </span>
              <span>
                {h.from
                  ? t("product.historyFrom", { status: t(`status.${h.from}`) })
                  : t("product.historyCreated")}
              </span>
            </li>
          ))}
      </ol>
    </details>
  );
}

// Status picker of the edit dialogs: one card per status, with its help text.
export function StatusOptions<S extends Status>({
  statuses,
  value,
  help,
  onChange,
}: {
  statuses: readonly S[];
  value: S;
  help: (s: S) => string;
  onChange: (s: S) => void;
}) {
  const t = useT();
  return (
    <fieldset role="radiogroup" className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-1.5 p-0 text-[13px] font-medium">{t("product.status")}</legend>
      {statuses.map((s) => {
        const on = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s)}
            className={`flex items-start gap-3 rounded-lg px-3.5 py-3 text-left text-ink ${
              on ? "border-[1.5px] border-ink bg-subtle" : "border border-line-strong bg-surface"
            }`}
          >
            <span
              className={`mt-px box-border flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[1.5px] ${
                on ? "border-accent" : "border-faint"
              }`}
            >
              {on && <span className="h-2 w-2 rounded-full bg-accent" />}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-2 text-[15px] font-medium">
                <Dot status={s} size={8} />
                {t(`status.${s}`)}
              </span>
              <span className="text-[13px] leading-[1.45] text-muted">{help(s)}</span>
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
