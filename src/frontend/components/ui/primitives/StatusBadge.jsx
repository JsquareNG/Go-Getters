import { cn } from "@/lib/utils";

const statusConfig = {
  Draft: {
    className: "bg-blue-500/10 text-blue-500",
    dotClassName: "bg-blue-500",
  },
  Withdrawn: {
    className: "bg-violet-500/10 text-violet-500",
    dotClassName: "bg-violet-500",
  },
  "Under Review": {
    className: "bg-amber-500/10 text-amber-500",
    dotClassName: "bg-amber-500",
  },
  "Under Manual Review": {
    className: "bg-amber-500/10 text-amber-500",
    dotClassName: "bg-amber-500",
  },
  "Requires Action": {
    className: "bg-rose-600/10 text-rose-600",
    dotClassName: "bg-rose-600",
  },
  Approved: {
    className: "bg-emerald-400/10 text-emerald-400",
    dotClassName: "bg-emerald-400",
  },
  Rejected: {
    className: "bg-red-500/10 text-red-500",
    dotClassName: "bg-red-500",
  },
};

const StatusBadge = ({ status, className }) => {
  const config = statusConfig[status];

  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        config.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClassName)} />
      {status}
    </span>
  );
};

export { StatusBadge };
