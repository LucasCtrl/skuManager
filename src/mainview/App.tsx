import { useEffect, useMemo, useState } from "react";
import { type DbState, type ItemKind, type Lang, type Settings, type Theme } from "../shared/rpc";
import { detectLang, makeT, TContext } from "./i18n";
import { Header } from "./layouts/Header";
import { ItemList } from "./pages/items/ItemList";
import { ItemPage } from "./pages/items/ItemPage";
import { ProductList } from "./pages/products/ProductList";
import { ProductPage } from "./pages/products/ProductPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { AppOutdated } from "./pages/setup/AppOutdated";
import { FirstRun } from "./pages/setup/FirstRun";
import { Migration } from "./pages/setup/Migration";
import { api } from "./rpc";

export type Page =
  | { name: "list" }
  | { name: "product"; id: number }
  | { name: "items"; kind: ItemKind }
  | { name: "item"; kind: ItemKind; id: number }
  | { name: "settings" };

export function useTheme(theme: Theme) {
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
            {page.name === "items" && (
              <ItemList
                key={page.kind}
                kind={page.kind}
                onOpen={(id) => setPage({ name: "item", kind: page.kind, id })}
              />
            )}
            {page.name === "item" && <ItemPage key={page.id} id={page.id} lang={lang} />}
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
