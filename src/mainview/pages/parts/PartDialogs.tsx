import { useEffect, useState } from "react";
import { PART_STATUSES, type PartStatus, type PartVersion } from "../../../shared/rpc";
import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { useSubmit } from "../../components/form";
import { StatusBadge, StatusOptions } from "../../components/status";
import { btn, btnPrimary, field, mono } from "../../components/styles";
import { Code, errMsg, ErrorText, Rich } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";
import { NameAndDescription } from "../products/ProductDialogs";

const SkuBox = ({ label, sku, problem }: { label: string; sku: string; problem?: string }) => (
  <div
    className={`flex flex-col gap-2 rounded-lg border px-3.5 py-3 ${
      problem ? "border-danger bg-danger-soft" : "border-divider bg-subtle"
    }`}
  >
    <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-muted">
      <span>{label}</span>
      <span className="ml-auto">
        <StatusBadge status="In development" />
      </span>
    </div>
    <span className={`${mono} break-all text-[15px] font-medium`}>{sku}</span>
    {problem && <span className="text-[13px] leading-[1.45] text-danger">{problem}</span>}
  </div>
);

// Created from the product page; that product is the origin product.
export function NewPartDialog({
  productId,
  onCreate,
  onCancel,
}: {
  productId: number;
  onCreate: (v: { name: string; description: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [checked, setChecked] = useState<{ sku: string; problem?: string }>({ sku: "—" });
  const preview = name.trim() ? checked : { sku: "—" };
  const { busy, error, submit } = useSubmit(() => onCreate({ name, description }));

  useEffect(() => {
    if (!name.trim()) return;
    let stale = false;
    api.partSku({ productId, name }).then(
      (sku) => !stale && setChecked({ sku }),
      (e) => !stale && setChecked({ sku: "—", problem: errMsg(e) }),
    );
    return () => {
      stale = true;
    };
  }, [productId, name]);

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("parts.newTitle")}
        onClose={onCancel}
        width={560}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className={btnPrimary}
              disabled={busy || !name.trim() || "problem" in preview}
            >
              {t("parts.create")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          <SkuBox label={t("items.skuToCreate")} sku={preview.sku} problem={preview.problem} />
          <NameAndDescription
            name={name}
            description={description}
            rows={3}
            placeholder={t("parts.descriptionPlaceholder")}
            onName={setName}
            onDescription={setDescription}
          />
          <p className="m-0 text-[13px] leading-normal text-muted">
            <Rich
              text={t("parts.nameNote")}
              vars={{ from: <Code>Tool ID card</Code>, to: <Code>toolIdCard</Code> }}
            />{" "}
            <Rich
              text={t("product.folderNote")}
              vars={{ dir: <Code>2_MANUFACTURED_PARTS</Code> }}
            />
          </p>
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}

export function NewVersionDialog({
  from,
  onCreate,
  onCancel,
}: {
  from: PartVersion;
  onCreate: () => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [sku, setSku] = useState<string | null>(null);
  const { busy, error, submit } = useSubmit(onCreate);
  useEffect(() => {
    api.nextVersionSku({ fromId: from.id }).then(setSku, () => setSku(null));
  }, [from.id]);

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("parts.newVersionTitle")}
        onClose={onCancel}
        width={520}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={btnPrimary} disabled={busy || !sku}>
              {t("parts.createVersion")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          <SkuBox label={t("items.skuToCreate")} sku={sku ?? "—"} />
          <p className="m-0 text-sm leading-normal text-body">
            <Rich text={t("parts.newVersionNote")} vars={{ from: <Code>{from.sku}</Code> }} />
          </p>
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}

export function EditVersionDialog({
  version,
  siblings,
  onSave,
  onCancel,
}: {
  version: PartVersion;
  siblings: PartVersion[];
  onSave: (v: { description: string; status: PartStatus }) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [v, setV] = useState({ description: version.description, status: version.status });
  const { busy, error, submit } = useSubmit(() => onSave(v));
  const retiring =
    v.status === "Active" && version.status !== "Active"
      ? siblings.find((s) => s.status === "Active")
      : undefined;

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("parts.editTitle")}
        titleExtra={
          <span className="break-all font-mono text-[13px] text-muted">{version.sku}</span>
        }
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
            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2.5">
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted">{t("product.name")}</dt>
                <dd className="m-0 text-sm font-medium">{version.name}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted">{t("parts.version")}</dt>
                <dd className="m-0 text-sm font-medium">v{version.version}</dd>
              </div>
            </dl>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="ev-desc" className="text-[13px] font-medium">
              {t("product.description")}{" "}
              <span className="font-normal text-muted">{t("common.optional")}</span>
            </label>
            <textarea
              id="ev-desc"
              rows={3}
              autoFocus
              className={`${field} resize-y py-2.5 leading-normal`}
              value={v.description}
              onChange={(e) => setV({ ...v, description: e.target.value })}
            />
          </div>
          <StatusOptions
            statuses={PART_STATUSES}
            value={v.status}
            help={(s) => t(`parts.status.help.${s}`)}
            onChange={(status) => setV({ ...v, status })}
          />
          {retiring && (
            <p
              role="status"
              className="m-0 rounded-lg bg-warn-soft px-3.5 py-3 text-[13px] leading-normal text-warn"
            >
              <Rich text={t("parts.willRetire")} vars={{ sku: <Code>{retiring.sku}</Code> }} />
            </p>
          )}
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}
