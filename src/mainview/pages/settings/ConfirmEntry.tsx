import { useState } from "react";
import { type ListEntry } from "../../../shared/rpc";
import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { btn, btnPrimary } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";
import { type Pending } from "./shared";

export function ConfirmEntry({
  pending,
  onBack,
  onDone,
}: {
  pending: Pending;
  onBack: () => void;
  onDone: (e: ListEntry) => void;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const isUnit = pending.list === "unit";
  const one = t(`lists.one.${pending.list}`);
  const create = async () => {
    try {
      onDone(await api.addEntry({ list: pending.list, name: pending.name, code: pending.typed }));
    } catch (e) {
      setError(errMsg(e));
    }
  };
  return (
    <Modal
      alert
      width={460}
      title={t("lists.confirmTitle", { one })}
      onClose={onBack}
      footer={
        <>
          <button type="button" className={btn} onClick={onBack}>
            {t("lists.backToEdit")}
          </button>
          <button type="button" className={btnPrimary} onClick={create}>
            {t("lists.create", { one })}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 pb-6 pt-4">
        <dl className="m-0 flex flex-col gap-3 rounded-lg border border-divider bg-subtle px-4 py-3.5">
          {!isUnit && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted">{t("lists.name")}</dt>
              <dd className="m-0 text-[15px] font-medium">{pending.name}</dd>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted">{isUnit ? t("lists.unit") : t("lists.code")}</dt>
            <dd className={`m-0 text-lg font-medium ${isUnit ? "" : "font-mono"}`}>
              {pending.code}
            </dd>
          </div>
          {!isUnit && pending.typed !== pending.code && (
            <span className="text-[13px] text-warn">
              {t("lists.corrected", { typed: pending.typed })}
            </span>
          )}
        </dl>
        <p className="m-0 flex gap-2.5 text-sm leading-normal text-body">
          <Icon name="lock" className="mt-px text-muted" />
          <span>{isUnit ? t("lists.permanentUnit") : t("lists.permanent", { one })}</span>
        </p>
        <ErrorText error={error} />
      </div>
    </Modal>
  );
}
