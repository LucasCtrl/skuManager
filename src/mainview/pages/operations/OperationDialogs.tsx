import { useEffect, useState } from "react";
import { type ListEntry, type Operation, type RateKind } from "../../../shared/rpc";
import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { Field, Req, useSubmit } from "../../components/form";
import { btn, btnPrimary, field, mono } from "../../components/styles";
import { Code, ErrorText, Rich } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";
import { Select } from "../items/NewItemDialog";
import { parseAmount, today } from "../items/utils";
import { NameAndDescription } from "../products/ProductDialogs";
import { rateUnit } from "./RateText";

export function NewOperationDialog({
  currency,
  onCreate,
  onCancel,
}: {
  currency: string;
  onCreate: (v: Parameters<typeof api.createOperation>[0]) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [sku, setSku] = useState<string | null>(null);
  const [units, setUnits] = useState<ListEntry[]>([]);
  const [v, setV] = useState({
    name: "",
    description: "",
    rateKind: "hour" as RateKind,
    unitId: null as number | null,
    rate: "",
    date: today(),
  });
  const set = (p: Partial<typeof v>) => setV({ ...v, ...p });
  const amount = v.rate.trim() ? parseAmount(v.rate) : null;
  const badRate = v.rate.trim() !== "" && amount === null;
  const { busy, error, submit } = useSubmit(() =>
    onCreate({
      name: v.name,
      description: v.description,
      rateKind: v.rateKind,
      unitId: v.rateKind === "quantity" ? v.unitId : null,
      firstRate: amount === null ? null : { date: v.date, amount },
    }),
  );
  const ready = !busy && v.name.trim() && !badRate && (v.rateKind === "hour" || v.unitId !== null);

  useEffect(() => {
    api.nextOperationSku({}).then(setSku, () => setSku(null));
    api.listEntries({}).then((e) => setUnits(e.filter((x) => x.list === "unit")));
  }, []);
  const unit = v.rateKind === "hour" ? "h" : (units.find((u) => u.id === v.unitId)?.name ?? "");

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("ops.newTitle")}
        onClose={onCancel}
        width={600}
        top={56}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={btnPrimary} disabled={!ready}>
              {t("ops.create")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-divider bg-subtle px-3.5 py-3 text-[13px] text-muted">
            <span>{t("product.skuToBeAssigned")}</span>
            <span className={`${mono} text-sm font-medium`}>{sku ?? "—"}</span>
          </div>
          <NameAndDescription
            name={v.name}
            description={v.description}
            rows={2}
            placeholder={t("ops.descriptionPlaceholder")}
            onName={(name) => set({ name })}
            onDescription={(description) => set({ description })}
          />
          <div className="grid grid-cols-2 gap-3.5">
            <Field
              id="no-kind"
              label={
                <>
                  {t("ops.rateKind")} <Req />
                </>
              }
            >
              <select
                id="no-kind"
                className={`${field} h-11 px-2.5`}
                value={v.rateKind}
                onChange={(e) => set({ rateKind: e.target.value as RateKind })}
              >
                <option value="hour">{t("ops.kind.hour")}</option>
                <option value="quantity">{t("ops.kind.quantity")}</option>
              </select>
            </Field>
            {v.rateKind === "quantity" && (
              <Field
                id="no-unit"
                label={
                  <>
                    {t("ops.rateUnit")} <Req />
                  </>
                }
              >
                <Select
                  id="no-unit"
                  value={v.unitId}
                  options={units}
                  onChange={(unitId) => set({ unitId })}
                />
              </Field>
            )}
          </div>
          <p className="-mt-1.5 mb-0 text-[13px] text-muted">{t("ops.kindLocked")}</p>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">
              {t("ops.firstRate")}{" "}
              <span className="font-normal text-muted">{t("common.optional")}</span>
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="box-border flex h-11 flex-[1_1_160px] items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 focus-within:border-ink">
                <span className="text-[15px] text-muted">{currency}</span>
                <input
                  inputMode="decimal"
                  aria-label={t("ops.firstRate")}
                  placeholder="0.00"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[15px] tabular-nums text-ink outline-none focus-visible:outline-none"
                  value={v.rate}
                  onChange={(e) => set({ rate: e.target.value })}
                />
                <span className="whitespace-nowrap text-[13px] text-muted">
                  {unit && `/ ${unit}`}
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
            {badRate && <ErrorText error={t("items.enterPrice")} />}
          </div>
          <p className="m-0 text-[13px] leading-normal text-muted">
            <Rich text={t("product.folderNote")} vars={{ dir: <Code>5_OPERATIONS</Code> }} />
          </p>
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}

export function EditOperationDialog({
  op,
  onSave,
  onCancel,
}: {
  op: Operation;
  onSave: (v: { name: string; description: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [v, setV] = useState({ name: op.name, description: op.description });
  const { busy, error, submit } = useSubmit(() => onSave(v));
  const locked = [
    { label: t("ops.rateKind"), value: t(`ops.kind.${op.rateKind}`) },
    { label: t("ops.rateUnit"), value: rateUnit(op) },
  ];

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("ops.editTitle")}
        titleExtra={<span className="font-mono text-[13px] text-muted">{op.sku}</span>}
        onClose={onCancel}
        width={560}
        top={96}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={btnPrimary} disabled={busy || !v.name.trim()}>
              {t("product.saveChanges")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          <div className="flex flex-col gap-2.5 rounded-lg border border-divider bg-subtle px-3.5 py-3">
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
              <Icon name="lock" size={14} />
              {t("ops.locked")}
            </span>
            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {locked.map((f) => (
                <div key={f.label} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted">{f.label}</dt>
                  <dd className="m-0 text-sm font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <NameAndDescription
            name={v.name}
            description={v.description}
            rows={3}
            placeholder={t("ops.descriptionPlaceholder")}
            onName={(name) => setV({ ...v, name })}
            onDescription={(description) => setV({ ...v, description })}
          />
          <p className="m-0 text-[13px] text-muted">{t("ops.ratesNote")}</p>
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}
