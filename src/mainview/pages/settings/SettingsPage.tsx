import { useEffect, useState } from "react";
import { type AppInfo, type Lang, type Settings } from "../../../shared/rpc";
import { Icon } from "../../components/Icon";
import { btn, readonlyField } from "../../components/styles";
import { Code, errMsg, ErrorText, Rich } from "../../components/text";
import { fmtDateTime, useT } from "../../i18n";
import { api } from "../../rpc";
import { ListsSection } from "./ListsSection";
import { PricesSection } from "./PricesSection";
import { Radios, Section } from "./shared";

export function SettingsPage({
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
            vars={{
              products: <Code>1_PRODUCTS</Code>,
              materials: <Code>3_MATERIALS</Code>,
              parts: <Code>4_PARTS</Code>,
              db: <Code>db.sqlite</Code>,
            }}
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

      <PricesSection />
      <ListsSection />

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

      <div className="flex flex-col gap-1 text-[13px] text-muted">
        <span>{t("settings.skuFormats")}</span>
        <Code>EK-PRD_#####</Code>
        <Code>EK-MAT_SELLER_TYPE_COLOUR_FINISH_SIZE</Code>
        <Code>EK-PRT_SELLER_TYPE_SPECS</Code>
      </div>
    </main>
  );
}
