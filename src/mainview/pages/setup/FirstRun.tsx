import { type ReactNode, useEffect, useState } from "react";
import { type DbState, type FolderInfo } from "../../../shared/rpc";
import { DIRS } from "../../../shared/sku";
import { APP_VERSION } from "../../../shared/version";
import { Icon } from "../../components/Icon";
import { Logo } from "../../components/Logo";
import { btn, btnPrimary, card, readonlyField } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";

export function FirstRun({
  error: initialError,
  onOpen,
}: {
  error: string | null;
  onOpen: (path: string) => Promise<DbState>;
}) {
  const t = useT();
  const [info, setInfo] = useState<FolderInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  const inspect = async (path: string) => setInfo(await api.inspectFolder({ path }));
  useEffect(() => {
    api.defaultFolder({}).then(inspect);
  }, []);

  const browse = async () => {
    const path = await api.pickFolder({ start: info?.path ?? null });
    if (path) {
      setError(null);
      await inspect(path);
    }
  };
  const open = async () => {
    if (!info) return;
    setBusy(true);
    try {
      const state = await onOpen(info.path);
      if (state.kind === "error") setError(state.message);
    } catch (e) {
      setError(errMsg(e));
    }
    setBusy(false);
  };

  return (
    <div className="box-border flex min-h-screen items-center justify-center px-4 py-12">
      <div
        className={`${card} box-border flex w-full max-w-[560px] flex-col gap-7 rounded-xl p-10`}
      >
        <Logo big />
        <div className="flex flex-col gap-2.5">
          <h1 className="m-0 text-[26px] font-semibold leading-tight tracking-[-0.01em]">
            {t("firstRun.title")}
          </h1>
          <p className="m-0 text-[15px] leading-[1.55] text-muted">{t("firstRun.text")}</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="folder" className="text-[13px] font-medium">
            {t("firstRun.folder")}
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="folder"
              type="text"
              readOnly
              value={info?.path ?? ""}
              className={readonlyField}
            />
            <button type="button" className={btn} onClick={browse}>
              {t("firstRun.browse")}
            </button>
          </div>
        </div>

        {info?.hasDb ? (
          <div className="flex flex-col gap-3 rounded-lg border border-ok-line bg-ok-soft px-5 py-[18px]">
            <div className="flex items-center gap-2.5 text-active-fg">
              <Icon name="check" strokeWidth={2} />
              <span className="text-[15px] font-semibold text-ok-ink">
                {t("firstRun.existing")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label={t("firstRun.products")} value={info.products ?? "—"} />
              <Stat
                label={t("common.database")}
                value={info.dbVersion ? `v${info.dbVersion}` : "—"}
                mono
              />
              <Stat label={t("common.thisApp")} value={`v${APP_VERSION}`} mono />
            </div>
            <p className="m-0 text-[13px] leading-normal text-ok-muted">
              {t("firstRun.existingNote")}
            </p>
          </div>
        ) : (
          info && (
            <div className="flex flex-col gap-2.5 rounded-lg border border-divider bg-subtle px-5 py-[18px]">
              <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
                {t("firstRun.empty")}
              </span>
              <div className="flex flex-col gap-2 font-mono text-[13px]">
                {(["product", "material", "part"] as const).map((k) => (
                  <div key={k} className="flex items-center gap-2.5">
                    <Icon name="folder" size={16} className="text-accent" />
                    <span>{DIRS[k]}/</span>
                    <span className="font-sans text-muted">{t(`firstRun.dir.${k}`)}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2.5">
                  <Icon name="database" size={16} className="text-muted" />
                  <span>db.sqlite</span>
                  <span className="font-sans text-muted">
                    {t("firstRun.dbFile", { version: `v${APP_VERSION}` })}
                  </span>
                </div>
              </div>
            </div>
          )
        )}

        <ErrorText error={error} />

        <div className="flex justify-end">
          <button
            type="button"
            className={`${btnPrimary} px-[22px]`}
            disabled={!info || busy}
            onClick={open}
          >
            {info?.hasDb ? t("firstRun.open") : t("firstRun.create")}
          </button>
        </div>
      </div>
    </div>
  );
}

export const Stat = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-ok-muted">{label}</span>
    <span className={mono ? "font-mono text-sm font-medium" : "text-[15px] font-medium"}>
      {value}
    </span>
  </div>
);
