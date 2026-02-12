import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  StatusBadge,
} from "../primitives";
import { RiskBadge } from "./RiskBadge";
import {
  Clock,
  AlertTriangle,
  User,
  Building2,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow, differenceInHours, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const ApplicationReviewCard = ({ application, onReview }) => {
  const hoursUntilSLA = differenceInHours(
    parseISO(application.slaDeadline),
    new Date(),
  );
  const isUrgent = hoursUntilSLA <= 24 && hoursUntilSLA > 0;
  const isOverdue = hoursUntilSLA <= 0;

  return (
    <Card
      className={cn(
        "group hover:shadow-card-hover transition-all duration-200 border-l-4",
        application.riskLevel === "critical" && "border-l-risk-critical",
        application.riskLevel === "high" && "border-l-risk-high",
        application.riskLevel === "medium" && "border-l-risk-medium",
        application.riskLevel === "low" && "border-l-risk-low",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                {application.id}
              </span>
              <RiskBadge level={application.riskLevel} size="sm" />
            </div>

            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {application.customerName}
            </h3>

            {application.businessName && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                {application.businessName}
              </p>
            )}
          </div>

          <StatusBadge status={application.status} />
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {application.riskReasons.slice(0, 2).map((reason, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-md"
            >
              <AlertTriangle className="h-3 w-3" />
              {reason}
            </span>
          ))}

          {application.riskReasons.length > 2 && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs bg-secondary text-muted-foreground rounded-md">
              +{application.riskReasons.length - 2} more
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Submitted{" "}
            {formatDistanceToNow(parseISO(application.submissionDate), {
              addSuffix: true,
            })}
          </span>

          <div
            className={cn(
              "flex items-center gap-1 font-medium",
              isOverdue && "text-risk-critical",
              isUrgent && !isOverdue && "text-risk-medium",
              !isUrgent && !isOverdue && "text-muted-foreground",
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            {isOverdue ? (
              <span>SLA Breached</span>
            ) : (
              <span>{hoursUntilSLA}h remaining</span>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Product:{" "}
          <span className="font-medium text-foreground">
            {application.productType}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <Button
          className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors"
          variant="secondary"
          onClick={() => onReview(application.id)}
        >
          Review Application
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export { ApplicationReviewCard };
