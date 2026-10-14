import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { Skeleton } from "../../components/Skeleton";
import { btn, btnPrimary } from "../../components/styles";
import { useT } from "../../i18n";
import { api } from "../../rpc";

export function AppOutdated({
  db,
  folder,
  onChooseOther,
}: {
  db: { dbVersion: string; appVersion: string };
  folder: string | null;
  onChooseOther: () => void;
}) {
  const t = useT();
  return (
    <>
      <Skeleton />
      <Modal
        alert
        top={140}
        title={t("outdated.title")}
        icon={
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-warn-soft text-warn">
            <Icon name="update" size={22} />
          </div>
        }
        footer={
          <>
            <button type="button" className={btn} onClick={onChooseOther}>
              {t("outdated.chooseOther")}
            </button>
            <button type="button" className={btnPrimary} onClick={() => api.quit({})}>
              {t("common.quit")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-3">
          <p className="m-0 text-[15px] leading-[1.55] text-body">
            {t("outdated.text", { version: `v${db.dbVersion}` })}
          </p>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
            <VersionCell label={t("common.database")} value={`v${db.dbVersion}`} />
            <VersionCell label={t("common.thisApp")} value={`v${db.appVersion}`} warn />
          </div>
          {folder && <p className="m-0 font-mono text-xs text-muted">{folder}/db.sqlite</p>}
        </div>
      </Modal>
    </>
  );
}

export const VersionCell = ({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) => (
  <div className="flex flex-col gap-0.5 bg-subtle px-3.5 py-3">
    <span className="text-xs text-muted">{label}</span>
    <span className={`font-mono text-base font-medium ${warn ? "text-warn" : ""}`}>{value}</span>
  </div>
);
