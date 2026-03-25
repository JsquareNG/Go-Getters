import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from "@/components/ui";

const DECISION_CONFIG = {
  approve: {
    title: "Approve Application",
    description:
      "This will mark the application as approved. Please enter approval notes for audit purposes.",
    confirmLabel: "Approve Application",
    loadingLabel: "Approving...",
    textareaLabel: "Approval reason",
    placeholder:
      "E.g. KYC passed, supporting documents verified, and risk assessment is acceptable.",
    icon: CheckCircle2,
    iconClassName: "text-emerald-600",
    confirmClassName: "bg-emerald-600 text-white hover:bg-emerald-600/90",
    templates: [
      "KYC passed and supporting documents verified.",
      "Risk assessment acceptable and no material discrepancies found.",
      "All requested clarifications have been resolved satisfactorily.",
    ],
  },
  reject: {
    title: "Reject Application",
    description:
      "This will mark the application as rejected. Please provide a clear rejection reason for audit purposes.",
    confirmLabel: "Reject Application",
    loadingLabel: "Rejecting...",
    textareaLabel: "Rejection reason",
    placeholder:
      "E.g. Unable to verify source of funds, document inconsistencies found, or risk profile exceeds policy threshold.",
    icon: XCircle,
    iconClassName: "text-red-500",
    confirmClassName: "bg-red-500 text-white hover:bg-red-600",
    templates: [
      "Unable to verify identity or KYC information.",
      "Document inconsistencies or suspected unreliability detected.",
      "Risk profile exceeds acceptable policy threshold.",
      "Insufficient supporting information to proceed with onboarding.",
    ],
  },
};

export default function DecisionReasonDialog({
  open,
  onOpenChange,
  type = "approve",
  businessName = "",
  isSubmitting = false,
  onSubmit,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const config = useMemo(() => DECISION_CONFIG[type] || DECISION_CONFIG.approve, [type]);
  const Icon = config.icon;

  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open, type]);

  const handleClose = () => {
    if (isSubmitting) return;
    onOpenChange(false);
  };

  const handleUseTemplate = (template) => {
    setReason((prev) => {
      if (!prev.trim()) return template;
      return `${prev.trim()} ${template}`.trim();
    });

    if (error) setError("");
  };

  const handleSubmit = async () => {
    const trimmed = reason.trim();

    if (!trimmed) {
      setError("Reason is required.");
      return;
    }

    setError("");
    await onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Icon className={`h-5 w-5 ${config.iconClassName}`} />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
            {businessName ? (
              <span className="mt-2 mb-2 block text-sm text-foreground">
                Applicant Business Name: <span className="font-medium">{businessName}</span>
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{config.textareaLabel}</label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              placeholder={config.placeholder}
              disabled={isSubmitting}
              rows={5}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition ${
                error
                  ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-input focus:ring-2 focus:ring-ring/20"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            />

            <div className="flex items-center justify-between">
              <p className={`text-xs ${error ? "text-red-500" : "text-muted-foreground"}`}>
                {error || "Provide a concise but specific reason."}
              </p>
              <p className="text-xs text-muted-foreground">{reason.trim().length} characters</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quick templates
            </p>
            <div className="flex flex-wrap gap-2">
              {config.templates.map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => handleUseTemplate(template)}
                  disabled={isSubmitting}
                  className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-foreground transition hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={config.confirmClassName}
          >
            {isSubmitting ? config.loadingLabel : config.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}