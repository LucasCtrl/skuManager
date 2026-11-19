import { useCallback, useEffect, useState } from "react";
import {
  type CompositionLine,
  type Cost,
  type Lang,
  type PartStatusChange,
  type PartVersion,
} from "../../../shared/rpc";
import { type Page } from "../../App";
import { Icon } from "../../components/Icon";
import { FileExplorer } from "../../components/explorer/FileExplorer";
import { StatusBadge, StatusHistory, ToReviewBadge } from "../../components/status";
import { btn, card } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { fmtDay, fmtRelative, useT } from "../../i18n";
import { api } from "../../rpc";
import { useCurrency } from "../items/utils";
import { Composition, lineTarget } from "./Composition";
import { CostBox } from "./Cost";
import { EditVersionDialog, NewVersionDialog } from "./PartDialogs";
import { UsedBy } from "./UsedBy";
import { VersionRows } from "./VersionRows";

type Data = {
  version: PartVersion;
  history: PartStatusChange[];
  siblings: PartVersion[];
  lines: CompositionLine[];
  cost: Cost;
};

export function PartPage({
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
  const [dialog, setDialog] = useState<null | "edit" | "version">(null);

  const load = useCallback(
    () =>
      Promise.all([
        api.getPartVersion({ id }),
        api.getComposition({ owner: { kind: "version", id } }),
      ]).then(
        ([v, c]) => setData({ ...v, ...c }),
        (e) => setError(errMsg(e)),
      ),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);

  if (!data)
    return (
      <main className="mx-auto max-w-[1120px] px-6 py-7">
        <ErrorText error={error} />
      </main>
    );
  const { version: v, history, siblings } = data;

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-7">
      <section className={`${card} flex flex-wrap items-start gap-6 p-6`}>
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="break-all rounded-md bg-canvas px-2 py-1 font-mono text-sm font-medium">
              {v.sku}
            </span>
            <StatusBadge status={v.status} />
            {data.lines.some((l) => l.toReview) && <ToReviewBadge />}
          </div>
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em]">
            {v.name} <span className="font-normal text-muted">v{v.version}</span>
          </h1>
          {v.description && (
            <p className="m-0 max-w-[680px] whitespace-pre-wrap text-[15px] leading-[1.55] text-body">
              {v.description}
            </p>
          )}
          <dl className="m-0 flex flex-col gap-[3px]">
            <dt className="text-xs text-muted">{t("parts.origin")}</dt>
            <dd className="m-0">
              <button
                type="button"
                className="inline-flex items-baseline gap-2 rounded text-[15px] font-medium hover:underline"
                onClick={() => onNavigate({ name: "product", id: v.product.id })}
              >
                <span className="font-mono text-[13px]">{v.product.sku}</span>
                {v.product.name}
              </button>
            </dd>
          </dl>
          <div className="flex flex-wrap gap-5 text-[13px] text-muted">
            <span>{t("product.created", { date: fmtDay(v.createdAt, lang) })}</span>
            <span>{t("product.updated", { date: fmtRelative(v.updatedAt, lang) })}</span>
          </div>
          <StatusHistory history={history} lang={lang} />
        </div>
        <div className="flex flex-col items-end gap-4">
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={btn} onClick={() => setDialog("version")}>
              <Icon name="copy" size={16} />
              {t("parts.newVersion")}
            </button>
            <button type="button" className={btn} onClick={() => setDialog("edit")}>
              <Icon name="pencil" size={16} />
              {t("product.edit")}
            </button>
          </div>
          <CostBox cost={v.cost} currency={currency} />
        </div>
      </section>

      {siblings.length > 0 && (
        <section aria-labelledby="sib-title" className={card}>
          <h2 id="sib-title" className="m-0 border-b border-line px-5 py-4 text-base font-semibold">
            {t("parts.otherVersions")}
          </h2>
          <VersionRows versions={siblings} onOpen={(id) => onNavigate({ name: "version", id })} />
        </section>
      )}

      <Composition
        owner={{ kind: "version", id }}
        lines={data.lines}
        cost={data.cost}
        currency={currency}
        lang={lang}
        onOpen={(l) => onNavigate(lineTarget(l))}
        onChange={load}
      />

      <UsedBy component={{ kind: "version", id }} onNavigate={onNavigate} />

      <FileExplorer key={v.sku} sku={v.sku} t={t} />

      {dialog === "edit" && (
        <EditVersionDialog
          version={v}
          siblings={siblings}
          onCancel={() => setDialog(null)}
          onSave={async (x) => {
            await api.updatePartVersion({ id, ...x });
            await load();
            setDialog(null);
          }}
        />
      )}
      {dialog === "version" && (
        <NewVersionDialog
          from={v}
          onCancel={() => setDialog(null)}
          onCreate={async () =>
            onNavigate({ name: "version", id: (await api.newVersion({ fromId: id })).id })
          }
        />
      )}
    </main>
  );
}
