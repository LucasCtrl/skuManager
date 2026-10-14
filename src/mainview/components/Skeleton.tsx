import { card } from "./styles";

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
