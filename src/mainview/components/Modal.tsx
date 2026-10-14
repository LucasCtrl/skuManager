import { type ReactNode, useEffect } from "react";
import { useT } from "../i18n";
import { Icon } from "./Icon";
import { iconBtn } from "./styles";

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
