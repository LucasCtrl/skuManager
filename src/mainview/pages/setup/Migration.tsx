import { type ReactNode, useState } from "react";
import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { Skeleton } from "../../components/Skeleton";
import { btn, btnPrimary } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";

export function Migration({
  db,
  onDone,
}: {
  db: { dbVersion: string; appVersion: string };
  onDone: () => void;
}) {
  const t = useT();
  const [backup, setBackup] = useState<string | null>(null); // set once migrated
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = backup !== null;
  const app = `v${db.appVersion}`;
  const [plannedBackup] = useState(
    () => `db.backup-v${db.dbVersion}-${new Date().toISOString().slice(0, 10)}.sqlite`,
  );

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setBackup((await api.migrate({})).backup);
    } catch (e) {
      setError(errMsg(e));
    }
    setBusy(false);
  };

  const step = (n: number, title: string, detail: ReactNode, last?: boolean) => (
    <li className={`flex gap-3.5 py-3.5 ${last ? "" : "border-b border-divider"}`}>
      <span
        className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-semibold ${
          done ? "bg-active-bg text-active-fg" : "bg-divider text-ink"
        }`}
      >
        {done ? <Icon name="check" size={16} strokeWidth={2.25} /> : n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-[15px] font-medium">{title}</span>
        {detail}
      </div>
    </li>
  );

  return (
    <>
      <Skeleton />
      <Modal
        alert
        top={100}
        width={560}
        title={done ? t("migrate.titleDone") : t("migrate.title")}
        footer={
          done ? (
            <button type="button" className={btnPrimary} onClick={onDone}>
              {t("migrate.openProducts")}
            </button>
          ) : (
            <>
              <button type="button" className={btn} onClick={() => api.quit({})}>
                {t("common.quit")}
              </button>
              <button type="button" className={btnPrimary} disabled={busy} onClick={run}>
                {t("migrate.run")}
              </button>
            </>
          )
        }
      >
        <div className="flex flex-col gap-4 px-6 pb-2 pt-2">
          <p className="m-0 text-[15px] leading-[1.55] text-body">
            {done ? t("migrate.leadDone") : t("migrate.lead")}
          </p>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-divider bg-subtle px-3.5 py-3">
            <span className="text-[13px] text-muted">{t("common.database")}</span>
            <span className="font-mono text-[15px] font-medium">v{db.dbVersion}</span>
            <Icon name="arrowRight" size={16} className="text-muted" />
            <span className="font-mono text-[15px] font-medium">{app}</span>
            <span className="ml-auto text-[13px] text-muted">
              {t("migrate.app", { version: app })}
            </span>
          </div>
        </div>
        <ol className="m-0 flex list-none flex-col px-6 pb-6 pt-3">
          {step(
            1,
            done ? t("migrate.backupDone") : t("migrate.backup"),
            <span className="break-all font-mono text-xs text-muted">
              {backup ?? plannedBackup}
            </span>,
          )}
          {step(
            2,
            done
              ? t("migrate.migrateDone", { version: app })
              : t("migrate.migrate", { version: app }),
            <span className="text-sm leading-normal text-muted">{t("migrate.note")}</span>,
            true,
          )}
        </ol>
        {error && (
          <div className="px-6 pb-4">
            <ErrorText error={error} />
          </div>
        )}
      </Modal>
    </>
  );
}
