import { type Cost } from "../../../shared/rpc";
import { fmtMoney, useT } from "../../i18n";
import { uiLang } from "../items/utils";

// "€1.80", "€1.80 partial" when some line has no price or rate, "—" when nothing is known.
export function CostText({ cost, currency }: { cost: Cost; currency: string }) {
  const t = useT();
  if (cost.value == null) return <>—</>;
  return (
    <>
      {fmtMoney(cost.value, currency, uiLang())}
      {cost.partial && (
        <span title={t("cost.partialHelp")} className="ml-1.5 text-xs font-medium text-warn">
          {t("cost.partial")}
        </span>
      )}
    </>
  );
}

export const CostBox = ({ cost, currency }: { cost: Cost; currency: string }) => {
  const t = useT();
  return (
    <div className="flex min-w-40 flex-col items-end gap-0.5 rounded-lg border border-divider bg-subtle px-4 py-3">
      <span className="text-xs text-muted">{t("cost.label")}</span>
      <span className="text-2xl font-semibold tabular-nums">
        <CostText cost={cost} currency={currency} />
      </span>
    </div>
  );
};
