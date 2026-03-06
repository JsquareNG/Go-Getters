import { cn } from "@/lib/utils";

const statuses = ["Total Pending", "Enhanced EDD", "Standard EDD"];

const statusStyles = {
  "Total Pending":
    "data-[active=true]:bg-slate-500 data-[active=true]:text-background",
  "Enhanced EDD":
    "data-[active=true]:bg-red-500 data-[active=true]:text-background",
  "Standard EDD":
    "data-[active=true]:bg-orange-400 data-[active=true]:text-background",
};

const StatusFilter = ({ selectedStatus, onStatusChange, statusCounts }) => {
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
              selectedStatus === status ? "opacity-80" : "text-muted-foreground"
            )}
          >
            {statusCounts?.[status] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
};

export { StatusFilter };