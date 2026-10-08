import { Fragment, useEffect, useState, type ReactNode } from "react";
import { STATUSES, type Status } from "../shared/rpc";
import { useT } from "./i18n";
import { api } from "./rpc";

// ---------- class names (design tokens live in index.css / tailwind.config.js) ----------

export const btnPrimary =
  "inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-accent px-[18px] text-[15px] font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent";
export const btn =
  "inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-line-strong bg-surface px-4 text-[15px] font-medium text-ink hover:bg-hover disabled:opacity-50";
export const iconBtn =
  "flex h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-hover";
export const toolBtn =
  "inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm text-ink hover:bg-hover disabled:opacity-50";
export const field =
  "box-border w-full rounded-lg border border-line-strong bg-surface px-3 text-[15px] text-ink focus:border-ink focus:outline-none";
export const readonlyField =
  "box-border h-11 min-w-0 flex-[1_1_260px] rounded-lg border border-line-strong bg-subtle px-3 font-mono text-[13px] text-ink";
export const card = "rounded-[10px] border border-line bg-surface";
export const mono = "font-mono text-ink";

// ---------- icons (lucide paths, as in the design) ----------

const paths = {
  folder: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  folderPlus: (
    <>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M12 10v6M9 13h6" />
    </>
  ),
  file: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  plus: <path d="M5 12h14M12 5v14" />,
  back: <path d="m12 19-7-7 7-7M19 12H5" />,
  arrowRight: <path d="M5 12h14M12 5l7 7-7 7" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  pencil: <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />,
  copy: (
    <>
      <rect x="8" y="8" width="14" height="14" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </>
  ),
  trash: (
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  ),
  external: (
    <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  ),
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </>
  ),
  update: (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M12 8v4l2 2" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.75,
  className,
  fill = "none",
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className ?? ""}`}
    >
      {paths[name]}
    </svg>
  );
}

export const Logo = ({ big }: { big?: boolean }) => (
  <div className="flex items-center gap-2.5">
    <div
      className={`flex items-center justify-center bg-ink font-mono font-medium text-canvas ${
        big ? "h-9 w-9 rounded-[7px] text-[13px]" : "h-8 w-8 rounded-md text-xs"
      }`}
    >
      EK
    </div>
    <span className={`font-semibold ${big ? "text-base" : "text-[15px]"}`}>SKU Manager</span>
  </div>
);

// ---------- status ----------

export const statusTone: Record<Status, { bg: string; fg: string; dot: string }> = {
  "In development": { bg: "bg-dev-bg", fg: "text-dev-fg", dot: "bg-dev-fg" },
  Active: { bg: "bg-active-bg", fg: "text-active-fg", dot: "bg-active-fg" },
  Retired: { bg: "bg-retired-bg", fg: "text-retired-fg", dot: "bg-retired-fg" },
};

export const Dot = ({ status, size = 6 }: { status: Status; size?: number }) => (
  <span
    className={`inline-block shrink-0 rounded-full ${statusTone[status].dot}`}
    style={{ width: size, height: size }}
  />
);

export function StatusBadge({ status }: { status: Status }) {
  const t = useT();
  const s = statusTone[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.fg}`}
    >
      <Dot status={status} />
      {t(`status.${status}`)}
    </span>
  );
}

// ---------- misc ----------

// Translated text whose {placeholders} are elements, e.g. <Rich text={t("x")} vars={{ db: <code/> }} />.
export const Rich = ({ text, vars }: { text: string; vars: Record<string, ReactNode> }) => (
  <>
    {text.split(/\{(\w+)\}/).map((part, i) => (
      <Fragment key={i}>{i % 2 ? (vars[part] ?? `{${part}}`) : part}</Fragment>
    ))}
  </>
);

export const Code = ({ children }: { children: ReactNode }) => (
  <span className={mono}>{children}</span>
);

export const ErrorText = ({ error }: { error: string | null }) =>
  error ? (
    <p role="alert" className="m-0 text-sm text-danger">
      {error}
    </p>
  ) : null;

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Grey placeholder of the app behind blocking dialogs.
export const Skeleton = () => (
  <div aria-hidden="true" className="flex flex-col">
    <div className="h-16 border-b border-line bg-surface" />
    <div className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 py-8">
      <div className="h-[30px] w-[180px] rounded-md bg-line" />
      <div className={`h-11 ${card} rounded-lg`} />
      <div className={`h-[460px] ${card}`} />
    </div>
  </div>
);

export function Modal({
  title,
  titleExtra,
  icon,
  onClose,
  footer,
  children,
  width = 520,
  alert,
  top = 120,
}: {
  title: ReactNode;
  titleExtra?: ReactNode;
  icon?: ReactNode; // shown above the title (alert dialogs)
  onClose?: () => void;
  footer: ReactNode;
  children: ReactNode;
  width?: number;
  alert?: boolean;
  top?: number;
}) {
  const t = useT();
  useEffect(() => {
    if (!onClose) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 box-border flex items-start justify-center overflow-auto bg-scrim px-4 pb-8"
      style={{ paddingTop: top }}
    >
      <div
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="modal-title"
        className="flex w-full flex-col rounded-xl bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
        style={{ maxWidth: width }}
      >
        {icon && <div className="px-6 pt-7">{icon}</div>}
        <div
          className={`flex items-center justify-between gap-3 px-6 ${icon ? "pt-[18px]" : "pt-5"}`}
        >
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 id="modal-title" className="m-0 text-xl font-semibold">
              {title}
            </h2>
            {titleExtra}
          </div>
          {onClose && (
            <button
              type="button"
              aria-label={t("common.close")}
              className={`${iconBtn} -mr-2.5 text-muted`}
              onClick={onClose}
            >
              <Icon name="x" size={20} />
            </button>
          )}
        </div>
        {children}
        <div className="flex flex-wrap justify-end gap-2.5 border-t border-divider px-6 py-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

const Label = ({ htmlFor, children }: { htmlFor: string; children: ReactNode }) => (
  <label htmlFor={htmlFor} className="text-[13px] font-medium">
    {children}
  </label>
);

function NameAndDescription({
  name,
  description,
  rows,
  onName,
  onDescription,
}: {
  name: string;
  description: string;
  rows: number;
  onName: (v: string) => void;
  onDescription: (v: string) => void;
}) {
  const t = useT();
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pd-name">
          {t("product.name")}{" "}
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        </Label>
        <input
          id="pd-name"
          autoFocus
          required
          className={`${field} h-11`}
          value={name}
          onChange={(e) => onName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pd-desc">
          {t("product.description")}{" "}
          <span className="font-normal text-muted">{t("common.optional")}</span>
        </Label>
        <textarea
          id="pd-desc"
          rows={rows}
          placeholder={t("product.descriptionPlaceholder")}
          className={`${field} resize-y py-2.5 leading-normal`}
          value={description}
          onChange={(e) => onDescription(e.target.value)}
        />
      </div>
    </>
  );
}

// Shared submit/busy/error handling for both dialogs.
function useSubmit(fn: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

export function NewProductDialog({
  onCreate,
  onCancel,
}: {
  onCreate: (v: { name: string; description: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState<string | null>(null);
  const { busy, error, submit } = useSubmit(() => onCreate({ name, description }));

  useEffect(() => {
    api.nextSku({}).then(setSku, () => setSku(null));
  }, []);

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("product.newTitle")}
        onClose={onCancel}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={btnPrimary} disabled={busy || !name.trim()}>
              {t("product.create")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-divider bg-subtle px-3.5 py-3 text-[13px] text-muted">
            <span>{t("product.skuToBeAssigned")}</span>
            <span className={`${mono} text-sm font-medium`}>{sku ?? "—"}</span>
            <span className="ml-auto">
              <StatusBadge status="In development" />
            </span>
          </div>
          <NameAndDescription
            name={name}
            description={description}
            rows={4}
            onName={setName}
            onDescription={setDescription}
          />
          <p className="m-0 text-[13px] leading-normal text-muted">
            <Rich text={t("product.folderNote")} vars={{ dir: <Code>1_PRODUCTS</Code> }} />
          </p>
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}

export function EditProductDialog({
  sku,
  initial,
  onSave,
  onCancel,
}: {
  sku: string;
  initial: { name: string; description: string; status: Status };
  onSave: (v: { name: string; description: string; status: Status }) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [v, setV] = useState(initial);
  const { busy, error, submit } = useSubmit(() => onSave(v));

  return (
    <form onSubmit={submit}>
      <Modal
        title={t("product.editTitle")}
        titleExtra={<span className="font-mono text-[13px] text-muted">{sku}</span>}
        onClose={onCancel}
        width={560}
        top={96}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={btnPrimary} disabled={busy || !v.name.trim()}>
              {t("product.saveChanges")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          <NameAndDescription
            name={v.name}
            description={v.description}
            rows={3}
            onName={(name) => setV({ ...v, name })}
            onDescription={(description) => setV({ ...v, description })}
          />
          <fieldset role="radiogroup" className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1.5 p-0 text-[13px] font-medium">{t("product.status")}</legend>
            {STATUSES.map((s) => {
              const on = v.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setV({ ...v, status: s })}
                  className={`flex items-start gap-3 rounded-lg px-3.5 py-3 text-left text-ink ${
                    on
                      ? "border-[1.5px] border-ink bg-subtle"
                      : "border border-line-strong bg-surface"
                  }`}
                >
                  <span
                    className={`mt-px box-border flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[1.5px] ${
                      on ? "border-accent" : "border-faint"
                    }`}
                  >
                    {on && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="inline-flex items-center gap-2 text-[15px] font-medium">
                      <Dot status={s} size={8} />
                      {t(`status.${s}`)}
                    </span>
                    <span className="text-[13px] leading-[1.45] text-muted">
                      {t(`status.help.${s}`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </fieldset>
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}
