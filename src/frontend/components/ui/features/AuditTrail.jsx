import { useMemo } from "react";
import { format } from "date-fns";
import { History, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../primitives/Card";
import { StatusBadge } from "@/components/ui";

export function AuditTrail({ entries = [] }) {
  const sortedEntries = useMemo(() => {
    return [...entries].sort(
      (a, b) =>
        new Date(b?.created_at || 0).getTime() -
        new Date(a?.created_at || 0).getTime(),
    );
  }, [entries]);

  const getBadgeStatus = (entry) => {
    return entry?.to_status || entry?.event_type || "Updated";
  };

  const getActorLabel = (entry) => {
    return entry?.actor_type || null;
  };

  const getDescription = (entry) => {
    if (entry?.description) return entry.description;

    if (entry?.from_status && entry?.to_status) {
      return `Status changed from ${entry.from_status} to ${entry.to_status}.`;
    }

    return entry?.event_type || "Application updated.";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        {/* <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-muted-foreground" />
          Audit Trail
        </CardTitle> */}
      </CardHeader>

      <CardContent className="pt-0">
        {sortedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No audit trail records found.
          </p>
        ) : (
          <div className="space-y-0">
            {sortedEntries.map((entry, index) => (
              <div
                key={`${entry.application_id}-${entry.created_at}-${index}`}
                className="relative flex gap-3"
              >
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-slate-500/50" />
                  {index < sortedEntries.length - 1 && (
                    <div className="w-px flex-1 bg-slate-500/50" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pb-4">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge
                      status={getBadgeStatus(entry)}
                      className="px-1.5 py-0 text-[10px]"
                    />
                  </div>

                  <p className="text-xs leading-relaxed text-foreground font-medium">
                    {getDescription(entry)}
                  </p>

                  {(entry?.from_status || entry?.to_status) && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {entry?.from_status || "-"} → {entry?.to_status || "-"}
                    </p>
                  )}

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {entry?.created_at
                        ? format(
                            new Date(entry.created_at),
                            "MMM d, yyyy · h:mm a",
                          )
                        : "-"}
                    </span>

                    {getActorLabel(entry) && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <User className="h-2.5 w-2.5" />
                        {getActorLabel(entry)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}