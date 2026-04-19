import React, { useMemo, useState } from "react";
import {
  FileQuestion,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  FileText,
  AlertTriangle,
  Sparkles,
  Loader2,
  Info,
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
import { generateManualReviewSuggestions } from "@/api/smartAI";

const emptyDoc = { name: "", description: "" };
const emptyQuestion = "";

const RequestDocumentsDialog = ({
  open,
  onOpenChange,
  businessName,
  missingCount,
  onSubmit,
  isSubmitting = false,
  aiPayload = null,
  aiDisabled = false,
}) => {
  const [reason, setReason] = useState("");
  const [additionalDocs, setAdditionalDocs] = useState([{ ...emptyDoc }]);
  const [questions, setQuestions] = useState([emptyQuestion]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiRecommendedAction, setAiRecommendedAction] = useState("");
  const [aiShortReason, setAiShortReason] = useState("");

  const hasGeneratedAI = !!aiRecommendedAction || !!aiSummary;
  const isEscalation = aiRecommendedAction === "escalate";
  const isFinalDecision =
    aiRecommendedAction === "approve" || aiRecommendedAction === "reject";

  const [errors, setErrors] = useState({
    reason: "",
    documents: [{ name: "", description: "" }],
    questions: [""],
    form: "",
  });

  const normalizeAiPayload = (payload) => {
    if (!payload || typeof payload !== "object") return null;

    const normalizedDocuments = Array.isArray(payload.documents)
      ? payload.documents.map((doc) => ({
          document_id: doc?.document_id ?? null,
          document_type: doc?.document_type ?? "",
          storage_path: doc?.storage_path ?? "",
          mime_type: doc?.mime_type ?? "",
          extracted_data: doc?.extracted_data ?? [],
        }))
      : [];

    const normalizedActionRequests = Array.isArray(payload.action_requests)
      ? payload.action_requests
          .map((request) => {
            const normalizedQuestions = Array.isArray(request?.questions)
              ? request.questions
                  .filter((q) => {
                    const questionText = String(q?.question_text ?? "").trim();
                    const answerText = String(q?.answer_text ?? "").trim();
                    return questionText || answerText;
                  })
                  .map((q) => ({
                    item_id: q?.item_id ?? null,
                    question_text: q?.question_text ?? "",
                    answer_text: q?.answer_text ?? "",
                    fulfilled_at: q?.fulfilled_at ?? null,
                  }))
              : [];

            return {
              action_request_id: request?.action_request_id ?? null,
              reason: request?.reason ?? "",
              questions: normalizedQuestions,
            };
          })
          .filter((request) => request.questions.length > 0)
      : [];

    return {
      application_data: payload.application_data ?? {},
      risk_assessment: {
        risk_grade: payload?.risk_assessment?.risk_grade ?? "",
        risk_score: payload?.risk_assessment?.risk_score ?? null,
        triggered_rules: Array.isArray(payload?.risk_assessment?.triggered_rules)
          ? payload.risk_assessment.triggered_rules.map((rule) => ({
              code: rule?.code ?? "",
              description: rule?.description ?? "",
            }))
          : [],
      },
      documents: normalizedDocuments,
      action_requests: normalizedActionRequests,
    };
  };

  const normalizedAiPayload = useMemo(
    () => normalizeAiPayload(aiPayload),
    [aiPayload]
  );

  const hasReason = String(reason ?? "").trim().length > 0;

  const hasDocuments = additionalDocs.some((doc) => {
    const name = String(doc?.name ?? "").trim();
    const description = String(doc?.description ?? "").trim();
    return name && description;
  });

  const hasQuestions = questions.some((q) => String(q ?? "").trim());

  const canSubmit = hasReason && (hasDocuments || hasQuestions);

  const addDocument = () => {
    setAdditionalDocs((prev) => [...prev, { ...emptyDoc }]);
    setErrors((prev) => ({
      ...prev,
      documents: [...prev.documents, { name: "", description: "" }],
    }));
  };

  const removeDocument = (index) => {
    const nextDocs = additionalDocs.filter((_, i) => i !== index);
    const nextDocErrors = errors.documents.filter((_, i) => i !== index);

    setAdditionalDocs(nextDocs.length ? nextDocs : [{ ...emptyDoc }]);
    setErrors((prev) => ({
      ...prev,
      documents: nextDocErrors.length ? nextDocErrors : [{ name: "", description: "" }],
      form: "",
    }));
  };

  const updateDocument = (index, field, value) => {
    const updated = [...additionalDocs];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalDocs(updated);

    setErrors((prev) => {
      const nextDocErrors = [...prev.documents];
      if (!nextDocErrors[index]) {
        nextDocErrors[index] = { name: "", description: "" };
      }

      nextDocErrors[index] = {
        ...nextDocErrors[index],
        [field]: "",
      };

      return {
        ...prev,
        documents: nextDocErrors,
        form: "",
      };
    });
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, ""]);
    setErrors((prev) => ({
      ...prev,
      questions: [...prev.questions, ""],
    }));
  };

  const removeQuestion = (index) => {
    const nextQuestions = questions.filter((_, i) => i !== index);
    const nextQuestionErrors = errors.questions.filter((_, i) => i !== index);

    setQuestions(nextQuestions.length ? nextQuestions : [""]);
    setErrors((prev) => ({
      ...prev,
      questions: nextQuestionErrors.length ? nextQuestionErrors : [""],
      form: "",
    }));
  };

  const updateQuestion = (index, value) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);

    setErrors((prev) => {
      const nextQuestionErrors = [...prev.questions];
      nextQuestionErrors[index] = "";

      return {
        ...prev,
        questions: nextQuestionErrors,
        form: "",
      };
    });
  };

  const resetForm = () => {
    setReason("");
    setAdditionalDocs([{ ...emptyDoc }]);
    setQuestions([""]);
    setAiSummary("");
    setAiRecommendedAction("");
    setAiShortReason("");
    setErrors({
      reason: "",
      documents: [{ name: "", description: "" }],
      questions: [""],
      form: "",
    });
  };

  const validateForm = () => {
    const trimmedReason = String(reason ?? "").trim();

    const nextErrors = {
      reason: "",
      documents: additionalDocs.map(() => ({ name: "", description: "" })),
      questions: questions.map(() => ""),
      form: "",
    };

    let hasError = false;

    if (!trimmedReason) {
      nextErrors.reason = "Reason is required.";
      hasError = true;
    }

    const filledDocuments = additionalDocs.filter((doc) => {
      const name = String(doc?.name ?? "").trim();
      const description = String(doc?.description ?? "").trim();
      return name || description;
    });

    const filledQuestions = questions.filter((q) => String(q ?? "").trim());

    if (filledDocuments.length === 0 && filledQuestions.length === 0) {
      nextErrors.form = "At least 1 document or 1 question is required.";
      hasError = true;
    }

    additionalDocs.forEach((doc, index) => {
      const name = String(doc?.name ?? "").trim();
      const description = String(doc?.description ?? "").trim();
      const hasAnyValue = !!(name || description);

      if (hasAnyValue) {
        if (!name) {
          nextErrors.documents[index].name = "Document name is required.";
          hasError = true;
        }
        if (!description) {
          nextErrors.documents[index].description = "Document description is required.";
          hasError = true;
        }
      }
    });

    questions.forEach((q, index) => {
      const value = String(q ?? "").trim();
      const hasMultipleRows = questions.length > 1;

      if (hasMultipleRows && !value) {
        nextErrors.questions[index] = "Question cannot be empty.";
        hasError = true;
      }
    });

    setErrors(nextErrors);
    return !hasError;
  };

  const handleGenerateAISuggestions = async () => {
    console.log(
      "AI PAYLOAD:",
      JSON.parse(JSON.stringify(normalizedAiPayload))
    );

    if (!normalizedAiPayload) {
      toast.error("AI payload is not ready yet.");
      return;
    }

    try {
      setIsGeneratingAI(true);

      const response = await generateManualReviewSuggestions(normalizedAiPayload);
      const aiData = response?.data || response;

      console.log("AI RESPONSE:", aiData);

      const suggestedDocuments = Array.isArray(aiData?.suggested_documents)
        ? aiData.suggested_documents
        : [];

      const suggestedQuestions = Array.isArray(aiData?.suggested_questions)
        ? aiData.suggested_questions
        : [];

      const caseSummary = aiData?.case_summary || "";
      const generatedReason = aiData?.short_reason || "";
      const recommendedAction = String(aiData?.recommended_action || "").toLowerCase();

      setAiSummary(caseSummary);
      setAiRecommendedAction(recommendedAction);
      setAiShortReason(generatedReason);

      const shouldEscalate = recommendedAction === "escalate";

      if (shouldEscalate) {
        setReason(generatedReason);

        setAdditionalDocs(
          suggestedDocuments.length > 0
            ? suggestedDocuments.map((doc) => ({
                name: String(doc?.document_name || "").trim(),
                description: String(doc?.document_description || "").trim(),
              }))
            : [{ ...emptyDoc }]
        );

        setQuestions(
          suggestedQuestions.length > 0
            ? suggestedQuestions.map((q) => String(q || "").trim())
            : [""]
        );
      } else {
        setReason("");
        setAdditionalDocs([{ ...emptyDoc }]);
        setQuestions([""]);
      }

      setErrors({
        reason: "",
        documents:
          suggestedDocuments.length > 0
            ? suggestedDocuments.map(() => ({ name: "", description: "" }))
            : [{ name: "", description: "" }],
        questions:
          suggestedQuestions.length > 0 ? suggestedQuestions.map(() => "") : [""],
        form: "",
      });

      toast.success("AI suggestions generated.", {
        description: recommendedAction
          ? `Recommended action: ${recommendedAction}`
          : "Review and edit the generated suggestions before sending.",
      });
    } catch (err) {
      console.error("Generate AI suggestions failed:", err);
      toast.error("Could not generate AI suggestions.", {
        description: err?.response?.data?.detail || err?.message || "Unknown error",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async () => {
    const isValid = validateForm();

    if (!isValid) {
      toast.error("Please fix the validation errors.");
      return;
    }

    const trimmedReason = String(reason ?? "").trim();

    const documentsPayload = additionalDocs
      .map((d) => ({
        document_name: String(d?.name ?? "").trim(),
        document_desc: String(d?.description ?? "").trim(),
      }))
      .filter((d) => d.document_name && d.document_desc);

    const questionsPayload = questions
      .map((q) => ({
        question_text: String(q ?? "").trim(),
        answer_text: null,
      }))
      .filter((q) => q.question_text);

    try {
      if (typeof onSubmit === "function") {
        await onSubmit({
          reason: trimmedReason,
          documents: documentsPayload,
          questions: questionsPayload,
        });
      }

      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error("Request failed", {
        description: err?.message || "Could not send request.",
      });
    }
  };

  const actionMeta = {
    approve: {
      label: "Approve",
      boxClass: "border-emerald-500/20 bg-emerald-50",
      badgeClass: "bg-emerald-600 text-white",
      textClass: "text-emerald-700",
    },
    reject: {
      label: "Reject",
      boxClass: "border-red-500/20 bg-red-50",
      badgeClass: "bg-red-600 text-white",
      textClass: "text-red-700",
    },
    escalate: {
      label: "Escalate",
      boxClass: "border-amber-500/20 bg-amber-50",
      badgeClass: "bg-amber-500 text-white",
      textClass: "text-amber-700",
    },
  };

  const currentActionMeta = actionMeta[aiRecommendedAction] || {
    label: aiRecommendedAction || "Suggested Action",
    boxClass: "border-border bg-muted/30",
    badgeClass: "bg-muted text-foreground",
    textClass: "text-foreground",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex h-[750px] flex-col overflow-hidden bg-white p-0 sm:max-w-[800px]">
        <div className="flex h-full flex-col bg-white">
          <DialogHeader className="shrink-0 bg-white px-6 pb-3 pt-6">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileQuestion className="h-5 w-5 text-warning" />
              <span>Request Additional Information</span>

              <Button
                variant="outline"
                size="sm"
                className={`ml-2 h-7 gap-1 border px-2 text-m ${
                  isGeneratingAI ? "opacity-80 cursor-not-allowed" : ""
                }`}
                type="button"
                onClick={handleGenerateAISuggestions}
                disabled={isGeneratingAI || isSubmitting || aiDisabled}
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {hasGeneratedAI ? "Regenerate Suggestions" : "Generate AI Suggestions"}
                  </>
                )}
              </Button>
            </DialogTitle>

            <div className="space-y-3">
              <DialogDescription>
                Send a request to{" "}
                <span className="font-medium text-foreground">{businessName}</span> for
                additional documents and clarifications.
                {missingCount > 0 && (
                  <span className="mt-2 flex items-center gap-1.5 text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {missingCount} document(s) currently missing or pending
                  </span>
                )}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6 py-2">
            <div className="space-y-6">
              {(aiRecommendedAction || aiSummary) && (
                <div
                  className={`space-y-3 rounded-xl border p-4 ${currentActionMeta.boxClass}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        AI Recommendation
                      </p>
                      <p className={`text-sm font-semibold ${currentActionMeta.textClass}`}>
                        Suggested next action
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${currentActionMeta.badgeClass}`}
                    >
                      {currentActionMeta.label}
                    </span>
                  </div>

                  {aiSummary && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Case Summary
                      </p>

                      <p className="text-sm leading-relaxed text-foreground">
                        {aiSummary}
                      </p>

                      {isFinalDecision && aiShortReason && (
                        <p className="border-t pt-2 text-sm leading-relaxed text-muted-foreground">
                          {aiShortReason}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-start gap-2 border-t pt-2">
                    <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0 text-red-500" />
                    <p className="text-xs text-red-500">
                      AI-generated suggestions are for reference only. Please review before
                      proceeding.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </div>
                  <Label
                    className={`text-sm font-semibold ${
                      errors.reason ? "!text-red-500" : "text-foreground"
                    }`}
                  >
                    Reason for Request
                  </Label>
                </div>

                <div className="space-y-1.5">
                  <Textarea
                    placeholder="Explain why additional documents or information is required..."
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (errors.reason) {
                        setErrors((prev) => ({ ...prev, reason: "" }));
                      }
                      if (errors.form) {
                        setErrors((prev) => ({ ...prev, form: "" }));
                      }
                    }}
                    className={`min-h-[100px] resize-none ${
                      errors.reason
                        ? "!border-red-500 !text-red-500 placeholder:!text-red-400 !ring-1 !ring-red-500 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500"
                        : ""
                    }`}
                  />
                  {errors.reason && (
                    <p className="text-sm font-semibold !text-red-500">{errors.reason}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <Label
                      className={`text-sm font-semibold ${
                        errors.form ? "!text-red-500" : "text-foreground"
                      }`}
                    >
                      Additional Documents Required
                    </Label>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={addDocument}
                    type="button"
                    disabled={isGeneratingAI}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>

                <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                  <Info className="h-4 w-4 text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-700 leading-none">
                    Provide at least one request. You may add documents, questions, or both if needed.
                  </p>
                </div>

                <div className="space-y-3">
                  {additionalDocs.map((doc, index) => {
                    const docErrors = errors.documents?.[index] || {
                      name: "",
                      description: "",
                    };

                    const hasDocError = !!(docErrors.name || docErrors.description);

                    return (
                      <div
                        key={index}
                        className={`space-y-2 rounded-lg border-2 bg-muted/30 p-3 ${
                          hasDocError ? "!border-red-500" : "border-border"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-1.5">
                            <Input
                              placeholder="Document name (e.g. Bank Statement)"
                              value={doc.name}
                              onChange={(e) => updateDocument(index, "name", e.target.value)}
                              className={`flex-1 ${
                                docErrors.name
                                  ? "!border-red-500 !text-red-500 placeholder:!text-red-400 !ring-1 !ring-red-500 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500"
                                  : ""
                              }`}
                            />
                            {docErrors.name && (
                              <p className="text-sm font-semibold !text-red-500">
                                {docErrors.name}
                              </p>
                            )}
                          </div>

                          {additionalDocs.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeDocument(index)}
                              type="button"
                              disabled={isGeneratingAI}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Textarea
                            placeholder="Brief description of what the document should contain..."
                            value={doc.description}
                            onChange={(e) =>
                              updateDocument(index, "description", e.target.value)
                            }
                            className={`min-h-[60px] resize-none text-sm ${
                              docErrors.description
                                ? "!border-red-500 !text-red-500 placeholder:!text-red-400 !ring-1 !ring-red-500 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500"
                                : ""
                            }`}
                          />
                          {docErrors.description && (
                            <p className="text-sm font-semibold !text-red-500">
                              {docErrors.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10">
                      <MessageSquare className="h-4 w-4 text-info" />
                    </div>
                    <Label
                      className={`text-sm font-semibold ${
                        errors.form ? "!text-red-500" : "text-foreground"
                      }`}
                    >
                      Questions for {businessName}
                    </Label>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={addQuestion}
                    type="button"
                    disabled={isGeneratingAI}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {questions.map((q, index) => {
                    const questionError = errors.questions?.[index] || "";

                    return (
                      <div key={index} className="flex items-start gap-2">
                        <span
                          className={`mt-2.5 w-5 shrink-0 text-right text-xs font-medium ${
                            questionError ? "!text-red-500" : "text-muted-foreground"
                          }`}
                        >
                          {index + 1}.
                        </span>

                        <div className="flex-1 space-y-1.5">
                          <Textarea
                            placeholder="Enter a question you'd like the customer to answer..."
                            value={q}
                            onChange={(e) => updateQuestion(index, e.target.value)}
                            className={`min-h-[60px] flex-1 resize-none text-sm ${
                              questionError
                                ? "!border-red-500 !text-red-500 placeholder:!text-red-400 !ring-1 !ring-red-500 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500"
                                : ""
                            }`}
                          />
                          {questionError && (
                            <p className="text-sm font-semibold !text-red-500">
                              {questionError}
                            </p>
                          )}
                        </div>

                        {questions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="mt-0.5 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeQuestion(index)}
                            type="button"
                            disabled={isGeneratingAI}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {errors.form && (
                <div className="rounded-md border-2 !border-red-500 bg-red-50 px-3 py-2">
                  <p className="text-sm font-semibold !text-red-500">{errors.form}</p>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t bg-white px-6 py-3">
            <p className="mb-2 text-sm text-muted-foreground">
              Please review your request carefully before sending. This will notify the applicant.
            </p>

            <DialogFooter className="m-0 gap-2 p-0 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
                type="button"
                disabled={isSubmitting || isGeneratingAI}
                className="mb-0"
              >
                Cancel
              </Button>

              <Button
                className="mb-0 gap-2"
                onClick={handleSubmit}
                type="button"
                disabled={isSubmitting || isGeneratingAI || !canSubmit}
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Sending..." : "Send Request"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDocumentsDialog;