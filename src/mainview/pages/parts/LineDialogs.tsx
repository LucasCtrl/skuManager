import { useEffect, useState } from "react";
import {
  type Component,
  type CompositionLine,
  type Owner,
  type PartVersion,
} from "../../../shared/rpc";
import { Modal } from "../../components/Modal";
import { Field, Req, useSubmit } from "../../components/form";
import { btn, btnPrimary, field } from "../../components/styles";
import { ErrorText } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";
import { parseQty, parseWhole, splitDuration } from "./quantity";

type Measure = CompositionLine["measure"];
type Pick = "material" | "operation" | "part" | "version";
type Candidate = { c: Component; label: string; measure: Measure; unit: string | null };

// Quantity field for a measure: decimal with unit, h/min/s, or a whole count. Emits null when invalid.
function QuantityInput({
  measure,
  unit,
  initial,
  onChange,
}: {
  measure: Measure;
  unit: string | null;
  initial: number | null;
  onChange: (q: number | null) => void;
}) {
  const t = useT();
  const [text, setText] = useState(
    initial == null ? "" : measure === "quantity" ? String(initial / 1000) : String(initial),
  );
  const [hms, setHms] = useState(
    (initial == null ? ["", "", ""] : splitDuration(initial).map(String)) as string[],
  );
  const editText = (s: string) => {
    setText(s);
    onChange((measure === "count" ? (/^\s*\d+\s*$/.test(s) ? Number(s) : 0) : parseQty(s)) || null);
  };
  const editHms = (next: string[]) => {
    setHms(next);
    const [h, m, s] = next.map(parseWhole);
    onChange(h == null || m == null || s == null ? null : h * 3600 + m * 60 + s || null);
  };

  if (measure === "duration")
    return (
      <div className="flex gap-2.5">
        {["h", "min", "s"].map((u, i) => (
          <div
            key={u}
            className="box-border flex h-11 min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 focus-within:border-ink"
          >
            <input
              inputMode="numeric"
              autoFocus={i === 0}
              aria-label={t(`line.duration.${u}`)}
              placeholder="0"
              className="w-0 min-w-0 flex-1 border-0 bg-transparent text-right text-[15px] tabular-nums text-ink outline-none focus-visible:outline-none"
              value={hms[i]}
              onChange={(e) => editHms(hms.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <span className="text-[13px] text-muted">{u}</span>
          </div>
        ))}
      </div>
    );
  return (
    <div className="box-border flex h-11 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 focus-within:border-ink">
      <input
        id="line-qty"
        autoFocus
        inputMode={measure === "count" ? "numeric" : "decimal"}
        placeholder={measure === "count" ? "1" : "0.000"}
        className="min-w-0 flex-1 border-0 bg-transparent text-[15px] tabular-nums text-ink outline-none focus-visible:outline-none"
        value={text}
        onChange={(e) => editText(e.target.value)}
      />
      <span className="whitespace-nowrap text-[13px] text-muted">
        {measure === "count" ? t("line.pieces") : unit}
      </span>
    </div>
  );
}

const qtyHelp = (measure: Measure) =>
  measure === "count"
    ? "line.help.count"
    : measure === "duration"
      ? "line.help.duration"
      : "line.help.quantity";

async function candidates(pick: Pick): Promise<Candidate[]> {
  if (pick === "material" || pick === "part")
    return (await api.listItems({ kind: pick, query: "" }))
      .filter((i) => i.status === "Active")
      .map((i) => ({
        c: { kind: "item", id: i.id },
        label: `${i.sku} · ${i.type.name}${i.description ? ` · ${i.description}` : ""}`,
        measure: "quantity",
        unit: i.unit.code,
      }));
  if (pick === "operation")
    return (await api.listOperations({ query: "" })).map((o) => ({
      c: { kind: "operation", id: o.id },
      label: `${o.sku} · ${o.name}`,
      measure: o.rateKind === "hour" ? "duration" : "quantity",
      unit: o.unit?.name ?? null,
    }));
  return (await api.listPartVersions({ query: "", status: "Active", productId: null })).map(
    (v) => ({
      c: { kind: "version", id: v.id },
      label: `${v.sku} · ${v.name}`,
      measure: "count",
      unit: null,
    }),
  );
}

export function AddLineDialog({
  owner,
  lines,
  onDone,
  onCancel,
}: {
  owner: Owner;
  lines: CompositionLine[];
  onDone: () => Promise<unknown>;
  onCancel: () => void;
}) {
  const t = useT();
  const picks: Pick[] =
    owner.kind === "product" ? ["version", "part"] : ["material", "operation", "part", "version"];
  const [pick, setPick] = useState<Pick>(picks[0]);
  const [list, setList] = useState<Candidate[] | null>(null);
  const [chosen, setChosen] = useState<Candidate | null>(null);
  const [quantity, setQuantity] = useState<number | null>(null);
  const { busy, error, submit } = useSubmit(async () => {
    await api.addLine({ owner, component: chosen!.c, quantity: quantity! });
    await onDone();
  });

  const changePick = (p: Pick) => {
    setPick(p);
    setList(null);
    setChosen(null);
  };
  useEffect(() => {
    const used = new Set(lines.map((l) => `${l.component.kind}:${l.component.id}`));
    candidates(pick).then((cs) =>
      // the version being edited can't contain itself; items already on a line are left out
      setList(
        cs.filter(
          (x) =>
            !used.has(`${x.c.kind}:${x.c.id}`) &&
            !(owner.kind === "version" && x.c.kind === "version" && x.c.id === owner.id),
        ),
      ),
    );
  }, [pick, lines, owner.kind, owner.id]);

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("line.addTitle")}
        onClose={onCancel}
        width={600}
        top={80}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={btnPrimary} disabled={busy || !chosen || !quantity}>
              {t("line.add")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          <Field id="line-kind" label={t("line.kind")}>
            <select
              id="line-kind"
              className={`${field} h-11 px-2.5`}
              value={pick}
              onChange={(e) => changePick(e.target.value as Pick)}
            >
              {picks.map((p) => (
                <option key={p} value={p}>
                  {t(`line.pick.${p}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="line-item"
            label={
              <>
                {t(`line.pick.${pick}`)} <Req />
              </>
            }
          >
            <select
              id="line-item"
              className={`${field} h-11 px-2.5`}
              value={chosen ? `${chosen.c.kind}:${chosen.c.id}` : ""}
              disabled={!list}
              onChange={(e) =>
                setChosen(list!.find((x) => `${x.c.kind}:${x.c.id}` === e.target.value) ?? null)
              }
            >
              <option value="">{t("items.select")}</option>
              {list?.map((x) => (
                <option key={`${x.c.kind}:${x.c.id}`} value={`${x.c.kind}:${x.c.id}`}>
                  {x.label}
                </option>
              ))}
            </select>
          </Field>
          <p className="-mt-1.5 mb-0 text-[13px] text-muted">{t("line.onlyActive")}</p>
          {chosen && (
            <Field
              id="line-qty"
              label={
                <>
                  {t("line.quantity")} <Req />
                </>
              }
            >
              <QuantityInput
                key={`${chosen.c.kind}:${chosen.c.id}`}
                measure={chosen.measure}
                unit={chosen.unit}
                initial={null}
                onChange={setQuantity}
              />
              <span className="text-[13px] text-muted">{t(qtyHelp(chosen.measure))}</span>
            </Field>
          )}
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}

// Quantity and, for a manufactured part line, the version of the same part.
export function EditLineDialog({
  line,
  onDone,
  onCancel,
}: {
  line: CompositionLine;
  onDone: () => Promise<unknown>;
  onCancel: () => void;
}) {
  const t = useT();
  const [quantity, setQuantity] = useState<number | null>(line.quantity);
  const [versionId, setVersionId] = useState(line.component.id);
  const [versions, setVersions] = useState<PartVersion[]>([]);
  const { busy, error, submit } = useSubmit(async () => {
    await api.updateLine({
      id: line.id,
      quantity: quantity!,
      versionId: line.measure === "count" ? versionId : null,
    });
    await onDone();
  });

  useEffect(() => {
    if (line.component.kind === "version")
      api
        .getPartVersion({ id: line.component.id })
        .then((r) => setVersions([r.version, ...r.siblings].sort((a, b) => a.version - b.version)));
  }, [line]);

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("line.editTitle")}
        titleExtra={<span className="break-all font-mono text-[13px] text-muted">{line.sku}</span>}
        onClose={onCancel}
        width={520}
        top={96}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={btnPrimary} disabled={busy || !quantity}>
              {t("product.saveChanges")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          {line.component.kind === "version" && (
            <Field id="line-version" label={t("line.version")}>
              <select
                id="line-version"
                className={`${field} h-11 px-2.5`}
                value={versionId}
                onChange={(e) => setVersionId(Number(e.target.value))}
              >
                {versions.map((v) => (
                  <option
                    key={v.id}
                    value={v.id}
                    disabled={v.id !== line.component.id && v.status !== "Active"}
                  >
                    {`v${v.version} · ${t(`status.${v.status}`)}`}
                  </option>
                ))}
              </select>
              <span className="text-[13px] text-muted">{t("line.versionHelp")}</span>
            </Field>
          )}
          <Field id="line-qty" label={t("line.quantity")}>
            <QuantityInput
              measure={line.measure}
              unit={line.unit}
              initial={line.quantity}
              onChange={setQuantity}
            />
            <span className="text-[13px] text-muted">{t(qtyHelp(line.measure))}</span>
          </Field>
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}
