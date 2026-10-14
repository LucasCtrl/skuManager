import { useEffect, useState } from "react";
import { btn, field } from "../../components/styles";
import { ErrorText } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";
import { ConfirmEntry } from "./ConfirmEntry";
import { type Pending, Section, useEntries } from "./shared";

export function PricesSection() {
  const t = useT();
  const { entries, load } = useEntries();
  const [currency, setCurrency] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => {
    api.getCurrency({}).then(setCurrency);
  }, []);
  const units = entries.filter((e) => e.list === "unit");

  const ask = () => {
    const v = draft.trim().replace(/\s+/g, " ");
    if (!v) return setError(t("lists.enterUnit"));
    if (units.some((u) => u.code.toLowerCase() === v.toLowerCase()))
      return setError(t("lists.unitExists", { unit: v }));
    setPending({ list: "unit", name: v, code: v, typed: v });
  };

  return (
    <Section title={t("settings.prices")} text={t("settings.pricesText")}>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="set-cur" className="w-[90px] text-sm font-medium">
          {t("settings.currency")}
        </label>
        <input
          id="set-cur"
          maxLength={4}
          className={`${field} h-11 !w-20 text-center`}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          onBlur={() => api.setCurrency({ currency }).then(setCurrency)}
        />
        <span className="text-[13px] text-muted">
          {t("settings.currencySample", { sample: `${currency}18.40` })}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-medium">{t("settings.units")}</span>
        <div className="flex flex-wrap gap-2">
          {units.map((u) => (
            <span
              key={u.id}
              className="inline-flex h-8 items-center rounded-full border border-line bg-subtle px-3 text-sm"
            >
              {u.code}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
            <label htmlFor="set-unit" className="sr-only">
              {t("settings.newUnit")}
            </label>
            <input
              id="set-unit"
              className={`${field} h-11`}
              placeholder={t("settings.newUnitPlaceholder")}
              value={draft}
              onChange={(e) => (setDraft(e.target.value), setError(null))}
              onKeyDown={(e) => e.key === "Enter" && ask()}
            />
            <ErrorText error={error} />
          </div>
          <button type="button" className={btn} onClick={ask}>
            {t("settings.addUnit")}
          </button>
        </div>
        <p className="m-0 text-[13px] text-muted">{t("settings.unitsNote")}</p>
      </div>
      {pending && (
        <ConfirmEntry
          pending={pending}
          onBack={() => setPending(null)}
          onDone={() => (setPending(null), setDraft(""), load())}
        />
      )}
    </Section>
  );
}
