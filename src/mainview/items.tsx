// Raw materials and purchased parts: list, item page with price history, new/edit dialogs.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ITEM_STATUSES,
  type Item,
  type ItemKind,
  type ItemStatus,
  type ItemStatusChange,
  type Lang,
  type ListEntry,
  type Price,
} from "../shared/rpc";
import { DIRS, itemSku, toCode } from "../shared/sku";
import { FileExplorer } from "./explorer/FileExplorer";
import { fmtDateTime, fmtDay, fmtMoney, fmtRelative, useT } from "./i18n";
import { api } from "./rpc";
import {
  btn,
  btnPrimary,
  card,
  Code,
  Dot,
  ErrorText,
  errMsg,
  field,
  Icon,
  Modal,
  mono,
  Rich,
  StatusBadge,
  statusTone,
  toolBtn,
} from "./ui";

const lang = (): Lang => (document.documentElement.lang === "fr" ? "fr" : "en");
const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local time
const day = (date: string) => fmtDay(`${date}T00:00`, lang()); // local midnight, no day shift
// "18,4" → 1840. Up to 2 decimals, null if not a price.
function parseCents(s: string) {
  const m = /^\s*(\d+)(?:[.,](\d{1,2}))?\s*$/.exec(s);
  return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : null;
}
const centsText = (c: number) => (c / 100).toFixed(2);

function useCurrency() {
  const [currency, setCurrency] = useState("");
  useEffect(() => {
    api.getCurrency({}).then(setCurrency);
  }, []);
  return currency;
}

const Req = () => (
  <span className="text-danger" aria-hidden="true">
    *
  </span>
);

// ---------- list ----------

const listCols = "grid grid-cols-[320px_120px_minmax(0,1fr)_150px_100px] gap-4";

export function ItemList({ kind, onOpen }: { kind: ItemKind; onOpen: (id: number) => void }) {
  const t = useT();
  const currency = useCurrency();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ItemStatus | null>(null);
  const [total, setTotal] = useState(0);
  const [matched, setMatched] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.listItems({ kind, query: "" }).then(
      (r) => setTotal(r.length),
      () => {},
    );
  }, [kind]);
  useEffect(() => {
    let stale = false; // ignore out-of-order responses while typing
    api.listItems({ kind, query }).then(
      (r) => !stale && (setMatched(r), setError(null)),
      (e) => !stale && setError(errMsg(e)),
    );
    return () => {
      stale = true;
    };
  }, [kind, query]);

  const rows = filter ? matched.filter((i) => i.status === filter) : matched;
  const filtered = query.trim() !== "" || filter !== null;
  const emptyLabel = query.trim()
    ? t("items.emptyQuery", { q: query })
    : filter
      ? t(`items.empty.${kind}.${filter}`)
      : t(`items.empty.${kind}`);

  const chip = (key: ItemStatus | null, label: string, count: number) => {
    const on = filter === key;
    return (
      <button
        key={key ?? "all"}
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => setFilter(key)}
        className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium hover:border-ink ${
          on ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-ink"
        }`}
      >
        {label}
        <span className="text-xs tabular-nums opacity-75">{count}</span>
      </button>
    );
  };

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-8">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em]">
          {t(`items.title.${kind}`)}
        </h1>
        <span className="text-sm text-muted">
          {filtered
            ? t(`items.countFiltered.${kind}`, { n: rows.length, total })
            : t(`items.count.${kind}`, { n: total })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="box-border flex h-11 min-w-0 flex-[1_1_320px] items-center gap-2.5 rounded-lg border border-line-strong bg-surface px-3.5 text-muted focus-within:border-ink">
          <Icon name="search" />
          <label htmlFor="search" className="sr-only">
            {t("items.searchLabel")}
          </label>
          <input
            id="search"
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("items.search")}
            className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted focus-visible:outline-none"
          />
        </div>
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
          <Icon name="plus" strokeWidth={2} />
          {t(`items.new.${kind}`)}
        </button>
      </div>

      <div role="radiogroup" aria-label={t("list.filter")} className="-mt-1 flex flex-wrap gap-2">
        {chip(null, t("list.all"), matched.length)}
        {ITEM_STATUSES.map((s) =>
          chip(s, t(`status.${s}`), matched.filter((i) => i.status === s).length),
        )}
      </div>

      <ErrorText error={error} />

      <div className={`${card} overflow-x-auto`}>
        <div className="min-w-[900px]">
          <div
            className={`${listCols} border-b border-line bg-subtle px-5 py-3 text-xs font-medium uppercase tracking-[0.06em] text-muted`}
          >
            <span>{t("list.colSku")}</span>
            <span>{t("items.type")}</span>
            <span>{t("product.description")}</span>
            <span className="text-right">{t("items.price")}</span>
            <span>{t("list.colStatus")}</span>
          </div>
          {rows.map((i, n) => (
            <button
              key={i.id}
              type="button"
              onClick={() => onOpen(i.id)}
              className={`${listCols} w-full items-center px-5 py-3.5 text-left text-ink hover:bg-subtle focus-visible:-outline-offset-2 ${
                n ? "border-t border-divider" : ""
              }`}
            >
              <span className="break-all font-mono text-[13px] font-medium">{i.sku}</span>
              <span className="text-sm font-medium">{i.type.name}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm">{i.description}</span>
                <span className="truncate text-[13px] text-muted">{i.seller.name}</span>
              </span>
              <span className="text-right text-sm tabular-nums">
                {i.price ? fmtMoney(i.price.cents, currency, lang()) : "—"}
                {i.price && <span className="text-[13px] text-muted"> / {i.unit.code}</span>}
              </span>
              <span>
                <StatusBadge status={i.status} />
              </span>
            </button>
          ))}
          {!rows.length && !error && (
            <div className="px-5 py-12 text-center text-sm text-muted">{emptyLabel}</div>
          )}
        </div>
      </div>

      {creating && (
        <NewItemDialog
          kind={kind}
          currency={currency}
          onCancel={() => setCreating(false)}
          onCreate={async (v) => onOpen((await api.createItem(v)).id)}
        />
      )}
    </main>
  );
}

// ---------- item page ----------

function specFacts(i: Item, t: ReturnType<typeof useT>) {
  const f = (label: string, value: string, code = "") => ({ label, value, code });
  return [
    f(t("items.seller"), i.seller.name, i.seller.code),
    f(t(`items.typeLabel.${i.kind}`), i.type.name, i.type.code),
    ...(i.kind === "material"
      ? [
          f(t("items.colour"), i.colour!.name, i.colour!.code),
          f(t("items.finish"), i.finish!.name, i.finish!.code),
          f(t("items.size"), i.size!),
        ]
      : [f(t("items.specs"), i.specs.join(" · "))]),
  ];
}

export function ItemPage({ id, lang }: { id: number; lang: Lang }) {
  const t = useT();
  const currency = useCurrency();
  const [data, setData] = useState<{
    item: Item;
    prices: Price[];
    history: ItemStatusChange[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(
    () => api.getItem({ id }).then(setData, (e) => setError(errMsg(e))),
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
  const { item: i, prices, history } = data;
  const facts = [
    ...specFacts(i, t),
    { label: t("items.sellerSku"), value: i.sellerSku || "—", code: "" },
    { label: t("items.unit"), value: i.unit.code, code: "" },
  ];

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-7">
      <section className={`${card} flex flex-wrap items-start gap-6 p-6`}>
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 break-all font-mono text-xl font-medium">{i.sku}</h1>
            <StatusBadge status={i.status} />
          </div>
          {i.description && (
            <p className="m-0 max-w-[680px] whitespace-pre-wrap text-[15px] leading-[1.55] text-body">
              {i.description}
            </p>
          )}
          <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-3.5">
            {facts.map((f) => (
              <div key={f.label} className="flex min-w-0 flex-col gap-[3px]">
                <dt className="text-xs text-muted">{f.label}</dt>
                <dd className="m-0 flex flex-wrap items-baseline gap-1.5 text-[15px] font-medium">
                  <span>{f.value}</span>
                  {f.code && (
                    <span className="font-mono text-xs font-normal text-muted">{f.code}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-5 text-[13px] text-muted">
            <span>{t("product.created", { date: fmtDay(i.createdAt, lang) })}</span>
            <span>{t("product.updated", { date: fmtRelative(i.updatedAt, lang) })}</span>
          </div>
          <History history={history} lang={lang} />
        </div>
        <div className="flex flex-col items-end gap-4">
          <button type="button" className={btn} onClick={() => setEditing(true)}>
            <Icon name="pencil" size={16} />
            {t("product.edit")}
          </button>
          <div className="flex min-w-40 flex-col items-end gap-0.5 rounded-lg border border-divider bg-subtle px-4 py-3">
            <span className="text-xs text-muted">{t("items.currentPrice")}</span>
            <span className="text-2xl font-semibold tabular-nums">
              {i.price ? fmtMoney(i.price.cents, currency, lang) : "—"}
            </span>
            <span className="text-[13px] text-muted">
              {t("items.perUnit", { unit: i.unit.code })}
              {i.price && ` · ${day(i.price.date)}`}
            </span>
          </div>
        </div>
      </section>

      <PriceHistory item={i} prices={prices} currency={currency} onChange={load} />

      <FileExplorer key={i.sku} sku={i.sku} t={t} />

      {editing && (
        <EditItemDialog
          item={i}
          onCancel={() => setEditing(false)}
          onSave={async (v) => {
            await api.updateItem({ id, ...v });
            await load();
            setEditing(false);
          }}
        />
      )}
    </main>
  );
}

function History({ history, lang }: { history: ItemStatusChange[]; lang: Lang }) {
  const t = useT();
  return (
    <details className="text-[13px] text-muted">
      <summary className="inline-flex min-h-8 cursor-pointer items-center font-medium text-ink">
        {t("product.history")}
      </summary>
      <ol className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0">
        {history
          .map((h, n) => ({ ...h, from: n ? history[n - 1].status : null }))
          .reverse()
          .map((h, n) => (
            <li key={n} className="flex items-center gap-3">
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

const priceCols = "grid grid-cols-[160px_160px_minmax(0,1fr)_200px] items-center gap-3 px-5";

function PriceHistory({
  item,
  prices,
  currency,
  onChange,
}: {
  item: Item;
  prices: Price[];
  currency: string;
  onChange: () => Promise<unknown>;
}) {
  const t = useT();
  // null = viewing, "add" = new row, number = editing that entry
  const [mode, setMode] = useState<null | "add" | number>(null);
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = (m: "add" | Price) => {
    setMode(m === "add" ? m : m.id);
    setDate(m === "add" ? today() : m.date);
    setPrice(m === "add" ? "" : centsText(m.cents));
    setError(null);
  };
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setMode(null);
      await onChange();
    } catch (e) {
      setError(errMsg(e));
    }
  };
  const save = () => {
    const cents = parseCents(price);
    if (!date) return setError(t("items.pickDate"));
    if (cents === null) return setError(t("items.enterPrice"));
    run(() =>
      mode === "add"
        ? api.addPrice({ itemId: item.id, date, cents })
        : api.updatePrice({ id: mode as number, date, cents }),
    );
  };

  const editRow = (
    <div className={`${priceCols} border-b border-divider bg-accent-soft py-2.5`}>
      <input
        type="date"
        aria-label={t("items.date")}
        className={`${field} h-10 px-2.5 text-sm`}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <div className="box-border flex h-10 items-center gap-1 rounded-lg border border-line-strong bg-surface px-2.5 focus-within:border-ink">
        <span className="text-sm text-muted">{currency}</span>
        <input
          inputMode="decimal"
          autoFocus
          aria-label={t("items.price")}
          placeholder="0.00"
          className="min-w-0 flex-1 border-0 bg-transparent text-right text-sm tabular-nums text-ink outline-none focus-visible:outline-none"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? save() : e.key === "Escape" && setMode(null))}
        />
      </div>
      <span className="text-[13px] text-danger">{error}</span>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className={`${btn} h-10 px-3.5 text-sm`}
          onClick={() => setMode(null)}
        >
          {t("common.cancel")}
        </button>
        <button type="button" className={`${btnPrimary} h-10 px-3.5 text-sm`} onClick={save}>
          {t("items.save")}
        </button>
      </div>
    </div>
  );

  return (
    <section aria-labelledby="ph-title" className={card}>
      <div className="box-border flex min-h-16 flex-wrap items-center gap-3 border-b border-line py-2.5 pl-5 pr-3">
        <h2 id="ph-title" className="m-0 text-base font-semibold">
          {t("items.priceHistory")}
        </h2>
        <span className="text-[13px] text-muted">
          {t("items.priceNote", { unit: item.unit.code })}
        </span>
        <span className="ml-auto" />
        {mode === null && (
          <button type="button" className={toolBtn} onClick={() => open("add")}>
            <Icon name="plus" size={16} strokeWidth={2} />
            {t("items.addPrice")}
          </button>
        )}
      </div>
      <div
        className={`${priceCols} h-10 border-b border-line bg-subtle text-xs font-medium uppercase tracking-[0.06em] text-muted`}
      >
        <span>{t("items.date")}</span>
        <span className="text-right">{t("items.price")}</span>
        <span />
        <span />
      </div>
      {mode === "add" && editRow}
      {prices.map((p, n) =>
        mode === p.id ? (
          <div key={p.id}>{editRow}</div>
        ) : (
          <div key={p.id} className={`${priceCols} min-h-12 border-b border-divider`}>
            <span className="text-sm tabular-nums">{day(p.date)}</span>
            <span className="text-right text-sm font-medium tabular-nums">
              {fmtMoney(p.cents, currency, lang())}
            </span>
            <span>
              {n === 0 && (
                <span className="inline-flex items-center rounded-md bg-accent-tint px-2 py-[3px] text-xs font-medium text-accent-hover">
                  {t("items.current")}
                </span>
              )}
            </span>
            <div className="flex justify-end gap-1">
              <button
                type="button"
                className={`${toolBtn} w-10 justify-center px-0`}
                aria-label={t("items.editPrice", { date: day(p.date) })}
                onClick={() => open(p)}
              >
                <Icon name="pencil" size={16} />
              </button>
              <button
                type="button"
                className={`${toolBtn} w-10 justify-center px-0 text-danger hover:bg-danger-soft`}
                aria-label={t("items.deletePrice", { date: day(p.date) })}
                onClick={() => run(() => api.deletePrice({ id: p.id }))}
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
        ),
      )}
      {!prices.length && mode !== "add" && (
        <div className="px-5 py-8 text-center text-sm text-muted">{t("items.noPrice")}</div>
      )}
      {mode === null && error && (
        <div className="px-5 py-3">
          <ErrorText error={error} />
        </div>
      )}
    </section>
  );
}

// ---------- dialogs ----------

const Field = ({ id, label, children }: { id?: string; label: ReactNode; children: ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <label htmlFor={id} className="text-[13px] font-medium">
      {label}
    </label>
    {children}
  </div>
);

function Select({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: number | null;
  options: ListEntry[];
  onChange: (id: number | null) => void;
}) {
  const t = useT();
  return (
    <select
      id={id}
      className={`${field} h-11 px-2.5`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{t("items.select")}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.list === "unit" ? o.name : `${o.name}  (${o.code})`}
        </option>
      ))}
    </select>
  );
}

function NewItemDialog({
  kind,
  currency,
  onCreate,
  onCancel,
}: {
  kind: ItemKind;
  currency: string;
  onCreate: (v: Parameters<typeof api.createItem>[0]) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const isPart = kind === "part";
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [v, setV] = useState({
    sellerId: null as number | null,
    typeId: null as number | null,
    colourId: null as number | null,
    finishId: null as number | null,
    unitId: null as number | null,
    size: "",
    specs: [""],
    sellerSku: "",
    price: "",
    date: today(),
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof v>) => setV({ ...v, ...patch });

  useEffect(() => {
    api.listEntries({}).then(setEntries);
    api.listItems({ kind, query: "" }).then((r) => setExisting(new Set(r.map((i) => i.sku))));
  }, [kind]);

  const of = (list: ListEntry["list"]) => entries.filter((e) => e.list === list);
  const code = (id: number | null) => entries.find((e) => e.id === id)?.code;
  const specCodes = v.specs.map(toCode).filter(Boolean);
  const size = toCode(v.size);

  const missing: string[] = [];
  if (!v.sellerId) missing.push(t("items.need.seller"));
  if (!v.typeId) missing.push(t("items.need.type"));
  if (isPart) {
    if (!specCodes.length) missing.push(t("items.need.spec"));
  } else {
    if (!v.colourId) missing.push(t("items.need.colour"));
    if (!v.finishId) missing.push(t("items.need.finish"));
    if (!size) missing.push(t("items.need.size"));
  }
  if (!v.unitId) missing.push(t("items.need.unit"));
  const cents = v.price.trim() ? parseCents(v.price) : null;
  const badPrice = v.price.trim() !== "" && cents === null;

  const sku = itemSku(kind, [
    code(v.sellerId) ?? "[SELLER]",
    code(v.typeId) ?? "[TYPE]",
    ...(isPart
      ? [specCodes.length ? specCodes.join("_") : "[SPECS]"]
      : [code(v.colourId) ?? "[COLOUR]", code(v.finishId) ?? "[FINISH]", size || "[SIZE]"]),
  ]);
  const duplicate = !missing.length && existing.has(sku);
  const ready = !missing.length && !duplicate && !badPrice && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        kind,
        sellerId: v.sellerId!,
        typeId: v.typeId!,
        colourId: v.colourId,
        finishId: v.finishId,
        size: v.size,
        specs: v.specs,
        unitId: v.unitId!,
        description: v.description,
        sellerSku: v.sellerSku,
        firstPrice: cents === null ? null : { date: v.date, cents },
      });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Modal
        title={t(`items.newTitle.${kind}`)}
        onClose={onCancel}
        width={600}
        top={56}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={btnPrimary} disabled={!ready}>
              {t(`items.create.${kind}`)}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          <div
            className={`flex flex-col gap-2 rounded-lg border px-3.5 py-3 ${
              duplicate ? "border-danger bg-danger-soft" : "border-divider bg-subtle"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-muted">
              <span>{t("items.skuToCreate")}</span>
              <span className="ml-auto">
                <StatusBadge status="Active" />
              </span>
            </div>
            <span className={`${mono} break-all text-[15px] font-medium`}>{sku}</span>
            {duplicate && (
              <span className="text-[13px] leading-[1.45] text-danger">
                {t("items.duplicate", { sku })}
              </span>
            )}
            {missing.length > 0 && (
              <span className="text-[13px] text-muted">
                {t("items.missing", { list: missing.join(", ") })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Field
              id="ni-seller"
              label={
                <>
                  {t("items.seller")} <Req />
                </>
              }
            >
              <Select
                id="ni-seller"
                value={v.sellerId}
                options={of("seller")}
                onChange={(sellerId) => set({ sellerId })}
              />
            </Field>
            <Field
              id="ni-type"
              label={
                <>
                  {t(`items.typeLabel.${kind}`)} <Req />
                </>
              }
            >
              <Select
                id="ni-type"
                value={v.typeId}
                options={of(isPart ? "partType" : "materialType")}
                onChange={(typeId) => set({ typeId })}
              />
            </Field>
          </div>
          <p className="-mt-1.5 mb-0 text-[13px] text-muted">{t("items.listsInSettings")}</p>

          {isPart ? (
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-2.5 p-0 text-[13px] font-semibold">
                {t("items.specs")} <Req />
              </legend>
              {v.specs.map((s, n) => {
                const c = toCode(s);
                return (
                  <div key={n} className="flex items-center gap-2">
                    <span className="w-5 text-right text-[13px] tabular-nums text-muted">
                      {n + 1}
                    </span>
                    <input
                      aria-label={t("items.specN", { n: n + 1 })}
                      placeholder="M3x50, Male-Female, 8x2"
                      className={`${field} h-11 flex-1`}
                      value={s}
                      onChange={(e) =>
                        set({ specs: v.specs.map((x, i) => (i === n ? e.target.value : x)) })
                      }
                    />
                    <span className="w-[120px] break-all font-mono text-xs text-muted">
                      {s && c !== s ? `→ ${c || t("items.emptyCode")}` : ""}
                    </span>
                    <button
                      type="button"
                      className={`${toolBtn} w-10 justify-center px-0 text-muted`}
                      aria-label={t("items.removeSpec", { n: n + 1 })}
                      onClick={() =>
                        set({
                          specs: v.specs.length > 1 ? v.specs.filter((_, i) => i !== n) : [""],
                        })
                      }
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className={`${toolBtn} ml-5 self-start`}
                onClick={() => set({ specs: [...v.specs, ""] })}
              >
                <Icon name="plus" size={16} strokeWidth={2} />
                {t("items.addSpec")}
              </button>
            </fieldset>
          ) : (
            <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
              <legend className="mb-2.5 p-0 text-[13px] font-semibold">{t("items.specs")}</legend>
              <div className="grid grid-cols-3 gap-3.5">
                <Field
                  id="ni-colour"
                  label={
                    <>
                      {t("items.colour")} <Req />
                    </>
                  }
                >
                  <Select
                    id="ni-colour"
                    value={v.colourId}
                    options={of("colour")}
                    onChange={(colourId) => set({ colourId })}
                  />
                </Field>
                <Field
                  id="ni-finish"
                  label={
                    <>
                      {t("items.finish")} <Req />
                    </>
                  }
                >
                  <Select
                    id="ni-finish"
                    value={v.finishId}
                    options={of("finish")}
                    onChange={(finishId) => set({ finishId })}
                  />
                </Field>
                <Field
                  id="ni-size"
                  label={
                    <>
                      {t("items.size")} <Req />
                    </>
                  }
                >
                  <input
                    id="ni-size"
                    placeholder="3mm, 1kg"
                    className={`${field} h-11`}
                    value={v.size}
                    onChange={(e) => set({ size: e.target.value })}
                  />
                </Field>
              </div>
            </fieldset>
          )}
          <p className="-mt-1.5 mb-0 text-[13px] leading-normal text-muted">
            <Rich
              text={t("items.codeNote")}
              vars={{ from: <Code>1,75 mm</Code>, to: <Code>175MM</Code> }}
            />
          </p>

          <div className="h-px bg-divider" />

          <div className="grid grid-cols-2 gap-3.5">
            <Field
              id="ni-unit"
              label={
                <>
                  {t("items.unit")} <Req />
                </>
              }
            >
              <Select
                id="ni-unit"
                value={v.unitId}
                options={of("unit")}
                onChange={(unitId) => set({ unitId })}
              />
            </Field>
            <Field
              id="ni-ssku"
              label={
                <>
                  {t("items.sellerSku")}{" "}
                  <span className="font-normal text-muted">{t("common.optional")}</span>
                </>
              }
            >
              <input
                id="ni-ssku"
                className={`${field} h-11 font-mono text-sm`}
                value={v.sellerSku}
                onChange={(e) => set({ sellerSku: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">
              {t("items.firstPrice")}{" "}
              <span className="font-normal text-muted">{t("common.optional")}</span>
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="box-border flex h-11 flex-[1_1_160px] items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 focus-within:border-ink">
                <span className="text-[15px] text-muted">{currency}</span>
                <input
                  inputMode="decimal"
                  aria-label={t("items.firstPrice")}
                  placeholder="0.00"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[15px] tabular-nums text-ink outline-none focus-visible:outline-none"
                  value={v.price}
                  onChange={(e) => set({ price: e.target.value })}
                />
                <span className="whitespace-nowrap text-[13px] text-muted">
                  {v.unitId && `/ ${code(v.unitId)}`}
                </span>
              </div>
              <input
                type="date"
                aria-label={t("items.date")}
                className={`${field} h-11 flex-[0_1_180px] px-2.5`}
                value={v.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </div>
            {badPrice && <ErrorText error={t("items.enterPrice")} />}
          </div>

          <Field
            id="ni-desc"
            label={
              <>
                {t("product.description")}{" "}
                <span className="font-normal text-muted">{t("common.optional")}</span>
              </>
            }
          >
            <textarea
              id="ni-desc"
              rows={2}
              placeholder={t("items.descriptionPlaceholder")}
              className={`${field} resize-y py-2.5 leading-normal`}
              value={v.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
          <p className="m-0 text-[13px] leading-normal text-muted">
            <Rich
              text={t("product.folderNote")}
              vars={{ dir: <Code>{isPart ? DIRS.part : DIRS.material}</Code> }}
            />
          </p>
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}

function EditItemDialog({
  item,
  onSave,
  onCancel,
}: {
  item: Item;
  onSave: (v: { description: string; sellerSku: string; status: ItemStatus }) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [v, setV] = useState({
    description: item.description,
    sellerSku: item.sellerSku,
    status: item.status,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = [
    { label: t("items.seller"), value: item.seller.name },
    { label: t(`items.typeLabel.${item.kind}`), value: item.type.name },
    {
      label: t("items.specs"),
      value:
        item.kind === "part"
          ? item.specs.join(" · ")
          : [item.colour!.name, item.finish!.name, item.size].join(" · "),
    },
    { label: t("items.unit"), value: item.unit.code },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(v);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Modal
        title={t(`items.editTitle.${item.kind}`)}
        titleExtra={<span className="break-all font-mono text-[13px] text-muted">{item.sku}</span>}
        onClose={onCancel}
        width={560}
        top={80}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={btnPrimary} disabled={busy}>
              {t("product.saveChanges")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          <div className="flex flex-col gap-2.5 rounded-lg border border-divider bg-subtle px-3.5 py-3">
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
              <Icon name="lock" size={14} />
              {t("items.locked")}
            </span>
            <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-4 gap-y-2.5">
              {locked.map((f) => (
                <div key={f.label} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted">{f.label}</dt>
                  <dd className="m-0 text-sm font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Field
            id="ei-desc"
            label={
              <>
                {t("product.description")}{" "}
                <span className="font-normal text-muted">{t("common.optional")}</span>
              </>
            }
          >
            <textarea
              id="ei-desc"
              rows={3}
              autoFocus
              className={`${field} resize-y py-2.5 leading-normal`}
              value={v.description}
              onChange={(e) => setV({ ...v, description: e.target.value })}
            />
          </Field>
          <Field
            id="ei-ssku"
            label={
              <>
                {t("items.sellerSku")}{" "}
                <span className="font-normal text-muted">{t("common.optional")}</span>
              </>
            }
          >
            <input
              id="ei-ssku"
              className={`${field} h-11 font-mono text-sm`}
              value={v.sellerSku}
              onChange={(e) => setV({ ...v, sellerSku: e.target.value })}
            />
          </Field>
          <fieldset role="radiogroup" className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1.5 p-0 text-[13px] font-medium">{t("product.status")}</legend>
            {ITEM_STATUSES.map((s) => {
              const on = v.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setV({ ...v, status: s })}
                  className={`flex items-start gap-3 rounded-lg px-3.5 py-3 text-left text-ink ${
                    on
                      ? "border-[1.5px] border-ink bg-subtle"
                      : "border border-line-strong bg-surface"
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
                    <span className="text-[13px] leading-[1.45] text-muted">
                      {t(`items.status.help.${s}`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </fieldset>
          <p className="m-0 text-[13px] text-muted">{t("items.pricesNote")}</p>
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}
