import { useCallback, useEffect, useState } from "react";
import {
  type CompositionLine,
  type Cost,
  type Lang,
  type PartVersion,
  type Product,
  type StatusChange,
} from "../../../shared/rpc";
import { type Page } from "../../App";
import { Icon } from "../../components/Icon";
import { FileExplorer } from "../../components/explorer/FileExplorer";
import { StatusBadge, StatusHistory, ToReviewBadge } from "../../components/status";
import { btn, card, toolBtn } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { fmtDay, fmtRelative, useT } from "../../i18n";
import { api } from "../../rpc";
import { useCurrency } from "../items/utils";
import { Composition, lineTarget } from "../parts/Composition";
import { CostBox } from "../parts/Cost";
import { NewPartDialog } from "../parts/PartDialogs";
import { VersionRows } from "../parts/VersionRows";
import { EditProductDialog } from "./ProductDialogs";

type Data = {
  product: Product;
  history: StatusChange[];
  parts: PartVersion[];
  lines: CompositionLine[];
  cost: Cost;
};

export function ProductPage({
  id,
  lang,
  onNavigate,
}: {
  id: number;
  lang: Lang;
  onNavigate: (p: Page) => void;
}) {
  const t = useT();
  const currency = useCurrency();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "edit" | "part">(null);

  const load = useCallback(
    () =>
      Promise.all([
        api.getProduct({ id }),
        api.listPartVersions({ query: "", status: null, productId: id }),
        api.getComposition({ owner: { kind: "product", id } }),
      ]).then(
        ([p, parts, c]) => setData({ ...p, parts, ...c }),
        (e) => setError(errMsg(e)),
      ),
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
            {data.lines.some((l) => l.toReview) && <ToReviewBadge />}
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
        <div className="flex flex-col items-end gap-4">
          <button type="button" className={btn} onClick={() => setDialog("edit")}>
            <Icon name="pencil" size={16} />
            {t("product.edit")}
          </button>
          <CostBox cost={data.cost} currency={currency} />
        </div>
      </section>

      <section aria-labelledby="parts-title" className={card}>
        <div className="box-border flex min-h-16 flex-wrap items-center gap-3 border-b border-line py-2.5 pl-5 pr-3">
          <h2 id="parts-title" className="m-0 text-base font-semibold">
            {t("parts.ofProduct")}
          </h2>
          <span className="text-[13px] text-muted">{t("parts.ofProductNote")}</span>
          <span className="ml-auto" />
          <button type="button" className={toolBtn} onClick={() => setDialog("part")}>
            <Icon name="plus" size={16} strokeWidth={2} />
            {t("parts.new")}
          </button>
        </div>
        <VersionRows versions={data.parts} onOpen={(id) => onNavigate({ name: "version", id })} />
        {!data.parts.length && (
          <div className="px-5 py-8 text-center text-sm text-muted">{t("parts.noneOfProduct")}</div>
        )}
      </section>

      <Composition
        owner={{ kind: "product", id }}
        lines={data.lines}
        cost={data.cost}
        currency={currency}
        lang={lang}
        locked={p.status === "Retired"}
        onOpen={(l) => onNavigate(lineTarget(l))}
        onChange={load}
      />

      <FileExplorer key={p.sku} sku={p.sku} t={t} />

      {dialog === "edit" && (
        <EditProductDialog
          sku={p.sku}
          initial={p}
          onCancel={() => setDialog(null)}
          onSave={async (v) => {
            await api.updateProduct({ id, ...v });
            await load();
            setDialog(null);
          }}
        />
      )}
      {dialog === "part" && (
        <NewPartDialog
          productId={id}
          onCancel={() => setDialog(null)}
          onCreate={async (v) =>
            onNavigate({ name: "version", id: (await api.createPart({ productId: id, ...v })).id })
          }
        />
      )}
    </main>
  );
}
