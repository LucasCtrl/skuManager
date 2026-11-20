import { type PartVersion } from "../../../shared/rpc";
import { StatusBadge, ToReviewBadge } from "../../components/status";

// Clickable part version rows: the parts of a product, the other versions of a part.
export const VersionRows = ({
  versions,
  onOpen,
}: {
  versions: PartVersion[];
  onOpen: (id: number) => void;
}) =>
  versions.map((v) => (
    <button
      key={v.id}
      type="button"
      onClick={() => onOpen(v.id)}
      className="flex w-full flex-wrap items-center gap-3 border-b border-divider px-5 py-3 text-left text-ink hover:bg-subtle focus-visible:-outline-offset-2"
    >
      <span className="break-all font-mono text-[13px] font-medium">{v.sku}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted">{v.name}</span>
      <StatusBadge status={v.status} />
      {v.toReview && <ToReviewBadge />}
    </button>
  ));
