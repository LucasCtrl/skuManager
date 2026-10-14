import { useEffect, useState } from "react";
import { type ItemKind, type ListEntry } from "../../../shared/rpc";
import { DIRS, itemSku, toCode } from "../../../shared/sku";
import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { Field, Req, useSubmit } from "../../components/form";
import { StatusBadge } from "../../components/status";
import { btn, btnPrimary, field, mono, toolBtn } from "../../components/styles";
import { Code, ErrorText, Rich } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";
import { parseCents, today } from "./utils";

export function Select({
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

export function NewItemDialog({
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
  const { busy, error, submit } = useSubmit(() =>
    onCreate({
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
    }),
  );
  const ready = !missing.length && !duplicate && !badPrice && !busy;

  return (
    <form onSubmit={ready ? submit : (e) => e.preventDefault()}>
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
