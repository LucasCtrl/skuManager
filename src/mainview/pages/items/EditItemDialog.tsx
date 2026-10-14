import { useState } from "react";
import { type Item, ITEM_STATUSES, type ItemStatus } from "../../../shared/rpc";
import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { Field, useSubmit } from "../../components/form";
import { StatusOptions } from "../../components/status";
import { btn, btnPrimary, field } from "../../components/styles";
import { ErrorText } from "../../components/text";
import { useT } from "../../i18n";

export function EditItemDialog({
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
  const { busy, error, submit } = useSubmit(() => onSave(v));
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
          <StatusOptions
            statuses={ITEM_STATUSES}
            value={v.status}
            help={(s) => t(`items.status.help.${s}`)}
            onChange={(status) => setV({ ...v, status })}
          />
          <p className="m-0 text-[13px] text-muted">{t("items.pricesNote")}</p>
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}
