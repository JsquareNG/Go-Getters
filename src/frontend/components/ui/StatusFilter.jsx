import { cn } from "../../lib/utils";

const statuses = [
  "All",
  "Requires Action",
  "In Progress",
  "Not started",
  "Submitted",
  "In Review",
  "Approved",
];

const statusStyles = {
  All: "data-[active=true]:bg-foreground data-[active=true]:text-background",
  "Not started":
    "data-[active=true]:bg-status-not-started data-[active=true]:text-background",
  "In Progress":
    "data-[active=true]:bg-status-in-progress data-[active=true]:text-background",
  Submitted:
    "data-[active=true]:bg-status-submitted data-[active=true]:text-background",
  "In Review":
    "data-[active=true]:bg-status-in-review data-[active=true]:text-background",
  "Requires Action":
    "data-[active=true]:bg-status-requires-action data-[active=true]:text-background",
  Approved:
    "data-[active=true]:bg-status-approved data-[active=true]:text-background",
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
