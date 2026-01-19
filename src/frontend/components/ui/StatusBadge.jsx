import { cn } from "../../lib/utils";

const statusConfig = {
  "Not started": {
    className: "bg-muted text-muted-foreground",
    dotClassName: "bg-status-not-started",
  },
  "In Progress": {
    className: "bg-status-in-progress/10 text-status-in-progress",
    dotClassName: "bg-status-in-progress",
  },
  Submitted: {
    className: "bg-status-submitted/10 text-status-submitted",
    dotClassName: "bg-status-submitted",
  },
  "In Review": {
    className: "bg-status-in-review/10 text-status-in-review",
    dotClassName: "bg-status-in-review",
  },
  "Requires Action": {
    className: "bg-status-requires-action/10 text-status-requires-action",
    dotClassName: "bg-status-requires-action",
  },
  Approved: {
    className: "bg-status-approved/10 text-status-approved",
    dotClassName: "bg-status-approved",
  },
};

export function StatusBadge({ status, className }) {
  const config = statusConfig[status];

  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        config.className,
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", config.dotClassName)}
      />
      {status}
    </span>
  );
}
