import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "./card";

function StatCard({ icon, label, value, variant = "default" }) {
  const variantStyles = {
    default: "text-muted-foreground",
    warning: "text-status-requires-action",
    success: "text-status-approved",
  };

  return (
    <Card className="flex-1 min-w-[140px]">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={variantStyles[variant]}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApplicationStats({
  total,
  pending,
  requiresAction,
  approved,
}) {
  return (
    <div className="flex flex-wrap gap-4">
      <StatCard
        icon={<FileText className="h-5 w-5" />}
        label="Total Applications"
        value={total}
      />
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        label="Pending Review"
        value={pending}
      />
      <StatCard
        icon={<AlertTriangle className="h-5 w-5" />}
        label="Requires Action"
        value={requiresAction}
        variant="warning"
      />
      <StatCard
        icon={<CheckCircle2 className="h-5 w-5" />}
        label="Approved"
        value={approved}
        variant="success"
      />
    </div>
  );
}
