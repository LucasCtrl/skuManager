import { useCallback, useEffect, useState } from "react";
import { type Lang, type Product, type StatusChange } from "../../../shared/rpc";
import { Icon } from "../../components/Icon";
import { FileExplorer } from "../../components/explorer/FileExplorer";
import { StatusBadge, StatusHistory } from "../../components/status";
import { btn, card } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { fmtDay, fmtRelative, useT } from "../../i18n";
import { api } from "../../rpc";
import { EditProductDialog } from "./ProductDialogs";

export function ProductPage({ id, lang }: { id: number; lang: Lang }) {
  const t = useT();
  const [data, setData] = useState<{ product: Product; history: StatusChange[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(
    () => api.getProduct({ id }).then(setData, (e) => setError(errMsg(e))),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);

  if (error)
    return (
      <main className="mx-auto max-w-[1120px] px-6 py-7">
        <ErrorText error={error} />
      </main>
    );
  if (!data) return null;
  const { product: p, history } = data;

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-7">
      <section className={`${card} flex flex-wrap items-start gap-6 p-6`}>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-canvas px-2 py-1 font-mono text-sm font-medium">
              {p.sku}
            </span>
            <StatusBadge status={p.status} />
          </div>
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em]">{p.name}</h1>
          {p.description && (
            <p className="m-0 max-w-[680px] whitespace-pre-wrap text-[15px] leading-[1.55] text-body">
              {p.description}
            </p>
          )}
          <div className="flex flex-wrap gap-5 pt-1 text-[13px] text-muted">
            <span>{t("product.created", { date: fmtDay(p.createdAt, lang) })}</span>
            <span>{t("product.updated", { date: fmtRelative(p.updatedAt, lang) })}</span>
          </div>
          <StatusHistory history={history} lang={lang} />
        </div>
        <button type="button" className={btn} onClick={() => setEditing(true)}>
          <Icon name="pencil" size={16} />
          {t("product.edit")}
        </button>
      </section>

      <FileExplorer key={p.sku} sku={p.sku} t={t} />

      {editing && (
        <EditProductDialog
          sku={p.sku}
          initial={p}
          onCancel={() => setEditing(false)}
          onSave={async (v) => {
            await api.updateProduct({ id, ...v });
            await load();
            setEditing(false);
          }}
        />
      )}
    </main>
  );
}
