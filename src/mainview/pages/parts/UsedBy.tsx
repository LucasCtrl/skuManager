import { useEffect, useState } from "react";
import { type Component, type UsedBy as Row } from "../../../shared/rpc";
import { type Page } from "../../App";
import { card } from "../../components/styles";
import { useT } from "../../i18n";
import { api } from "../../rpc";

// Products and part versions whose composition uses this item, operation or version.
export function UsedBy({
  component,
  onNavigate,
}: {
  component: Component;
  onNavigate: (p: Page) => void;
}) {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    api.usedBy({ component: { kind: component.kind, id: component.id } }).then(setRows);
  }, [component.kind, component.id]);

  return (
    <section aria-labelledby="ub-title" className={card}>
      <h2 id="ub-title" className="m-0 border-b border-line px-5 py-4 text-base font-semibold">
        {t("usedBy.title")}
      </h2>
      {rows.map((r) => (
        <button
          key={`${r.kind}:${r.id}`}
          type="button"
          onClick={() => onNavigate({ name: r.kind, id: r.id })}
          className="flex w-full flex-wrap items-center gap-3 border-b border-divider px-5 py-3 text-left text-ink hover:bg-subtle focus-visible:-outline-offset-2"
        >
          <span className="break-all font-mono text-[13px] font-medium">{r.sku}</span>
          <span className="min-w-0 flex-1 truncate text-sm text-muted">{r.name}</span>
          <span className="text-xs text-muted">{t(`usedBy.${r.kind}`)}</span>
        </button>
      ))}
      {!rows.length && (
        <div className="px-5 py-8 text-center text-sm text-muted">{t("usedBy.none")}</div>
      )}
    </section>
  );
}
