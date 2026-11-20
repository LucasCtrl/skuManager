import { useEffect, useState } from "react";
import { type Variant } from "../../../shared/rpc";
import { Modal } from "../../components/Modal";
import { Field, Req, useSubmit } from "../../components/form";
import { btn, btnPrimary, field, mono, readonlyField } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";
import { NameAndDescription } from "./ProductDialogs";

type NewVariant = { code: string; name: string; description: string; copyFromId: number | null };

// `copyFrom`: preselected variant to copy (the copy button on a variant page).
export function NewVariantDialog({
  productId,
  variants,
  copyFrom,
  onCreate,
  onCancel,
}: {
  productId: number;
  variants: Variant[];
  copyFrom: number | null;
  onCreate: (v: NewVariant) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [v, setV] = useState<NewVariant>({
    code: "",
    name: "",
    description: "",
    copyFromId: copyFrom,
  });
  const [checked, setChecked] = useState<{ sku: string; problem?: string }>({ sku: "—" });
  const preview = v.code.trim() ? checked : { sku: "—" };
  const { busy, error, submit } = useSubmit(() => onCreate(v));

  useEffect(() => {
    if (!v.code.trim()) return;
    let stale = false;
    api.variantSku({ productId, code: v.code }).then(
      (sku) => !stale && setChecked({ sku }),
      (e) => !stale && setChecked({ sku: "—", problem: errMsg(e) }),
    );
    return () => {
      stale = true;
    };
  }, [productId, v.code]);

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("variants.newTitle")}
        onClose={onCancel}
        width={560}
        top={80}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className={btnPrimary}
              disabled={busy || !v.name.trim() || !v.code.trim() || "problem" in preview}
            >
              {t("variants.create")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          <div
            className={`flex flex-col gap-2 rounded-lg border px-3.5 py-3 ${
              preview.problem ? "border-danger bg-danger-soft" : "border-divider bg-subtle"
            }`}
          >
            <span className="text-[13px] text-muted">{t("items.skuToCreate")}</span>
            <span className={`${mono} break-all text-[15px] font-medium`}>{preview.sku}</span>
            {preview.problem && (
              <span className="text-[13px] leading-[1.45] text-danger">{preview.problem}</span>
            )}
          </div>
          <Field
            id="var-code"
            label={
              <>
                {t("variants.code")} <Req />
              </>
            }
          >
            <input
              id="var-code"
              autoFocus
              required
              placeholder="Y10"
              className={`${field} h-11 font-mono`}
              value={v.code}
              onChange={(e) => setV({ ...v, code: e.target.value })}
            />
            <span className="text-[13px] text-muted">{t("variants.codeHelp")}</span>
          </Field>
          <NameAndDescription
            name={v.name}
            description={v.description}
            rows={2}
            placeholder={t("variants.descriptionPlaceholder")}
            autoFocus={false}
            onName={(name) => setV({ ...v, name })}
            onDescription={(description) => setV({ ...v, description })}
          />
          {variants.length ? (
            <Field id="var-copy" label={t("variants.copyFrom")}>
              <select
                id="var-copy"
                className={`${field} h-11 px-2.5`}
                value={v.copyFromId ?? ""}
                onChange={(e) =>
                  setV({ ...v, copyFromId: e.target.value ? Number(e.target.value) : null })
                }
              >
                <option value="">{t("variants.copyNone")}</option>
                {variants.map((x) => (
                  <option key={x.id} value={x.id}>
                    {`${x.sku} · ${x.name}`}
                  </option>
                ))}
              </select>
              <span className="text-[13px] text-muted">{t("variants.copyHelp")}</span>
            </Field>
          ) : (
            <p className="m-0 text-[13px] leading-normal text-muted">{t("variants.firstNote")}</p>
          )}
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}

export function EditVariantDialog({
  variant,
  onSave,
  onCancel,
}: {
  variant: Variant;
  onSave: (v: { name: string; description: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [v, setV] = useState({ name: variant.name, description: variant.description });
  const { busy, error, submit } = useSubmit(() => onSave(v));

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("variants.editTitle")}
        titleExtra={<span className="font-mono text-[13px] text-muted">{variant.sku}</span>}
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
          <Field id="var-code" label={t("variants.code")}>
            <input id="var-code" readOnly className={readonlyField} value={variant.code} />
            <span className="text-[13px] text-muted">{t("variants.codeLocked")}</span>
          </Field>
          <NameAndDescription
            name={v.name}
            description={v.description}
            rows={3}
            placeholder={t("variants.descriptionPlaceholder")}
            onName={(name) => setV({ ...v, name })}
            onDescription={(description) => setV({ ...v, description })}
          />
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}
