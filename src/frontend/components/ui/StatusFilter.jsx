import { cn } from "../../lib/utils";

const statuses = [
  "All",
  "Requires Action",
  "Draft",
  "Under Manual Review",
  "Under Review",
  "Approved",
  "Rejected",
  "Withdrawn"
];

const statusStyles = {
  All: 
    "data-[active=true]:bg-slate-500 data-[active=true]:text-background",
  "Draft":
    "data-[active=true]:bg-blue-500 data-[active=true]:text-background",
  Submitted:
    "data-[active=true]:bg-violet-500 data-[active=true]:text-background",
  "Under Review":
    "data-[active=true]:bg-amber-500 data-[active=true]:text-background",
  "Under Manual Review":
    "data-[active=true]:bg-amber-500 data-[active=true]:text-background",
  "Requires Action":
    "data-[active=true]:bg-rose-600 data-[active=true]:text-background",
  Approved:
    "data-[active=true]:bg-emerald-400 data-[active=true]:text-background",
  "Rejected":
    "data-[active=true]:bg-red-400 data-[active=true]:text-background",
  "Withdrawn":
    "data-[active=true]:bg-red-400 data-[active=true]:text-background"
};

export function StatusFilter({
  selectedStatus,
  onStatusChange,
  statusCounts,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => (
        <button
          key={status}
          data-active={selectedStatus === status}
          onClick={() => onStatusChange(status)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            "border bg-background hover:bg-secondary",
            "data-[active=true]:border-transparent",
            statusStyles[status]
          )}
        >
          {status}
          <span
            className={cn(
              "text-xs tabular-nums",
              selectedStatus === status
                ? "opacity-80"
                : "text-muted-foreground"
            )}
          >
            {statusCounts?.[status] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}
