import { useEffect, useState } from "react";
import { type Status, STATUSES } from "../../../shared/rpc";
import { Modal } from "../../components/Modal";
import { Field, Req, useSubmit } from "../../components/form";
import { StatusBadge, StatusOptions } from "../../components/status";
import { btn, btnPrimary, field, mono } from "../../components/styles";
import { Code, ErrorText, Rich } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";

export function NameAndDescription({
  name,
  description,
  rows,
  onName,
  onDescription,
}: {
  name: string;
  description: string;
  rows: number;
  onName: (v: string) => void;
  onDescription: (v: string) => void;
}) {
  const t = useT();
  return (
    <>
      <Field
        id="pd-name"
        label={
          <>
            {t("product.name")} <Req />
          </>
        }
      >
        <input
          id="pd-name"
          autoFocus
          required
          className={`${field} h-11`}
          value={name}
          onChange={(e) => onName(e.target.value)}
        />
      </Field>
      <Field
        id="pd-desc"
        label={
          <>
            {t("product.description")}{" "}
            <span className="font-normal text-muted">{t("common.optional")}</span>
          </>
        }
      >
        <textarea
          id="pd-desc"
          rows={rows}
          placeholder={t("product.descriptionPlaceholder")}
          className={`${field} resize-y py-2.5 leading-normal`}
          value={description}
          onChange={(e) => onDescription(e.target.value)}
        />
      </Field>
    </>
  );
}

export function NewProductDialog({
  onCreate,
  onCancel,
}: {
  onCreate: (v: { name: string; description: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState<string | null>(null);
  const { busy, error, submit } = useSubmit(() => onCreate({ name, description }));

  useEffect(() => {
    api.nextSku({}).then(setSku, () => setSku(null));
  }, []);

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("product.newTitle")}
        onClose={onCancel}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={btnPrimary} disabled={busy || !name.trim()}>
              {t("product.create")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-divider bg-subtle px-3.5 py-3 text-[13px] text-muted">
            <span>{t("product.skuToBeAssigned")}</span>
            <span className={`${mono} text-sm font-medium`}>{sku ?? "—"}</span>
            <span className="ml-auto">
              <StatusBadge status="In development" />
            </span>
          </div>
          <NameAndDescription
            name={name}
            description={description}
            rows={4}
            onName={setName}
            onDescription={setDescription}
          />
          <p className="m-0 text-[13px] leading-normal text-muted">
            <Rich text={t("product.folderNote")} vars={{ dir: <Code>1_PRODUCTS</Code> }} />
          </p>
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}

export function EditProductDialog({
  sku,
  initial,
  onSave,
  onCancel,
}: {
  sku: string;
  initial: { name: string; description: string; status: Status };
  onSave: (v: { name: string; description: string; status: Status }) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [v, setV] = useState(initial);
  const { busy, error, submit } = useSubmit(() => onSave(v));

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("product.editTitle")}
        titleExtra={<span className="font-mono text-[13px] text-muted">{sku}</span>}
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
          <NameAndDescription
            name={v.name}
            description={v.description}
            rows={3}
            onName={(name) => setV({ ...v, name })}
            onDescription={(description) => setV({ ...v, description })}
          />
          <StatusOptions
            statuses={STATUSES}
            value={v.status}
            help={(s) => t(`status.help.${s}`)}
            onChange={(status) => setV({ ...v, status })}
          />
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}
