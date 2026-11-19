import { type Operation } from "../../../shared/rpc";
import { fmtMoney } from "../../i18n";
import { uiLang } from "../items/utils";

export const rateUnit = (o: Operation) => (o.rateKind === "hour" ? "h" : o.unit!.name);

// "0.95 € / h", "0.10 € / bend", or "—" without a rate.
export const RateText = ({ op, currency }: { op: Operation; currency: string }) =>
  op.rate ? (
    <>
      {fmtMoney(op.rate.amount / 1e4, currency, uiLang(), 4)}
      <span className="text-[13px] text-muted"> / {rateUnit(op)}</span>
    </>
  ) : (
    "—"
  );
