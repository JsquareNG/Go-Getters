import React, { useEffect, useMemo, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
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
import { Label } from "../primitives/Label";
import { toast } from "sonner";

import { uploadDocument } from "../../../api/documentApi";
import { secondSubmit } from "../../../api/applicationApi";

export function ResubmitDialog({
  open,
  onOpenChange,
  applicationId,
  email,
  firstName,
  actionRequired,
  requiredDocuments = [],
  requiredQuestions = [],
  onSuccess,
}) {
  const [filesByDocId, setFilesByDocId] = useState({});
  const [answersByQId, setAnswersByQId] = useState({});
  const [progressByDocId, setProgressByDocId] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggingDocId, setDraggingDocId] = useState(null);

  const docsCount = Array.isArray(requiredDocuments) ? requiredDocuments.length : 0;
  const qnsCount = Array.isArray(requiredQuestions) ? requiredQuestions.length : 0;

  useEffect(() => {
    if (!open) return;

    const seeded = {};
    (requiredQuestions || []).forEach((q) => {
      seeded[q.item_id] = q.answer_text ?? "";
    });

    setAnswersByQId(seeded);
    setFilesByDocId({});
    setProgressByDocId({});
    setDraggingDocId(null);
    setIsSubmitting(false);
  }, [open, requiredQuestions]);

  const resetAndClose = () => {
    setFilesByDocId({});
    setAnswersByQId({});
    setProgressByDocId({});
    setDraggingDocId(null);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const addFilesForDoc = (docItemId, files) => {
    setFilesByDocId((prev) => {
      const existing = prev[docItemId] || [];
      return { ...prev, [docItemId]: [...existing, ...files] };
    });
  };

  const removeFileForDoc = (docItemId, index) => {
    setFilesByDocId((prev) => {
      const arr = prev[docItemId] || [];
      return { ...prev, [docItemId]: arr.filter((_, i) => i !== index) };
    });
  };

  const handlePickFiles = (docItemId, e) => {
    if (!e.target.files) return;
    addFilesForDoc(docItemId, Array.from(e.target.files));
    e.target.value = "";
  };

  const handleDragOver = (e, docItemId) => {
    e.preventDefault();
    setDraggingDocId(docItemId);
  };

  const handleDragLeave = () => setDraggingDocId(null);

  const handleDrop = (e, docItemId) => {
    e.preventDefault();
    setDraggingDocId(null);
    if (e.dataTransfer?.files) {
      addFilesForDoc(docItemId, Array.from(e.dataTransfer.files));
    }
  };

  const totalSelectedFiles = useMemo(() => {
    return Object.values(filesByDocId).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
  }, [filesByDocId]);

  const validate = () => {
    if (!applicationId) {
      toast.error("Missing applicationId.");
      console.warn("[ResubmitDialog] Missing applicationId");
      return false;
    }

    if (!email || !firstName) {
      toast.error("Missing user info", {
        description: `email=${String(email)} firstName=${String(firstName)}`,
      });
      console.warn("[ResubmitDialog] Missing user info:", { email, firstName });
      return false;
    }

    if (docsCount > 0) {
      const missingDocFile = requiredDocuments.some(
        (d) => !(filesByDocId[d.item_id]?.length > 0)
      );
      if (missingDocFile) {
        toast.error("Please upload a file for each required document.");
        return false;
      }
    }

    if (qnsCount > 0) {
      const missingAnswer = requiredQuestions.some(
        (q) => !(answersByQId[q.item_id] || "").trim()
      );
      if (missingAnswer) {
        toast.error("Please answer all required questions.");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    console.log("[ResubmitDialog] Submit clicked", {
      applicationId,
      email,
      firstName,
      docsCount,
      qnsCount,
      filesByDocId,
      answersByQId,
    });

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      for (const doc of requiredDocuments) {
        const docId = doc.item_id;
        const files = filesByDocId[docId] || [];

        for (const file of files) {
          await uploadDocument({
            applicationId,
            documentType: doc.document_name,
            file,
            onProgress: (pct) => {
              setProgressByDocId((prev) => ({ ...prev, [docId]: pct }));
            },
          });
        }
      }

      const payload = {
        email,
        firstName,
        question_answers: requiredQuestions.map((q) => ({
          item_id: q.item_id,
          answer_text: (answersByQId[q.item_id] || "").trim(),
        })),
      };

      console.log("[ResubmitDialog] Calling secondSubmit with:", payload);

      await secondSubmit(applicationId, payload);

      if (onSuccess) {
        await onSuccess();
      }

      toast.success("Resubmission sent successfully.");
      resetAndClose();
    } catch (err) {
      console.error("[ResubmitDialog] Resubmit failed:", err?.response?.data || err);
      toast.error("Failed to submit resubmission.", {
        description: err?.response?.data?.detail || err?.message || "Unknown error",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl">Upload Documents</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed mb-2">
            Upload the required documents and answer the additional questions for review.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-5">
          {actionRequired && (
            <div className="rounded-lg border border-red-200 bg-red-50/60 px-4 py-3">
              <p className="text-sm font-semibold text-red-600 mb-1">Reason for Escalation</p>
              <p className="text-sm text-foreground leading-relaxed">{actionRequired}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {docsCount} document{docsCount === 1 ? "" : "s"} & {qnsCount} question
                {qnsCount === 1 ? "" : "s"}
              </p>
            </div>
          )}

          {docsCount > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Documents</h3>

              <div className="space-y-3">
                {requiredDocuments.map((doc) => {
                  const docId = doc.item_id;
                  const files = filesByDocId[docId] || [];
                  const isDragging = draggingDocId === docId;
                  const progress = progressByDocId[docId];

                  return (
                    <div key={docId} className="rounded-xl border border-border bg-background p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-foreground">
                          {doc.document_name || "Document"}
                        </p>
                        {doc.document_desc ? (
                          <p className="text-sm text-muted-foreground">{doc.document_desc}</p>
                        ) : null}
                      </div>

                      <div
                        onDragOver={(e) => handleDragOver(e, docId)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, docId)}
                        onClick={() => document.getElementById(`file-${docId}`)?.click()}
                        className={[
                          "flex items-center justify-center rounded-lg border border-dashed px-4 py-4 cursor-pointer transition-colors",
                          isDragging
                            ? "border-red-400 bg-red-50"
                            : "border-border hover:border-red-300 hover:bg-muted/30",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">Click to upload</span>
                          <span className="text-muted-foreground">or drag & drop</span>
                        </div>

                        <input
                          id={`file-${docId}`}
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => handlePickFiles(docId, e)}
                          disabled={isSubmitting}
                        />
                      </div>

                      {typeof progress === "number" && isSubmitting && (
                        <div className="mt-3">
                          <div className="h-2 w-full rounded bg-muted overflow-hidden">
                            <div
                              className="h-2 bg-red-500"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
                        </div>
                      )}

                      {files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {files.map((file, index) => (
                            <div
                              key={`${file.name}-${file.size}-${index}`}
                              className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-sm truncate">{file.name}</span>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={isSubmitting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFileForDoc(docId, index);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {qnsCount > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Additional Questions</h3>

              <div className="space-y-3">
                {requiredQuestions.map((q, idx) => (
                  <div key={q.item_id} className="rounded-xl border border-border bg-background p-4">
                    <Label className="text-sm font-semibold">{`Question ${idx + 1}`}</Label>
                    <p className="mt-1 text-sm text-foreground">{q.question_text}</p>

                    <Textarea
                      className="mt-3 rounded-xl focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-red-400"
                      rows={3}
                      placeholder="Type your answer..."
                      disabled={isSubmitting}
                      value={answersByQId[q.item_id] ?? ""}
                      onChange={(e) =>
                        setAnswersByQId((prev) => ({
                          ...prev,
                          [q.item_id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-5">
          <Button type="button" variant="outline" onClick={resetAndClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (docsCount > 0 && totalSelectedFiles === 0)}
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <Upload className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}