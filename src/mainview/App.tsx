import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppInfo, DbState, FolderInfo, Lang, Settings, Theme } from "../shared/rpc";
import { APP_VERSION } from "../shared/version";
import { detectLang, fmtDateTime, makeT, TContext, useT } from "./i18n";
import { ProductList, ProductPage } from "./pages";
import { api } from "./rpc";
import {
  btn,
  btnPrimary,
  card,
  Code,
  ErrorText,
  errMsg,
  Icon,
  iconBtn,
  Logo,
  Modal,
  readonlyField,
  Rich,
  Skeleton,
} from "./ui";

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

  const updateSettings = async (patch: Partial<Settings>) => {
    setSettings((s) => s && { ...s, ...patch }); // optimistic: radios react immediately
    setSettings(await api.setSettings(patch));
  };
  const openFolder = async (path: string) => {
    const state = await api.openDataFolder({ path });
    setDb(state);
    setSettings(await api.getSettings({}));
    setPage({ name: "list" });
    return state;
  };
  // Settings "Change…" and the version dialogs: pick, then open straight away.
  const pickAndOpen = async () => {
    const path = await api.pickFolder({ start: settings?.dataFolder ?? null });
    if (path) await openFolder(path);
  };
  const toFirstRun = () => setDb({ kind: "noFolder" });

  if (!settings || !db) return null;

  return (
    <TContext.Provider value={t}>
      <div className="flex min-h-screen flex-col bg-canvas text-ink">
        {db.kind === "noFolder" || db.kind === "error" ? (
          <FirstRun error={db.kind === "error" ? db.message : null} onOpen={openFolder} />
        ) : db.kind === "appOutdated" ? (
          <AppOutdated db={db} folder={settings.dataFolder} onChooseOther={toFirstRun} />
        ) : db.kind === "needsMigration" ? (
          <Migration db={db} onDone={() => setDb({ kind: "ready" })} />
        ) : (
          <>
            <Header page={page} folder={settings.dataFolder} onNavigate={setPage} />
            {page.name === "list" && (
              <ProductList lang={lang} onOpen={(id) => setPage({ name: "product", id })} />
            )}
            {page.name === "product" && <ProductPage id={page.id} lang={lang} />}
            {page.name === "settings" && (
              <SettingsPage
                lang={lang}
                settings={settings}
                onChange={updateSettings}
                onChangeFolder={pickAndOpen}
              />
            )}
          </>
        )}
      </div>
    </TContext.Provider>
  );
}

function Header({
  page,
  folder,
  onNavigate,
}: {
  page: Page;
  folder: string | null;
  onNavigate: (p: Page) => void;
}) {
  const t = useT();
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-line bg-surface px-6 py-2.5">
      {page.name === "list" ? (
        <>
          <Logo />
          <div className="flex min-w-0 flex-[1_1_200px] items-center gap-1.5 overflow-hidden whitespace-nowrap font-mono text-xs text-muted">
            <Icon name="folder" size={14} />
            <span className="truncate">{folder}</span>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onNavigate({ name: "list" })}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg pl-2 pr-3 text-[15px] font-medium text-ink hover:bg-hover"
        >
          <Icon name="back" />
          {t("app.products")}
        </button>
      )}
      {page.name !== "settings" && (
        <button
          type="button"
          className={`${iconBtn} ml-auto`}
          aria-label={t("app.settings")}
          title={t("app.settings")}
          onClick={() => onNavigate({ name: "settings" })}
        >
          <Icon name="settings" size={20} />
        </button>
      )}
    </header>
  );
}

// ---------- first run: choose data folder ----------

function FirstRun({
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
                <div className="flex items-center gap-2.5">
                  <Icon name="folder" size={16} className="text-accent" />
                  <span>1_PRODUCTS/</span>
                  <span className="font-sans text-muted">{t("firstRun.productsDir")}</span>
                </div>
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

const Stat = ({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-ok-muted">{label}</span>
    <span className={mono ? "font-mono text-sm font-medium" : "text-[15px] font-medium"}>
      {value}
    </span>
  </div>
);

// ---------- version checks ----------

function AppOutdated({
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

const VersionCell = ({ label, value, warn }: { label: string; value: string; warn?: boolean }) => (
  <div className="flex flex-col gap-0.5 bg-subtle px-3.5 py-3">
    <span className="text-xs text-muted">{label}</span>
    <span className={`font-mono text-base font-medium ${warn ? "text-warn" : ""}`}>{value}</span>
  </div>
);

function Migration({
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
  const plannedBackup = `db.backup-v${db.dbVersion}-${new Date().toISOString().slice(0, 10)}.sqlite`;

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

// ---------- settings ----------

const Section = ({
  title,
  text,
  children,
}: {
  title: string;
  text?: ReactNode;
  children: ReactNode;
}) => (
  <section className={`${card} flex flex-col gap-4 p-6`}>
    <div className="flex flex-col gap-1">
      <h2 className="m-0 text-base font-semibold">{title}</h2>
      {text && <p className="m-0 text-sm leading-normal text-muted">{text}</p>}
    </div>
    {children}
  </section>
);

function Radios<V extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string;
  legend: string;
  value: V;
  options: [V, string, Lang?][];
  onChange: (v: V) => void;
}) {
  return (
    <fieldset className="m-0 flex flex-wrap gap-6 border-0 p-0">
      <legend className="sr-only">{legend}</legend>
      {options.map(([v, label, lang]) => (
        <label
          key={v}
          lang={lang}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]"
        >
          <input
            type="radio"
            name={name}
            className="m-0 h-[18px] w-[18px]"
            checked={value === v}
            onChange={() => onChange(v)}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

function SettingsPage({
  lang,
  settings,
  onChange,
  onChangeFolder,
}: {
  lang: Lang;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onChangeFolder: () => void;
}) {
  const t = useT();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => api.getInfo({}).then(setInfo);
  useEffect(() => {
    load();
  }, []);

  const backup = async () => {
    setError(null);
    try {
      await api.backupDb({});
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <main className="mx-auto box-border flex w-full max-w-[760px] flex-col gap-5 px-6 pb-12 pt-8">
      <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em]">{t("settings.title")}</h1>

      <Section
        title={t("settings.dataFolder")}
        text={
          <Rich
            text={t("settings.dataFolderText")}
            vars={{ products: <Code>1_PRODUCTS</Code>, db: <Code>db.sqlite</Code> }}
          />
        }
      >
        <div className="flex flex-wrap gap-2">
          <label htmlFor="set-folder" className="sr-only">
            {t("settings.dataFolderPath")}
          </label>
          <input
            id="set-folder"
            type="text"
            readOnly
            value={settings.dataFolder ?? ""}
            className={readonlyField}
          />
          <button type="button" className={btn} onClick={onChangeFolder}>
            {t("settings.change")}
          </button>
          <button type="button" className={btn} onClick={() => api.revealDataFolder({})}>
            <Icon name="external" size={16} />
            {t("settings.openFolder")}
          </button>
        </div>
      </Section>

      <Section
        title={t("settings.database")}
        text={
          <Rich
            text={t("settings.backupText")}
            vars={{
              db: <Code>db.sqlite</Code>,
              backup: <Code>db.backup-&lt;version&gt;-&lt;date&gt;.sqlite</Code>,
            }}
          />
        }
      >
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className={btn} onClick={backup}>
            {t("settings.backupNow")}
          </button>
          <span className="text-[13px] text-muted">
            {info?.lastBackup
              ? t("settings.lastBackup", { date: fmtDateTime(info.lastBackup, lang) })
              : t("settings.noBackup")}
          </span>
        </div>
        <ErrorText error={error} />
      </Section>

      <Section title={t("settings.appearance")}>
        <Radios
          name="theme"
          legend={t("settings.appearance")}
          value={settings.theme}
          options={[
            ["system", t("settings.theme.system")],
            ["light", t("settings.theme.light")],
            ["dark", t("settings.theme.dark")],
          ]}
          onChange={(theme) => onChange({ theme })}
        />
      </Section>

      <Section title={t("settings.language")}>
        <Radios
          name="lang"
          legend={t("settings.language")}
          value={lang}
          options={[
            ["en", "English", "en"],
            ["fr", "Français", "fr"],
          ]}
          onChange={(l) => onChange({ lang: l })}
        />
      </Section>

      <Section title={t("settings.version")}>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">{t("settings.application")}</span>
            <span className="font-mono text-[15px] font-medium">v{info?.app}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">{t("common.database")}</span>
            <span className="font-mono text-[15px] font-medium">v{info?.db}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">{t("settings.state")}</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-active-fg">
              <Icon name="check" size={16} strokeWidth={2} />
              {t("settings.upToDate")}
            </span>
          </div>
        </div>
      </Section>

      <p className="m-0 text-[13px] text-muted">
        <Rich text={t("settings.skuFormat")} vars={{ format: <Code>EK-PRD_#####</Code> }} />
      </p>
    </main>
  );
}
