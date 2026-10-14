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
