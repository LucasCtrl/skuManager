import { Fragment, useState } from "react";
import { type ListEntry, type ListName, LISTS } from "../../../shared/rpc";
import { toCode } from "../../../shared/sku";
import { btn, card, field } from "../../components/styles";
import { Code, ErrorText, Rich } from "../../components/text";
import { useT } from "../../i18n";
import { ConfirmEntry } from "./ConfirmEntry";
import { type Pending, useEntries } from "./shared";

export const TABS = LISTS.filter((l) => l !== "unit");

// Short-code examples shown under the form, per tab.
export const HINTS: Record<string, [string, string][]> = {
  seller: [
    ["L'acrylic", "LACRY"],
    ["Bossard", "BSSRD"],
  ],
  materialType: [
    ["PMMA", "PMMA"],
    ["Plywood", "PLY"],
  ],
  partType: [
    ["Screw", "SCRW"],
    ["Cardboard box", "BOX"],
  ],
  colour: [
    ["Yellow", "YEL"],
    ["Light blue", "LBLU"],
    ["Orange", "ORNG"],
  ],
  finish: [
    ["Transparent", "TRS"],
    ["Opaque", "OPQ"],
  ],
};

export function ListsSection() {
  const t = useT();
  const { entries, load } = useEntries();
  const [tab, setTab] = useState<ListName>("seller");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const rows = entries.filter((e) => e.list === tab);
  const one = t(`lists.one.${tab}`);

  const ask = () => {
    const n = name.trim();
    const c = toCode(code);
    if (!n) return setError(t("lists.enterName"));
    if (!c) return setError(t("lists.emptyCode"));
    const clash = rows.find((e) => e.code === c);
    if (clash) return setError(t("lists.codeUsed", { code: c, name: clash.name }));
    setPending({ list: tab, name: n, code: c, typed: code });
  };
  const done = (e: ListEntry) => {
    setPending(null);
    setName("");
    setCode("");
    setAdded((a) => new Set(a).add(e.id));
    load();
  };

  return (
    <section aria-labelledby="lists-title" className={`${card} flex flex-col gap-4 pt-6`}>
      <div className="flex flex-col gap-1 px-6">
        <h2 id="lists-title" className="m-0 text-base font-semibold">
          {t("lists.title")}
        </h2>
        <p className="m-0 text-sm leading-normal text-muted">{t("lists.text")}</p>
      </div>
      <div
        role="tablist"
        aria-label={t("lists.title")}
        className="flex gap-1 overflow-x-auto border-b border-line px-4"
      >
        {TABS.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={l === tab}
            onClick={() => (setTab(l), setError(null))}
            className={`inline-flex h-11 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 text-sm font-medium ${
              l === tab ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t(`lists.tab.${l}`)}
            <span className="text-xs tabular-nums text-muted">
              {entries.filter((e) => e.list === l).length}
            </span>
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex flex-col">
        <div className="grid grid-cols-[minmax(0,1fr)_200px] gap-3 px-6 pb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">
          <span>{t("lists.name")}</span>
          <span>{t("lists.code")}</span>
        </div>
        {rows.map((e) => (
          <div
            key={e.id}
            className="grid min-h-11 grid-cols-[minmax(0,1fr)_200px] items-center gap-3 border-t border-divider px-6"
          >
            <span className="text-sm">{e.name}</span>
            <span className="inline-flex items-center gap-2 font-mono text-[13px] font-medium">
              {e.code}
              {added.has(e.id) && (
                <span className="rounded-md bg-active-bg px-2 py-0.5 font-sans text-xs font-medium text-active-fg">
                  {t("lists.added")}
                </span>
              )}
            </span>
          </div>
        ))}
        {!rows.length && (
          <div className="border-t border-divider px-6 py-6 text-sm text-muted">
            {t("lists.empty")}
          </div>
        )}
        <div className="flex flex-col gap-3 rounded-b-[10px] border-t border-line bg-subtle px-6 pb-6 pt-5">
          <span className="text-sm font-semibold">{t("lists.addTitle", { one })}</span>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="set-name" className="text-[13px] font-medium">
                {t("lists.name")}
              </label>
              <input
                id="set-name"
                className={`${field} h-11`}
                placeholder={t(`lists.namePh.${tab}`)}
                value={name}
                onChange={(e) => (setName(e.target.value), setError(null))}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="set-code" className="text-[13px] font-medium">
                {t("lists.shortCode")}
              </label>
              <input
                id="set-code"
                className={`${field} h-11 font-mono text-sm`}
                placeholder={t(`lists.codePh.${tab}`)}
                value={code}
                onChange={(e) => (setCode(e.target.value), setError(null))}
                onKeyDown={(e) => e.key === "Enter" && ask()}
              />
            </div>
          </div>
          <p className="m-0 text-[13px] leading-normal text-muted">
            <Rich
              text={t("lists.hint")}
              vars={{
                examples: HINTS[tab].map(([n, c], i) => (
                  <Fragment key={c}>
                    {i > 0 && ", "}
                    <Code>
                      {n} → {c}
                    </Code>
                  </Fragment>
                )),
              }}
            />
          </p>
          <ErrorText error={error} />
          <div className="flex justify-end">
            <button type="button" className={btn} onClick={ask}>
              {t("lists.addButton", { one })}
            </button>
          </div>
        </div>
      </div>
      {pending && <ConfirmEntry pending={pending} onBack={() => setPending(null)} onDone={done} />}
    </section>
  );
}
