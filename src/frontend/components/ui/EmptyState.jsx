import { FileText, Plus } from "lucide-react";
import { Button } from "./button";
import { useNavigate } from "react-router-dom";

export function EmptyState({ hasFilter, onClearFilter }) {
  const navigate = useNavigate();

  if (hasFilter) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          No applications found
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          No applications match your current filter. Try adjusting your filters
          or view all applications.
        </p>
        <Button variant="outline" onClick={onClearFilter}>
          Clear Filter
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
        <FileText className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        No applications yet
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Get started by creating your first onboarding application. We&apos;ll
        guide you through the process step by step.
      </p>
      <Button
        onClick={() => navigate("/application/new")}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Create New Application
      </Button>
    </div>
  );
}
