import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Upload } from "lucide-react";
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

import ResubmitDocumentUploadField from "./ResubmitDocumentUploadField";

const getAlternativeOptionsForDocument = (doc) => {
  // Later, replace this with Gemini-generated alternatives from backend.
  // Example supported shapes:
  // doc.alternative_documents = ["Utility Bill", "Tenancy Agreement"]
  // doc.alternativeDocumentOptions = [{ label: "Utility Bill", value: "utility_bill" }]
  if (Array.isArray(doc?.alternativeDocumentOptions) && doc.alternativeDocumentOptions.length > 0) {
    return doc.alternativeDocumentOptions.map((item) => {
      if (typeof item === "string") {
        return { label: item, value: item };
      }
      return {
        label: item.label || item.value || "Alternative Document",
        value: item.value || item.label || "Alternative Document",
      };
    });
  }

  if (Array.isArray(doc?.alternative_documents) && doc.alternative_documents.length > 0) {
    return doc.alternative_documents.map((item) => ({
      label: item,
      value: item,
    }));
  }

  // Temporary fallback options until Gemini/backend is wired in
  return [
    { label: "Bank Statement", value: "Bank Statement" },
    { label: "Utility Bill", value: "Utility Bill" },
    { label: "Tenancy Agreement", value: "Tenancy Agreement" },
    { label: "Government Letter", value: "Government Letter" },
    { label: "Other Supporting Document", value: "Other Supporting Document" },
  ];
};

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

  const [documentErrorsById, setDocumentErrorsById] = useState({});
  const [questionErrorsById, setQuestionErrorsById] = useState({});

  // New states for alternative-document flow
  const [useAlternativeByDocId, setUseAlternativeByDocId] = useState({});
  const [alternativeReasonByDocId, setAlternativeReasonByDocId] = useState({});
  const [alternativeTypeByDocId, setAlternativeTypeByDocId] = useState({});
  const [alternativeFilesByDocId, setAlternativeFilesByDocId] = useState({});
  const [alternativeProgressByDocId, setAlternativeProgressByDocId] = useState({});
  const [alternativeErrorsByDocId, setAlternativeErrorsByDocId] = useState({});

  const docsCount = Array.isArray(requiredDocuments) ? requiredDocuments.length : 0;
  const qnsCount = Array.isArray(requiredQuestions) ? requiredQuestions.length : 0;

  useEffect(() => {
    if (!open) return;

    const seededAnswers = {};
    (requiredQuestions || []).forEach((q) => {
      seededAnswers[q.item_id] = q.answer_text ?? "";
    });

    setAnswersByQId(seededAnswers);
    setFilesByDocId({});
    setProgressByDocId({});
    setDocumentErrorsById({});
    setQuestionErrorsById({});
    setIsSubmitting(false);

    setUseAlternativeByDocId({});
    setAlternativeReasonByDocId({});
    setAlternativeTypeByDocId({});
    setAlternativeFilesByDocId({});
    setAlternativeProgressByDocId({});
    setAlternativeErrorsByDocId({});
  }, [open, requiredQuestions]);

  const resetAndClose = () => {
    setFilesByDocId({});
    setAnswersByQId({});
    setProgressByDocId({});
    setDocumentErrorsById({});
    setQuestionErrorsById({});
    setIsSubmitting(false);

    setUseAlternativeByDocId({});
    setAlternativeReasonByDocId({});
    setAlternativeTypeByDocId({});
    setAlternativeFilesByDocId({});
    setAlternativeProgressByDocId({});
    setAlternativeErrorsByDocId({});

    onOpenChange(false);
  };

  const updateFileForDoc = (docItemId, file) => {
    setFilesByDocId((prev) => ({
      ...prev,
      [docItemId]: file,
    }));

    setDocumentErrorsById((prev) => ({
      ...prev,
      [docItemId]: "",
    }));
  };

  const updateAlternativeFileForDoc = (docItemId, file) => {
    setAlternativeFilesByDocId((prev) => ({
      ...prev,
      [docItemId]: file,
    }));

    setAlternativeErrorsByDocId((prev) => ({
      ...prev,
      [docItemId]: {
        ...(prev[docItemId] || {}),
        file: "",
      },
    }));
  };

  const updateAnswerForQuestion = (questionId, value) => {
    setAnswersByQId((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    setQuestionErrorsById((prev) => ({
      ...prev,
      [questionId]: "",
    }));
  };

  const toggleAlternativeMode = (docId) => {
    setUseAlternativeByDocId((prev) => {
      const nextValue = !prev[docId];

      if (nextValue) {
        // switching to alternative mode: clear normal upload + error
        setFilesByDocId((current) => ({
          ...current,
          [docId]: null,
        }));
        setDocumentErrorsById((current) => ({
          ...current,
          [docId]: "",
        }));
      } else {
        // switching back to normal mode: clear alternative fields + errors
        setAlternativeReasonByDocId((current) => ({
          ...current,
          [docId]: "",
        }));
        setAlternativeTypeByDocId((current) => ({
          ...current,
          [docId]: "",
        }));
        setAlternativeFilesByDocId((current) => ({
          ...current,
          [docId]: null,
        }));
        setAlternativeProgressByDocId((current) => ({
          ...current,
          [docId]: 0,
        }));
        setAlternativeErrorsByDocId((current) => ({
          ...current,
          [docId]: {},
        }));
      }

      return {
        ...prev,
        [docId]: nextValue,
      };
    });
  };

  const totalCompletedDocuments = useMemo(() => {
    return requiredDocuments.reduce((count, doc) => {
      const docId = doc.item_id;
      const isAlternative = !!useAlternativeByDocId[docId];

      if (isAlternative) {
        const hasReason = !!(alternativeReasonByDocId[docId] || "").trim();
        const hasType = !!(alternativeTypeByDocId[docId] || "").trim();
        const hasFile = !!alternativeFilesByDocId[docId];
        return hasReason && hasType && hasFile ? count + 1 : count;
      }

      return filesByDocId[docId] ? count + 1 : count;
    }, 0);
  }, [
    requiredDocuments,
    useAlternativeByDocId,
    alternativeReasonByDocId,
    alternativeTypeByDocId,
    alternativeFilesByDocId,
    filesByDocId,
  ]);

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

    const nextDocumentErrors = {};
    const nextQuestionErrors = {};
    const nextAlternativeErrors = {};
    let hasError = false;

    if (docsCount > 0) {
      requiredDocuments.forEach((doc) => {
        const docId = doc.item_id;
        const isAlternative = !!useAlternativeByDocId[docId];

        if (isAlternative) {
          const reason = (alternativeReasonByDocId[docId] || "").trim();
          const alternativeType = (alternativeTypeByDocId[docId] || "").trim();
          const alternativeFile = alternativeFilesByDocId[docId];

          const docAltErrors = {};

          if (!reason) {
            docAltErrors.reason = "Please explain why you cannot provide the original document.";
            hasError = true;
          }

          if (!alternativeType) {
            docAltErrors.type = "Please select an alternative document.";
            hasError = true;
          }

          if (!alternativeFile) {
            docAltErrors.file = "Please upload the alternative document.";
            hasError = true;
          }

          if (Object.keys(docAltErrors).length > 0) {
            nextAlternativeErrors[docId] = docAltErrors;
          }
        } else {
          if (!filesByDocId[docId]) {
            nextDocumentErrors[docId] = "Please upload the required document.";
            hasError = true;
          }
        }
      });
    }

    if (qnsCount > 0) {
      requiredQuestions.forEach((q) => {
        if (!(answersByQId[q.item_id] || "").trim()) {
          nextQuestionErrors[q.item_id] = "Answer is required.";
          hasError = true;
        }
      });
    }

    setDocumentErrorsById(nextDocumentErrors);
    setQuestionErrorsById(nextQuestionErrors);
    setAlternativeErrorsByDocId(nextAlternativeErrors);

    if (hasError) {
      toast.error("Please fix the highlighted fields.");
      return false;
    }

    return true;
  };

  // const handleSubmit = async () => {


  //   if (!validate()) return;

    

  //   return;
  //   // setIsSubmitting(true);

  //   // try {
  //   //   for (const doc of requiredDocuments) {
  //   //     const docId = doc.item_id;
  //   //     const isAlternative = !!useAlternativeByDocId[docId];
  //   //     const originalFile = filesByDocId[docId];
  //   //     const alternativeFile = alternativeFilesByDocId[docId];

  //   //     const fileToUpload = isAlternative ? alternativeFile : originalFile;
  //   //     if (!fileToUpload) continue;

  //   //     await uploadDocument({
  //   //       applicationId,
  //   //       // Keep original document name for now so existing backend flow is not broken.
  //   //       // Later you can extend backend to accept:
  //   //       // requestedDocumentName, submittedDocumentType, substituteReason, isAlternative
  //   //       documentType: doc.document_name,
  //   //       file: fileToUpload,
  //   //       onProgress: (pct) => {
  //   //         if (isAlternative) {
  //   //           setAlternativeProgressByDocId((prev) => ({ ...prev, [docId]: pct }));
  //   //         } else {
  //   //           setProgressByDocId((prev) => ({ ...prev, [docId]: pct }));
  //   //         }
  //   //       },
  //   //     });
  //   //   }

  //   //   const payload = {
  //   //     email,
  //   //     firstName,
  //   //     question_answers: requiredQuestions.map((q) => ({
  //   //       item_id: q.item_id,
  //   //       answer_text: (answersByQId[q.item_id] || "").trim(),
  //   //     })),

  //   //     // Do NOT send this to backend unless your API supports it.
  //   //     // Keeping it in frontend console for now so you can wire it later.
  //   //     // alternative_document_responses: requiredDocuments
  //   //     //   .filter((doc) => useAlternativeByDocId[doc.item_id])
  //   //     //   .map((doc) => ({
  //   //     //     item_id: doc.item_id,
  //   //     //     requested_document_name: doc.document_name,
  //   //     //     substitute_reason: (alternativeReasonByDocId[doc.item_id] || "").trim(),
  //   //     //     substitute_document_type: (alternativeTypeByDocId[doc.item_id] || "").trim(),
  //   //     //   })),
  //   //   };

  //   //   console.log("[ResubmitDialog] Alternative document data:", requiredDocuments
  //   //     .filter((doc) => useAlternativeByDocId[doc.item_id])
  //   //     .map((doc) => ({
  //   //       item_id: doc.item_id,
  //   //       requested_document_name: doc.document_name,
  //   //       substitute_reason: (alternativeReasonByDocId[doc.item_id] || "").trim(),
  //   //       substitute_document_type: (alternativeTypeByDocId[doc.item_id] || "").trim(),
  //   //     }))
  //   //   );

  //   //   console.log("[ResubmitDialog] Calling secondSubmit with:", payload);

  //   //   await secondSubmit(applicationId, payload);

  //   //   if (onSuccess) {
  //   //     await onSuccess();
  //   //   }

  //   //   toast.success("Resubmission sent successfully.");
  //   //   resetAndClose();
  //   // } catch (err) {
  //   //   console.error("[ResubmitDialog] Resubmit failed:", err?.response?.data || err);
  //   //   toast.error("Failed to submit resubmission.", {
  //   //     description: err?.response?.data?.detail || err?.message || "Unknown error",
  //   //   });
  //   //   setIsSubmitting(false);
  //   // }
  // };

  const handleSubmit = async () => {
    console.log("[ResubmitDialog] Submit clicked", {
      applicationId,
      email,
      firstName,
      filesByDocId,
      useAlternativeByDocId,
      alternativeTypeByDocId,
    });

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // 1) Upload files
      for (const doc of requiredDocuments) {
        const docId = doc.item_id;
        const isAlternative = !!useAlternativeByDocId[docId];

        const originalFile = filesByDocId[docId];
        const alternativeFile = alternativeFilesByDocId[docId];
        const fileToUpload = isAlternative ? alternativeFile : originalFile;

        if (!fileToUpload) continue;

        const documentType = isAlternative
          ? (alternativeTypeByDocId[docId] || "").trim()
          : doc.document_name;

        await uploadDocument({
          applicationId,
          documentType, // ✅ FIXED HERE
          file: fileToUpload,
          onProgress: (pct) => {
            if (isAlternative) {
              setAlternativeProgressByDocId((prev) => ({
                ...prev,
                [docId]: pct,
              }));
            } else {
              setProgressByDocId((prev) => ({
                ...prev,
                [docId]: pct,
              }));
            }
          },
        });
      }

      // 2) Build payload
      const payload = {
        email,
        firstName,

        question_answers: requiredQuestions.map((q) => ({
          item_id: q.item_id,
          answer_text: (answersByQId[q.item_id] || "").trim(),
        })),

        alternative_documents: requiredDocuments
          .filter((doc) => useAlternativeByDocId[doc.item_id])
          .map((doc) => ({
            item_id: doc.item_id,
            substitute_document_type: (
              alternativeTypeByDocId[doc.item_id] || ""
            ).trim(),
            substitute_reason: (
              alternativeReasonByDocId[doc.item_id] || ""
            ).trim(),
          })),
      };

      console.log("=== FINAL PAYLOAD ===");
      console.dir({ applicationId, payload }, { depth: null });

      await secondSubmit(applicationId, payload);

      if (onSuccess) {
        await onSuccess();
      }

      toast.success("Resubmission sent successfully.");
      resetAndClose();
    } catch (err) {
      console.error("[ResubmitDialog] Resubmit failed:", err?.response?.data || err);

      toast.error("Failed to submit resubmission.", {
        description:
          err?.response?.data?.detail ||
          err?.message ||
          "Unknown error",
      });

      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetAndClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl">Upload Documents</DialogTitle>
          <DialogDescription className="mb-2 text-sm leading-relaxed">
            Upload the required documents and answer the required questions for review.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-2">
          {actionRequired && (
            <div className="rounded-lg border border-red-200 bg-red-50/60 px-4 py-3">
              <p className="mb-1 text-sm font-semibold text-red-600">Reason for Escalation</p>
              <p className="text-sm leading-relaxed text-foreground">{actionRequired}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {docsCount} document{docsCount === 1 ? "" : "s"} & {qnsCount} question
                {qnsCount === 1 ? "" : "s"}
              </p>
            </div>
          )}

          {docsCount > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Documents</h3>

              <div className="space-y-4">
                {requiredDocuments.map((doc) => {
                  const docId = doc.item_id;
                  const file = filesByDocId[docId] || null;
                  const progress = progressByDocId[docId] ?? 0;
                  const error = documentErrorsById[docId] || "";

                  const isAlternative = !!useAlternativeByDocId[docId];
                  const altReason = alternativeReasonByDocId[docId] || "";
                  const altType = alternativeTypeByDocId[docId] || "";
                  const altFile = alternativeFilesByDocId[docId] || null;
                  const altProgress = alternativeProgressByDocId[docId] ?? 0;
                  const altErrors = alternativeErrorsByDocId[docId] || {};
                  const alternativeOptions = getAlternativeOptionsForDocument(doc);

                  return (
                    <div
                      key={docId}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      {!isAlternative ? (
                        <div className="space-y-2">
                          <ResubmitDocumentUploadField
                            fieldName={`file-${docId}`}
                            label={doc.document_name || "Document"}
                            description={doc.document_desc || ""}
                            file={file}
                            onChange={(selectedFile) => updateFileForDoc(docId, selectedFile)}
                            uploadProgress={progress}
                            required
                            disabled={isSubmitting}
                            acceptTypes="application/pdf,image/jpeg,image/png"
                            helpText="Accepted formats: PDF, JPG, PNG. Max size: 5MB"
                            error={error}
                          />

                          {error && <p className="text-sm text-red-500">{error}</p>}

                          <button
                            type="button"
                            onClick={() => toggleAlternativeMode(docId)}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1 text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Can’t provide this document?
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {doc.document_name || "Document"}
                              </p>
                              {doc.document_desc && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {doc.document_desc}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleAlternativeMode(docId)}
                              disabled={isSubmitting}
                              className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Use original document instead
                              <ChevronUp className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-800">
                            Submit an alternative document for review. It may be accepted, or we may request more information.
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                              Why can’t you provide this document? <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                              rows={3}
                              disabled={isSubmitting}
                              placeholder="Explain briefly why the original required document is unavailable."
                              value={altReason}
                              onChange={(e) => {
                                const value = e.target.value;
                                setAlternativeReasonByDocId((prev) => ({
                                  ...prev,
                                  [docId]: value,
                                }));
                                setAlternativeErrorsByDocId((prev) => ({
                                  ...prev,
                                  [docId]: {
                                    ...(prev[docId] || {}),
                                    reason: "",
                                  },
                                }));
                              }}
                              className={`rounded-xl focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-red-400 ${
                                altErrors.reason
                                  ? "!border-red-500 !ring-red-500 placeholder:!text-red-400"
                                  : ""
                              }`}
                            />
                            {altErrors.reason && (
                              <p className="text-sm text-red-500">{altErrors.reason}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                              Select an alternative document <span className="text-red-500">*</span>
                            </Label>
                            <select
                              disabled={isSubmitting}
                              value={altType}
                              onChange={(e) => {
                                const value = e.target.value;
                                setAlternativeTypeByDocId((prev) => ({
                                  ...prev,
                                  [docId]: value,
                                }));
                                setAlternativeErrorsByDocId((prev) => ({
                                  ...prev,
                                  [docId]: {
                                    ...(prev[docId] || {}),
                                    type: "",
                                  },
                                }));
                              }}
                              className={`flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-red-400 ${
                                altErrors.type ? "!border-red-500" : "border-input"
                              } ${isSubmitting ? "cursor-not-allowed opacity-50" : ""}`}
                            >
                              <option value="">Select an alternative document</option>
                              {alternativeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {altErrors.type && (
                              <p className="text-sm text-red-500">{altErrors.type}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <ResubmitDocumentUploadField
                              fieldName={`alternative-file-${docId}`}
                              label="Upload Alternative Document"
                              description={
                                altType
                                  ? `Selected alternative: ${altType}`
                                  : "Upload the substitute document for review."
                              }
                              file={altFile}
                              onChange={(selectedFile) => updateAlternativeFileForDoc(docId, selectedFile)}
                              uploadProgress={altProgress}
                              required
                              disabled={isSubmitting}
                              acceptTypes="application/pdf,image/jpeg,image/png"
                              helpText="Accepted formats: PDF, JPG, PNG. Max size: 5MB"
                              error={altErrors.file || ""}
                            />
                            {altErrors.file && (
                              <p className="text-sm text-red-500">{altErrors.file}</p>
                            )}
                          </div>
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
                {requiredQuestions.map((q, idx) => {
                  const error = questionErrorsById[q.item_id] || "";

                  return (
                    <div
                      key={q.item_id}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <Label className="text-sm font-semibold">
                        {`Question ${idx + 1}`}
                      </Label>
                      <p className="mt-1 text-sm text-foreground">{q.question_text}</p>

                      <Textarea
                        className={`mt-3 rounded-xl focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-red-400 ${
                          error
                            ? "!border-red-500 !ring-red-500 placeholder:!text-red-400"
                            : ""
                        }`}
                        rows={3}
                        placeholder="Type your answer..."
                        disabled={isSubmitting}
                        value={answersByQId[q.item_id] ?? ""}
                        onChange={(e) => updateAnswerForQuestion(q.item_id, e.target.value)}
                      />

                      {error && (
                        <p className="mt-1 text-sm text-red-500">{error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={resetAndClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 bg-red-600 text-white hover:bg-red-700"
          >
            <Upload className="h-4 w-4" />
            {isSubmitting
              ? "Submitting..."
              : `Submit${docsCount > 0 ? ` (${totalCompletedDocuments}/${docsCount} documents ready)` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}