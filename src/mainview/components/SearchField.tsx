import { Icon } from "./Icon";

// Search box at the top of a list. The list refreshes on every keystroke.
export function SearchField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="box-border flex h-11 min-w-0 flex-[1_1_320px] items-center gap-2.5 rounded-lg border border-line-strong bg-surface px-3.5 text-muted focus-within:border-ink">
      <Icon name="search" />
      <label htmlFor="search" className="sr-only">
        {label}
      </label>
      <input
        id="search"
        type="search"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted focus-visible:outline-none"
      />
    </div>
  );
}
