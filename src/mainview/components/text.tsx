import { Fragment, type ReactNode } from "react";
import { mono } from "./styles";

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
