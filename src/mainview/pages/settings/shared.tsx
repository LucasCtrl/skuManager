import { type ReactNode, useEffect, useState } from "react";
import { type Lang, type ListEntry, type ListName } from "../../../shared/rpc";
import { card } from "../../components/styles";
import { api } from "../../rpc";

export const Section = ({
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

export function Radios<V extends string>({
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

export type Pending = { list: ListName; name: string; code: string; typed: string };

export function useEntries() {
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const load = () => api.listEntries({}).then(setEntries);
  useEffect(() => {
    load();
  }, []);
  return { entries, load };
}
