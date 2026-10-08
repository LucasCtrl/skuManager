import { useEffect, useMemo, useState } from "react";
import type { DbState, Lang, Settings, Theme } from "../shared/rpc";
import { detectLang, makeT, TContext, useT } from "./i18n";
import { ProductList, ProductPage } from "./pages";
import { api } from "./rpc";
import { btn, btnPrimary, ErrorText, errMsg, Modal } from "./ui";

type Page = { name: "list" } | { name: "product"; id: number } | { name: "settings" };

function useTheme(theme: Theme) {
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && mq.matches),
      );
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [db, setDb] = useState<DbState | null>(null);
  const [page, setPage] = useState<Page>({ name: "list" });

  useEffect(() => {
    api.getSettings({}).then(setSettings);
    api.getDbState({}).then(setDb);
  }, []);

  const lang: Lang = settings?.lang ?? detectLang();
  const t = useMemo(() => makeT(lang), [lang]);
  useTheme(settings?.theme ?? "system");
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const updateSettings = async (patch: Partial<Settings>) =>
    setSettings(await api.setSettings(patch));
  const chooseFolder = async () => {
    setDb(await api.chooseDataFolder({}));
    setSettings(await api.getSettings({}));
    setPage({ name: "list" });
  };

  if (!settings || !db) return null;

  return (
    <TContext.Provider value={t}>
      <div className="flex h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {db.kind === "ready" ? (
          <>
            <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
              {page.name !== "list" && (
                <button className={btn} onClick={() => setPage({ name: "list" })}>
                  ← {t("app.back")}
                </button>
              )}
              <span className="flex-1 font-semibold">{t("app.title")}</span>
              <button
                className={btn}
                aria-label={t("app.settings")}
                title={t("app.settings")}
                onClick={() => setPage({ name: "settings" })}
              >
                ⚙
              </button>
            </header>
            <main className="min-h-0 flex-1">
              {page.name === "list" && (
                <ProductList onOpen={(id) => setPage({ name: "product", id })} />
              )}
              {page.name === "product" && <ProductPage id={page.id} lang={lang} />}
              {page.name === "settings" && (
                <SettingsPage
                  settings={settings}
                  onChange={updateSettings}
                  onChooseFolder={chooseFolder}
                />
              )}
            </main>
          </>
        ) : (
          <DbGate db={db} onDb={setDb} onChooseFolder={chooseFolder} />
        )}
      </div>
    </TContext.Provider>
  );
}

// Everything that is not "ready": first launch, broken folder, version mismatch.
function DbGate({
  db,
  onDb,
  onChooseFolder,
}: {
  db: DbState;
  onDb: (s: DbState) => void;
  onChooseFolder: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const other = (
    <button className={btn} onClick={onChooseFolder}>
      {t("setup.chooseOther")}
    </button>
  );

  if (db.kind === "appOutdated")
    return (
      <Modal title={t("db.outdatedTitle")}>
        <p className="mb-4 text-sm">
          {t("db.outdatedText", { db: db.dbVersion, app: db.appVersion })}
        </p>
        <div className="flex justify-end">{other}</div>
      </Modal>
    );

  if (db.kind === "needsMigration")
    return (
      <Modal title={t("db.migrateTitle")}>
        <p className="mb-4 text-sm">
          {t("db.migrateText", { db: db.dbVersion, app: db.appVersion })}
        </p>
        <ErrorText error={error} />
        <div className="flex justify-end gap-2">
          {other}
          <button
            className={btnPrimary}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                onDb(await api.migrate({}));
              } catch (e) {
                setError(errMsg(e));
                setBusy(false);
              }
            }}
          >
            {t("db.migrate")}
          </button>
        </div>
      </Modal>
    );

  return (
    <div className="m-auto max-w-md space-y-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">{t("setup.title")}</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("setup.text")}</p>
      {db.kind === "error" && <ErrorText error={db.message} />}
      <button className={btnPrimary} onClick={onChooseFolder}>
        {t("setup.choose")}
      </button>
    </div>
  );
}

function SettingsPage({
  settings,
  onChange,
  onChooseFolder,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onChooseFolder: () => void;
}) {
  const t = useT();
  const [versions, setVersions] = useState<{ app: string; db: string | null } | null>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getVersions({}).then(setVersions);
  }, []);

  const row = "grid grid-cols-[12rem_1fr] items-center gap-4 py-3";
  const seg = (active: boolean) =>
    `px-3 py-1.5 text-sm ${active ? "bg-blue-600 text-white" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`;

  return (
    <div className="mx-auto max-w-2xl divide-y divide-neutral-200 p-6 dark:divide-neutral-800">
      <div className={row}>
        <span className="text-sm font-medium">{t("settings.dataFolder")}</span>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate text-sm">{settings.dataFolder}</code>
          <button className={btn} onClick={onChooseFolder}>
            {t("settings.change")}
          </button>
        </div>
      </div>
      <div className={row}>
        <span className="text-sm font-medium">{t("settings.versions")}</span>
        <span className="text-sm">
          {t("settings.appVersion")} v{versions?.app} · {t("settings.dbVersion")} v{versions?.db}
        </span>
      </div>
      <div className={row}>
        <span className="text-sm font-medium">{t("settings.theme")}</span>
        <div className="flex w-fit overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-600">
          {(["system", "light", "dark"] as const).map((th) => (
            <button
              key={th}
              className={seg(settings.theme === th)}
              onClick={() => onChange({ theme: th })}
            >
              {t(`settings.theme.${th}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={row}>
        <span className="text-sm font-medium">{t("settings.language")}</span>
        <div className="flex w-fit overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-600">
          {(
            [
              ["en", "English"],
              ["fr", "Français"],
            ] as const
          ).map(([l, label]) => (
            <button
              key={l}
              className={seg((settings.lang ?? detectLang()) === l)}
              onClick={() => onChange({ lang: l })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={row}>
        <span className="text-sm font-medium">{t("settings.backup")}</span>
        <div className="space-y-2">
          <button
            className={btn}
            onClick={async () => {
              setError(null);
              try {
                setBackupMsg(t("settings.backupDone", { path: await api.backupDb({}) }));
              } catch (e) {
                setError(errMsg(e));
              }
            }}
          >
            {t("settings.backupNow")}
          </button>
          {backupMsg && <p className="break-all text-xs text-neutral-500">{backupMsg}</p>}
          <ErrorText error={error} />
        </div>
      </div>
    </div>
  );
}
