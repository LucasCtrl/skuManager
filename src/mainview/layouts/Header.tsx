import { type Page } from "../App";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Logo";
import { iconBtn } from "../components/styles";
import { useT } from "../i18n";

export function Header({
  page,
  folder,
  onNavigate,
}: {
  page: Page;
  folder: string | null;
  onNavigate: (p: Page) => void;
}) {
  const t = useT();
  // A product, material or part page highlights the link of its list.
  const current =
    page.name === "list" || page.name === "product"
      ? "products"
      : page.name === "items" || page.name === "item"
        ? page.kind
        : null;
  const links: [string, string, Page][] = [
    ["products", t("app.products"), { name: "list" }],
    ["material", t("app.materials"), { name: "items", kind: "material" }],
    ["part", t("app.parts"), { name: "items", kind: "part" }],
  ];
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-line bg-surface px-6 py-2.5">
      <Logo />
      <nav aria-label={t("app.lists")} className="ml-2 flex items-center gap-1">
        {links.map(([key, label, target]) => (
          <button
            key={key}
            type="button"
            aria-current={current === key ? "page" : undefined}
            onClick={() => onNavigate(target)}
            className="inline-flex h-10 items-center rounded-lg px-3 text-[15px] font-medium text-muted hover:bg-hover hover:text-ink aria-[current=page]:bg-canvas aria-[current=page]:text-ink"
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="flex min-w-0 flex-[1_1_200px] items-center justify-end gap-1.5 overflow-hidden whitespace-nowrap font-mono text-xs text-muted">
        <Icon name="folder" size={14} />
        <span className="truncate">{folder}</span>
      </div>
      <button
        type="button"
        className={`${iconBtn} aria-[current=page]:bg-canvas`}
        aria-label={t("app.settings")}
        aria-current={page.name === "settings" ? "page" : undefined}
        title={t("app.settings")}
        onClick={() => onNavigate({ name: "settings" })}
      >
        <Icon name="settings" size={20} />
      </button>
    </header>
  );
}
