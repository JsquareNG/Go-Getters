import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "../primitives";

function StatCard({ icon, label, value, variant = "default" }) {
  const variantStyles = {
    default: "text-muted-foreground",
    warning: "text-rose-500",
    success: "text-emerald-400",
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

const StaffStats = ({
  totalPending,
  enhancedEDD,
  standardEDD,
}) => {
  return (
    <div className="flex flex-wrap gap-4">
      <StatCard
        icon={<FileText className="h-5 w-5" />}
        label="Total Pending"
        value={totalPending}
      />
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        label="Enhanced EDD"
        value={enhancedEDD}
        variant="warning"
      />
      <StatCard
        icon={<CheckCircle2 className="h-5 w-5 text-amber-500" />}
        label="Standard EDD"
        value={standardEDD}
      />
    </div>
  );
}

export { StaffStats };