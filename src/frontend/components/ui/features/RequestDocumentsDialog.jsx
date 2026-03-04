import React, { useState } from "react";
import {
  FileQuestion,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../primitives/Dialog";
import { Button } from "../primitives/Button";
import { Textarea } from "../primitives/Textarea";
import { Input } from "../primitives/Input";
import { Label } from "../primitives/Label";
import { Separator } from "../primitives/Separator";
import { toast } from "sonner";

const RequestDocumentsDialog = ({
  open,
  onOpenChange,
  businessName,
  missingCount,
  onSubmit, // ✅ NEW
  isSubmitting = false, // ✅ optional (nice for disabling button)
}) => {
  const [reason, setReason] = useState("");
  const [additionalDocs, setAdditionalDocs] = useState([{ name: "", description: "" }]);
  const [questions, setQuestions] = useState([""]);

  const addDocument = () => setAdditionalDocs([...additionalDocs, { name: "", description: "" }]);
  const removeDocument = (index) => setAdditionalDocs(additionalDocs.filter((_, i) => i !== index));

  const updateDocument = (index, field, value) => {
    const updated = [...additionalDocs];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalDocs(updated);
  };

  const addQuestion = () => setQuestions([...questions, ""]);
  const removeQuestion = (index) => setQuestions(questions.filter((_, i) => i !== index));

  const updateQuestion = (index, value) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const resetForm = () => {
    setReason("");
    setAdditionalDocs([{ name: "", description: "" }]);
    setQuestions([""]);
  };

  const handleSubmit = async () => {
    const trimmedReason = String(reason ?? "").trim();
    if (!trimmedReason) {
      toast.error("Please provide a reason for requesting documents.");
      return;
    }

    // ✅ Map UI -> backend keys
    const documentsPayload = additionalDocs
      .map((d) => ({
        document_name: String(d?.name ?? "").trim(),
        document_desc: String(d?.description ?? "").trim(),
      }))
      .filter((d) => d.document_name || d.document_desc); // keep non-empty rows

    const questionsPayload = questions
      .map((q) => ({ question_text: String(q ?? "").trim() }))
      .filter((q) => q.question_text);

    try {
      // if parent didn't pass onSubmit, still behave
      if (typeof onSubmit === "function") {
        await onSubmit({
          reason: trimmedReason,
          documents: documentsPayload,
          questions: questionsPayload,
        });
      }

      // parent will usually toast+navigate; but keep a fallback toast
      // (won't double-toast if parent already does; you can remove if you prefer)
      // toast.success("Document request sent to applicant");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      // parent likely handles toast; but fallback
      toast.error("Request failed", {
        description: err?.message || "Could not send request.",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // optional: reset when closing
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileQuestion className="h-5 w-5 text-warning" />
            Request Additional Information
          </DialogTitle>

          <DialogDescription>
            Send a request to{" "}
            <span className="font-medium text-foreground">{businessName}</span> for
            additional documents and clarifications.
            {missingCount > 0 && (
              <span className="flex items-center gap-1.5 mt-2 text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                {missingCount} document(s) currently missing or pending
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Section 1: Reason */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <Label className="text-sm font-semibold text-foreground">
                Reason for Request
              </Label>
            </div>

            <Textarea
              placeholder="Explain why additional documents or information is required..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          <Separator />

          {/* Section 2: Additional Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <Label className="text-sm font-semibold text-foreground">
                  Additional Documents Required
                </Label>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={addDocument}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            <div className="space-y-3">
              {additionalDocs.map((doc, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border p-3 space-y-2 bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Document name (e.g. Bank Statement)"
                      value={doc.name}
                      onChange={(e) => updateDocument(index, "name", e.target.value)}
                      className="flex-1"
                    />

                    {additionalDocs.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeDocument(index)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Textarea
                    placeholder="Brief description of what the document should contain..."
                    value={doc.description}
                    onChange={(e) => updateDocument(index, "description", e.target.value)}
                    className="min-h-[60px] resize-none text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Section 3: Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10">
                  <MessageSquare className="h-4 w-4 text-info" />
                </div>
                <Label className="text-sm font-semibold text-foreground">
                  Questions for {businessName}
                </Label>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={addQuestion}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {questions.map((q, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="mt-2.5 text-xs font-medium text-muted-foreground shrink-0 w-5 text-right">
                    {index + 1}.
                  </span>

                  <Textarea
                    placeholder="Enter a question you'd like the customer to answer..."
                    value={q}
                    onChange={(e) => updateQuestion(index, e.target.value)}
                    className="min-h-[60px] resize-none text-sm flex-1"
                  />

                  {questions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                      onClick={() => removeQuestion(index)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            type="button"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button className="gap-2" onClick={handleSubmit} type="button" disabled={isSubmitting}>
            <Send className="h-4 w-4" />
            {isSubmitting ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDocumentsDialog;