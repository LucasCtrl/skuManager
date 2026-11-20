import { useCallback, useEffect, useState } from "react";
import {
  type CompositionLine,
  type Cost,
  type Lang,
  type PartVersion,
  type Product,
  type StatusChange,
  type Variant,
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
import { CostBox, CostText } from "../parts/Cost";
import { NewPartDialog } from "../parts/PartDialogs";
import { VersionRows } from "../parts/VersionRows";
import { EditProductDialog } from "./ProductDialogs";
import { NewVariantDialog } from "./VariantDialogs";

type Data = {
  product: Product;
  history: StatusChange[];
  variants: Variant[];
  cost: Cost; // the product's: its composition, or the range of its variants
  parts: PartVersion[];
  lines: CompositionLine[];
  compositionCost: Cost;
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
  const [dialog, setDialog] = useState<null | "edit" | "part" | "variant">(null);

  const load = useCallback(
    () =>
      Promise.all([
        api.getProduct({ id }),
        api.listPartVersions({ query: "", status: null, productId: id }),
        api.getComposition({ owner: { kind: "product", id } }),
      ]).then(
        ([p, parts, c]) => setData({ ...p, parts, lines: c.lines, compositionCost: c.cost }),
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
  const { product: p, history, variants } = data;
  const locked = p.status === "Retired";

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-7">
      <section className={`${card} flex flex-wrap items-start gap-6 p-6`}>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-canvas px-2 py-1 font-mono text-sm font-medium">
              {p.sku}
            </span>
            <StatusBadge status={p.status} />
            {(data.lines.some((l) => l.toReview) || variants.some((v) => v.toReview)) && (
              <ToReviewBadge />
            )}
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

      <section aria-labelledby="variants-title" className={card}>
        <div className="box-border flex min-h-16 flex-wrap items-center gap-3 border-b border-line py-2.5 pl-5 pr-3">
          <h2 id="variants-title" className="m-0 text-base font-semibold">
            {t("variants.title")}
          </h2>
          <span className="text-[13px] text-muted">
            {locked ? t("comp.locked") : t("variants.count", { n: variants.length })}
          </span>
          <span className="ml-auto" />
          {!locked && (
            <button type="button" className={toolBtn} onClick={() => setDialog("variant")}>
              <Icon name="plus" size={16} strokeWidth={2} />
              {t("variants.new")}
            </button>
          )}
        </div>
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onNavigate({ name: "variant", id: v.id })}
            className="flex w-full flex-wrap items-center gap-3 border-b border-divider px-5 py-3 text-left text-ink hover:bg-subtle focus-visible:-outline-offset-2"
          >
            <span className="break-all font-mono text-[13px] font-medium">{v.sku}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-muted">{v.name}</span>
            {v.toReview && <ToReviewBadge />}
            <span className="text-sm tabular-nums">
              <CostText cost={v.cost} currency={currency} />
            </span>
          </button>
        ))}
        {!variants.length && (
          <div className="px-5 py-8 text-center text-sm text-muted">{t("variants.none")}</div>
        )}
      </section>

      {!variants.length && (
        <Composition
          owner={{ kind: "product", id }}
          lines={data.lines}
          cost={data.compositionCost}
          currency={currency}
          lang={lang}
          locked={locked}
          onOpen={(l) => onNavigate(lineTarget(l))}
          onChange={load}
        />
      )}

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
      {dialog === "variant" && (
        <NewVariantDialog
          productId={id}
          variants={variants}
          copyFrom={null}
          onCancel={() => setDialog(null)}
          onCreate={async (v) =>
            onNavigate({
              name: "variant",
              id: (await api.createVariant({ productId: id, ...v })).id,
            })
          }
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
