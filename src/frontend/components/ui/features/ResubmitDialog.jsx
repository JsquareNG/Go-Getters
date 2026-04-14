import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Upload,
  Loader2,
  CheckCircle2,
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
import { Label } from "../primitives/Label";
import { toast } from "sonner";

import { uploadDocument } from "../../../api/documentApi";
import { secondSubmit } from "../../../api/applicationApi";
import { extractAdditionalDocument } from "../../../api/ocrApi";

import ResubmitDocumentUploadField from "./ResubmitDocumentUploadField";

const formatDocumentLabel = (value) => {
  if (!value) return "-";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getAlternativeOptionsForDocument = (doc) => {
  if (
    Array.isArray(doc?.alternativeDocumentOptions) &&
    doc.alternativeDocumentOptions.length > 0
  ) {
    return doc.alternativeDocumentOptions.map((item) => {
      if (typeof item === "string") {
        return {
          label: formatDocumentLabel(item),
          value: item,
          description: "",
        };
      }

      return {
        label:
          item.label ||
          formatDocumentLabel(item.value) ||
          "Alternative Document",
        value: item.value || item.label || "Alternative Document",
        description: item.description || "",
      };
    });
  }

  if (
    Array.isArray(doc?.alternative_documents) &&
    doc.alternative_documents.length > 0
  ) {
    return doc.alternative_documents.map((item) => ({
      label: formatDocumentLabel(item),
      value: item,
      description: "",
    }));
  }

  return [];
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

  const [useAlternativeByDocId, setUseAlternativeByDocId] = useState({});
  const [alternativeReasonByDocId, setAlternativeReasonByDocId] = useState({});
  const [alternativeTypeByDocId, setAlternativeTypeByDocId] = useState({});
  const [alternativeFilesByDocId, setAlternativeFilesByDocId] = useState({});
  const [alternativeProgressByDocId, setAlternativeProgressByDocId] = useState(
    {},
  );
  const [alternativeErrorsByDocId, setAlternativeErrorsByDocId] = useState({});

  const [checkingDocById, setCheckingDocById] = useState({});
  const [checkingAltDocById, setCheckingAltDocById] = useState({});
  const [documentValidationById, setDocumentValidationById] = useState({});
  const [alternativeValidationById, setAlternativeValidationById] = useState(
    {},
  );

  const docsCount = Array.isArray(requiredDocuments)
    ? requiredDocuments.length
    : 0;
  const qnsCount = Array.isArray(requiredQuestions)
    ? requiredQuestions.length
    : 0;

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

    setCheckingDocById({});
    setCheckingAltDocById({});
    setDocumentValidationById({});
    setAlternativeValidationById({});
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

    setCheckingDocById({});
    setCheckingAltDocById({});
    setDocumentValidationById({});
    setAlternativeValidationById({});

    onOpenChange(false);
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
        setFilesByDocId((current) => ({
          ...current,
          [docId]: null,
        }));
        setProgressByDocId((current) => ({
          ...current,
          [docId]: 0,
        }));
        setDocumentErrorsById((current) => ({
          ...current,
          [docId]: "",
        }));
        setDocumentValidationById((current) => ({
          ...current,
          [docId]: null,
        }));
        setCheckingDocById((current) => ({
          ...current,
          [docId]: false,
        }));
      } else {
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
        setAlternativeValidationById((current) => ({
          ...current,
          [docId]: null,
        }));
        setCheckingAltDocById((current) => ({
          ...current,
          [docId]: false,
        }));
      }

      return {
        ...prev,
        [docId]: nextValue,
      };
    });
  };

  const handleRequiredDocumentSelect = async (doc, selectedFile) => {
    const docId = doc.item_id;

    if (!selectedFile) {
      setFilesByDocId((prev) => ({
        ...prev,
        [docId]: null,
      }));
      setProgressByDocId((prev) => ({
        ...prev,
        [docId]: 0,
      }));
      setDocumentErrorsById((prev) => ({
        ...prev,
        [docId]: "",
      }));
      setDocumentValidationById((prev) => ({
        ...prev,
        [docId]: null,
      }));
      return;
    }

    setFilesByDocId((prev) => ({
      ...prev,
      [docId]: selectedFile,
    }));
    setProgressByDocId((prev) => ({
      ...prev,
      [docId]: 0,
    }));
    setDocumentErrorsById((prev) => ({
      ...prev,
      [docId]: "",
    }));
    setDocumentValidationById((prev) => ({
      ...prev,
      [docId]: null,
    }));

    try {
      setCheckingDocById((prev) => ({
        ...prev,
        [docId]: true,
      }));

      const result = await extractAdditionalDocument(
        selectedFile,
        doc.document_name,
      );

      const uploadValidation = result?.upload_validation || {};
      const status = uploadValidation?.status || "FAIL";
      const reasons = Array.isArray(uploadValidation?.reasons)
        ? uploadValidation.reasons
        : [];

      setDocumentValidationById((prev) => ({
        ...prev,
        [docId]: result,
      }));

      if (status === "FAIL") {
        setFilesByDocId((prev) => ({
          ...prev,
          [docId]: null,
        }));

        setDocumentErrorsById((prev) => ({
          ...prev,
          [docId]: reasons[0] || "Uploaded file failed document checking.",
        }));

        toast.error("Document check failed", {
          description: reasons[0] || "Please upload the correct document.",
        });

        return;
      }

      setDocumentErrorsById((prev) => ({
        ...prev,
        [docId]: "",
      }));

      toast.success("Document checked successfully");
    } catch (err) {
      console.error("Required document OCR check failed:", err);

      setFilesByDocId((prev) => ({
        ...prev,
        [docId]: null,
      }));

      setDocumentErrorsById((prev) => ({
        ...prev,
        [docId]:
          err?.response?.data?.detail ||
          err?.message ||
          "Could not check uploaded document.",
      }));

      toast.error("Could not check uploaded document", {
        description:
          err?.response?.data?.detail || err?.message || "Unknown error",
      });
    } finally {
      setCheckingDocById((prev) => ({
        ...prev,
        [docId]: false,
      }));
    }
  };

  const handleAlternativeDocumentSelect = async (doc, selectedFile) => {
    const docId = doc.item_id;
    const selectedAlternativeName = (
      alternativeTypeByDocId[docId] || ""
    ).trim();

    if (!selectedFile) {
      setAlternativeFilesByDocId((prev) => ({
        ...prev,
        [docId]: null,
      }));
      setAlternativeProgressByDocId((prev) => ({
        ...prev,
        [docId]: 0,
      }));
      setAlternativeErrorsByDocId((prev) => ({
        ...prev,
        [docId]: {
          ...(prev[docId] || {}),
          file: "",
        },
      }));
      setAlternativeValidationById((prev) => ({
        ...prev,
        [docId]: null,
      }));
      return;
    }

    if (!selectedAlternativeName) {
      setAlternativeErrorsByDocId((prev) => ({
        ...prev,
        [docId]: {
          ...(prev[docId] || {}),
          type: "Please select an alternative document first.",
        },
      }));

      toast.error("Select an alternative document first.");
      return;
    }

    setAlternativeFilesByDocId((prev) => ({
      ...prev,
      [docId]: selectedFile,
    }));
    setAlternativeProgressByDocId((prev) => ({
      ...prev,
      [docId]: 0,
    }));
    setAlternativeErrorsByDocId((prev) => ({
      ...prev,
      [docId]: {
        ...(prev[docId] || {}),
        file: "",
      },
    }));
    setAlternativeValidationById((prev) => ({
      ...prev,
      [docId]: null,
    }));

    try {
      setCheckingAltDocById((prev) => ({
        ...prev,
        [docId]: true,
      }));

      const result = await extractAdditionalDocument(
        selectedFile,
        selectedAlternativeName,
      );

      const uploadValidation = result?.upload_validation || {};
      const status = uploadValidation?.status || "FAIL";
      const reasons = Array.isArray(uploadValidation?.reasons)
        ? uploadValidation.reasons
        : [];

      setAlternativeValidationById((prev) => ({
        ...prev,
        [docId]: result,
      }));

      if (status === "FAIL") {
        setAlternativeFilesByDocId((prev) => ({
          ...prev,
          [docId]: null,
        }));

        setAlternativeErrorsByDocId((prev) => ({
          ...prev,
          [docId]: {
            ...(prev[docId] || {}),
            file:
              reasons[0] || "Uploaded alternative document failed checking.",
          },
        }));

        toast.error("Alternative document check failed", {
          description:
            reasons[0] || "Please upload the correct alternative document.",
        });

        return;
      }

      setAlternativeErrorsByDocId((prev) => ({
        ...prev,
        [docId]: {
          ...(prev[docId] || {}),
          file: "",
        },
      }));

      toast.success("Alternative document checked successfully");
    } catch (err) {
      console.error("Alternative document OCR check failed:", err);

      setAlternativeFilesByDocId((prev) => ({
        ...prev,
        [docId]: null,
      }));

      setAlternativeErrorsByDocId((prev) => ({
        ...prev,
        [docId]: {
          ...(prev[docId] || {}),
          file:
            err?.response?.data?.detail ||
            err?.message ||
            "Could not check uploaded alternative document.",
        },
      }));

      toast.error("Could not check uploaded alternative document", {
        description:
          err?.response?.data?.detail || err?.message || "Unknown error",
      });
    } finally {
      setCheckingAltDocById((prev) => ({
        ...prev,
        [docId]: false,
      }));
    }
  };

  const isAnyDocumentChecking = useMemo(() => {
    return (
      Object.values(checkingDocById).some(Boolean) ||
      Object.values(checkingAltDocById).some(Boolean)
    );
  }, [checkingDocById, checkingAltDocById]);

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
            docAltErrors.reason =
              "Please explain why you cannot provide the original document.";
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
  //   console.log("[ResubmitDialog] Submit clicked", {
  //     applicationId,
  //     email,
  //     firstName,
  //     filesByDocId,
  //     useAlternativeByDocId,
  //     alternativeTypeByDocId,
  //   });

  //   if (!validate()) return;

  //   setIsSubmitting(true);

  //   try {
  //     for (const doc of requiredDocuments) {
  //       const docId = doc.item_id;
  //       const isAlternative = !!useAlternativeByDocId[docId];

  //       const originalFile = filesByDocId[docId];
  //       const alternativeFile = alternativeFilesByDocId[docId];
  //       const fileToUpload = isAlternative ? alternativeFile : originalFile;

  //       if (!fileToUpload) continue;

  //       const selectedValue = (alternativeTypeByDocId[docId] || "").trim();
  //       const alternativeOptions = getAlternativeOptionsForDocument(doc);

  //       const matchedOption = alternativeOptions.find(
  //         (option) => option.value === selectedValue,
  //       );

  //       const documentType = isAlternative
  //         ? matchedOption?.label || selectedValue
  //         : doc.document_name;

  //       const validationResult = isAlternative
  //         ? alternativeValidationById[docId]
  //         : documentValidationById[docId];

  //       const extractedData = validationResult?.data || {};

  //       await uploadDocument({
  //         applicationId,
  //         documentType,
  //         file: fileToUpload,
  //         extracted_data: extractedData,
  //         onProgress: (pct) => {
  //           if (isAlternative) {
  //             setAlternativeProgressByDocId((prev) => ({
  //               ...prev,
  //               [docId]: pct,
  //             }));
  //           } else {
  //             setProgressByDocId((prev) => ({
  //               ...prev,
  //               [docId]: pct,
  //             }));
  //           }
  //         },
  //       });
  //     }

  //     const payload = {
  //       email,
  //       firstName,
  //       question_answers: requiredQuestions.map((q) => ({
  //         item_id: q.item_id,
  //         answer_text: (answersByQId[q.item_id] || "").trim(),
  //       })),
  //       alternative_documents: requiredDocuments
  //         .filter((doc) => useAlternativeByDocId[doc.item_id])
  //         .map((doc) => {
  //           const selectedValue = (
  //             alternativeTypeByDocId[doc.item_id] || ""
  //           ).trim();

  //           const options = getAlternativeOptionsForDocument(doc);

  //           const matchedOption = options.find(
  //             (opt) => opt.value === selectedValue,
  //           );

  //           return {
  //             item_id: doc.item_id,
  //             substitute_document_type: matchedOption?.label || selectedValue,
  //             substitute_reason: (
  //               alternativeReasonByDocId[doc.item_id] || ""
  //             ).trim(),
  //           };
  //         }),
  //     };

  //     console.log("=== FINAL PAYLOAD ===");
  //     console.dir({ applicationId, payload }, { depth: null });

  //     await secondSubmit(applicationId, payload);

  //     if (onSuccess) {
  //       await onSuccess();
  //     }

  //     toast.success("Resubmission sent successfully.");
  //     resetAndClose();
  //   } catch (err) {
  //     console.error(
  //       "[ResubmitDialog] Resubmit failed:",
  //       err?.response?.data || err,
  //     );

  //     toast.error("Failed to submit resubmission.", {
  //       description:
  //         err?.response?.data?.detail || err?.message || "Unknown error",
  //     });

  //     setIsSubmitting(false);
  //   }
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
      // Optional debug snapshot
      console.log("FULL STATE SNAPSHOT:");
      console.dir(
        {
          filesByDocId,
          documentValidationById,
          alternativeValidationById,
        },
        { depth: null },
      );

      // Upload documents
      for (const doc of requiredDocuments) {
        const docId = doc.item_id;
        const isAlternative = !!useAlternativeByDocId[docId];

        const originalFile = filesByDocId[docId];
        const alternativeFile = alternativeFilesByDocId[docId];
        const fileToUpload = isAlternative ? alternativeFile : originalFile;

        if (!fileToUpload) continue;

        const selectedValue = (alternativeTypeByDocId[docId] || "").trim();
        const alternativeOptions = getAlternativeOptionsForDocument(doc);

        const matchedOption = alternativeOptions.find(
          (option) => option.value === selectedValue,
        );

        const documentType = isAlternative
          ? matchedOption?.label || selectedValue
          : doc.document_name;

        const validationResult = isAlternative
          ? alternativeValidationById[docId]
          : documentValidationById[docId];

        const extractedData = validationResult || {};

        console.log("=== DOCUMENT DEBUG ===");
        console.log("docId:", docId);
        console.log("documentType:", documentType);
        console.log("file:", fileToUpload);
        console.log("validationResult:", validationResult);
        console.log("extractedData:", extractedData);

        console.log("=== WOULD UPLOAD DOCUMENT ===");
        console.dir(
          {
            applicationId,
            documentType,
            file: fileToUpload,
            extracted_data: extractedData,
          },
          { depth: null },
        );

        // Uncomment when ready
        
        await uploadDocument({
          applicationId,
          documentType,
          file: fileToUpload,
          extracted_data: extractedData,
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

      // Collect unique OCR warnings across all checked documents
      const hasOcrWarnings = requiredDocuments.some((doc) => {
        const docId = doc.item_id;
        const isAlternative = !!useAlternativeByDocId[docId];

        const validationResult = isAlternative
          ? alternativeValidationById[docId]
          : documentValidationById[docId];

        const uploadValidation = validationResult?.upload_validation || {};

        return uploadValidation.status === "WARNING";
      });

      console.log("hasOcrWarnings:", hasOcrWarnings);

      const payload = {
        email,
        firstName,
        question_answers: requiredQuestions.map((q) => ({
          item_id: q.item_id,
          answer_text: (answersByQId[q.item_id] || "").trim(),
        })),
        alternative_documents: requiredDocuments
          .filter((doc) => useAlternativeByDocId[doc.item_id])
          .map((doc) => {
            const selectedValue = (
              alternativeTypeByDocId[doc.item_id] || ""
            ).trim();

            const options = getAlternativeOptionsForDocument(doc);

            const matchedOption = options.find(
              (opt) => opt.value === selectedValue,
            );

            return {
              item_id: doc.item_id,
              substitute_document_type: matchedOption?.label || selectedValue,
              substitute_reason: (
                alternativeReasonByDocId[doc.item_id] || ""
              ).trim(),
            };
          }),
        ocr_warnings: hasOcrWarnings,
      };

      console.log("=== WOULD CALL secondSubmit ===");
      console.dir(
        {
          applicationId,
          payload,
        },
        { depth: null },
      );

      // Uncomment when ready
      await secondSubmit(applicationId, payload);

      toast.success("DEBUG MODE: Check console logs");

      // Uncomment when ready
      if (onSuccess) {
        await onSuccess();
      }
      resetAndClose();
    } catch (err) {
      console.error(
        "[ResubmitDialog] Resubmit failed:",
        err?.response?.data || err,
      );

      toast.error("Failed to submit resubmission.", {
        description:
          err?.response?.data?.detail || err?.message || "Unknown error",
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
            Upload the required documents and answer the required questions for
            review.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-2">
          {actionRequired && (
            <div className="rounded-lg border border-red-200 bg-red-50/60 px-4 py-3">
              <p className="mb-1 text-sm font-semibold text-red-600">
                Reason for Escalation
              </p>
              <p className="text-sm leading-relaxed text-foreground">
                {actionRequired}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {docsCount} document{docsCount === 1 ? "" : "s"} & {qnsCount}{" "}
                question
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
                  const validation = documentValidationById[docId] || null;

                  const isAlternative = !!useAlternativeByDocId[docId];
                  const altReason = alternativeReasonByDocId[docId] || "";
                  const altType = alternativeTypeByDocId[docId] || "";
                  const altFile = alternativeFilesByDocId[docId] || null;
                  const altProgress = alternativeProgressByDocId[docId] ?? 0;
                  const altErrors = alternativeErrorsByDocId[docId] || {};
                  const altValidation =
                    alternativeValidationById[docId] || null;
                  const alternativeOptions = getAlternativeOptionsForDocument(doc);
                  const hasAlternativeOptions = alternativeOptions.length > 0;

                  return (
                    <div
                      key={docId}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      {!isAlternative ? (
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {doc.document_name || "Document"}
                                <span className="ml-1 text-red-500">*</span>
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
                              disabled={isSubmitting || checkingDocById[docId]}
                              className="inline-flex shrink-0 items-center gap-1 text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Can’t provide this document?
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>

                          <ResubmitDocumentUploadField
                            fieldName={`file-${docId}`}
                            label=""
                            description=""
                            file={file}
                            onChange={(selectedFile) =>
                              handleRequiredDocumentSelect(doc, selectedFile)
                            }
                            uploadProgress={progress}
                            required
                            disabled={isSubmitting || checkingDocById[docId]}
                            acceptTypes="application/pdf,image/jpeg,image/png"
                            helpText="Accepted formats: PDF, JPG, PNG. Max size: 5MB"
                            error={error}
                          />

                          {error && <p className="text-sm text-red-500">{error}</p>}

                          {!error &&
                            ["PASS", "WARNING"].includes(
                              validation?.upload_validation?.status,
                            ) && (
                              <div
                                className={`flex items-center gap-2 text-sm text-emerald-600`}
                              >
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>
                                  Document checked successfully.
                                </span>
                              </div>
                            )}

                          {checkingDocById[docId] && (
                            <Button
                              type="button"
                              variant="outline"
                              disabled
                              className="w-fit gap-2"
                            >
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Checking uploaded document...
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {doc.document_name || "Document"}
                                <span className="ml-1 text-red-500">*</span>
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
                              disabled={isSubmitting || checkingAltDocById[docId]}
                              className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Use original document instead
                              <ChevronUp className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-800">
                            Submit an alternative document for review. It may be
                            accepted, or we may request more information.
                          </div>

                          {!hasAlternativeOptions && (
                            <div className="rounded-lg border border-muted bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                              No suggested alternative documents are available
                              for this request at the moment.
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                              Why can’t you provide this document?{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                              rows={3}
                              disabled={isSubmitting || checkingAltDocById[docId]}
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
                              <p className="text-sm text-red-500">
                                {altErrors.reason}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                              Select an alternative document{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <select
                              disabled={
                                isSubmitting ||
                                checkingAltDocById[docId] ||
                                !hasAlternativeOptions
                              }
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
                                    file: "",
                                  },
                                }));
                                setAlternativeFilesByDocId((prev) => ({
                                  ...prev,
                                  [docId]: null,
                                }));
                                setAlternativeValidationById((prev) => ({
                                  ...prev,
                                  [docId]: null,
                                }));
                              }}
                              className={`flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-red-400 ${
                                altErrors.type
                                  ? "!border-red-500"
                                  : "border-input"
                              } ${
                                isSubmitting || !hasAlternativeOptions
                                  ? "cursor-not-allowed opacity-50"
                                  : ""
                              }`}
                            >
                              <option value="">
                                {hasAlternativeOptions
                                  ? "Select an alternative document"
                                  : "No alternative documents available"}
                              </option>

                              {alternativeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>

                            {altType &&
                              alternativeOptions.find(
                                (option) => option.value === altType,
                              )?.description && (
                                <p className="text-xs text-muted-foreground">
                                  {
                                    alternativeOptions.find(
                                      (option) => option.value === altType,
                                    )?.description
                                  }
                                </p>
                              )}

                            {altErrors.type && (
                              <p className="text-sm text-red-500">
                                {altErrors.type}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <ResubmitDocumentUploadField
                              fieldName={`alternative-file-${docId}`}
                              label="Upload Alternative Document"
                              description={
                                altType
                                  ? `Selected alternative: ${formatDocumentLabel(
                                      altType,
                                    )}`
                                  : "Select an alternative document first before uploading."
                              }
                              file={altFile}
                              onChange={(selectedFile) =>
                                handleAlternativeDocumentSelect(doc, selectedFile)
                              }
                              uploadProgress={altProgress}
                              required
                              disabled={
                                isSubmitting ||
                                checkingAltDocById[docId] ||
                                !altType
                              }
                              acceptTypes="application/pdf,image/jpeg,image/png"
                              helpText="Accepted formats: PDF, JPG, PNG. Max size: 5MB"
                              error={altErrors.file || ""}
                            />

                            {checkingAltDocById[docId] && (
                              <Button
                                type="button"
                                variant="outline"
                                disabled
                                className="w-fit gap-2"
                              >
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Checking uploaded document...
                              </Button>
                            )}

                            {altErrors.file && (
                              <p className="text-sm text-red-500">
                                {altErrors.file}
                              </p>
                            )}

                            {!altErrors.file &&
                              ["PASS", "WARNING"].includes(
                                altValidation?.upload_validation?.status,
                              ) && (
                                <div
                                  className={`flex items-center gap-2 text-sm text-emerald-600`}
                                >
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                  <span>
                                    Alternative document checked successfully.
                                  </span>
                                </div>
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
                      <p className="mt-1 text-sm text-foreground">
                        {q.question_text}
                      </p>

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
                        onChange={(e) =>
                          updateAnswerForQuestion(q.item_id, e.target.value)
                        }
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
            disabled={isSubmitting || isAnyDocumentChecking}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isAnyDocumentChecking}
            className="gap-2 bg-red-600 text-white hover:bg-red-700"
          >
            {isAnyDocumentChecking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking uploaded document...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}