import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  AlertCircle,
  User,
  MapPin,
  Download,
  ShieldAlert,
  AlertOctagon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  CardContent,
  CardHeader,
  StatusBadge,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { Badge } from "../components/ui/primitives/Badge";

import {
  getApplicationByAppId,
  getQnA,
  getReviewJob,
} from "./../api/applicationApi";
import { allDocuments, downloadDocuments } from "./../api/documentApi";
import { getAuditTrail } from "./../api/auditTrailApi";
import { AuditTrail } from "../components/ui/features/AuditTrail";
import { getKYCdetails } from "@/api/livenessDetectionApi";
import { KycVerificationCard } from "../components/ui/features/kycVerificationCard";

const normKey = (v) => {
  if (v == null) return null;
  const s = String(v)
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
  return s.length ? s : null;
};

const formatBusinessType = (value) => {
  if (!value) return "-";
  return String(value)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function ManagementApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState(null);

  const [actionRequestsData, setActionRequestsData] = useState(null);
  const [qnaLoading, setQnaLoading] = useState(false);
  const [qnaError, setQnaError] = useState(null);

  const [auditEntries, setAuditEntries] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);

  const [activeTab, setActiveTab] = useState("overview");

  const [rules, setRules] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState(null);

  const [kycDetails, setKycDetails] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState(null);

  // -----------------------------
  // Fetch application
  // -----------------------------
  const fetchApplication = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const data = await getApplicationByAppId(id);
      setApplication(data);
      setError(null);
      return data;
    } catch (err) {
      console.error("Error fetching application:", err);
      setError("Could not retrieve application details.");
      return null;
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setDocsLoading(true);
      setDocsError(null);

      const docs = await allDocuments(id);
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setDocsError("Could not retrieve documents.");
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  };

  const fetchQnA = async (appIdToUse) => {
    try {
      setQnaLoading(true);
      setQnaError(null);

      if (!appIdToUse) return;

      const data = await getQnA(appIdToUse);
      setActionRequestsData(data && typeof data === "object" ? data : null);
    } catch (err) {
      console.error("Error fetching QnA:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        url: err?.config?.url,
      });

      setQnaError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Could not retrieve questions & answers."
      );
      setActionRequestsData(null);
    } finally {
      setQnaLoading(false);
    }
  };

  const fetchAuditEntries = async (appIdToUse) => {
    try {
      setAuditLoading(true);
      setAuditError(null);

      if (!appIdToUse) return;

      const data = await getAuditTrail(appIdToUse);
      setAuditEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching audit trail:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        url: err?.config?.url,
      });

      setAuditError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Could not retrieve audit trail."
      );
      setAuditEntries([]);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchApplication();
  }, [id]);

  const formData = application?.form_data || {};

  const currentStatus = application?.current_status || "Not started";
  const currentStatusKey = normKey(application?.current_status);
  const showActionRequired = currentStatusKey === "requires action";

  // -----------------------------
  // Fetch documents
  // -----------------------------
  useEffect(() => {
    if (id) fetchDocuments();
  }, [id]);

  // -----------------------------
  // Fetch review job / risk
  // -----------------------------
  useEffect(() => {
    const fetchReviewJob = async () => {
      try {
        setRiskLoading(true);
        setRiskError(null);

        const appIdToUse = application?.application_id || application?.id || id;
        if (!appIdToUse) return;

        const data = await getReviewJob(appIdToUse);
        setRules(data && typeof data === "object" ? data : null);
      } catch (err) {
        console.error("Error fetching review job:", {
          message: err?.message,
          status: err?.response?.status,
          data: err?.response?.data,
          url: err?.config?.url,
        });

        setRiskError(
          err?.response?.data?.detail ||
            err?.response?.data?.message ||
            err?.message ||
            "Could not retrieve risk assessment."
        );
        setRules(null);
      } finally {
        setRiskLoading(false);
      }
    };

    if (id && application) fetchReviewJob();
  }, [id, application]);

  // -----------------------------
  // Fetch QnA
  // -----------------------------
  useEffect(() => {
    const appIdToUse = application?.application_id || application?.id || id;
    if (id && application) fetchQnA(appIdToUse);
  }, [id, application]);

  // -----------------------------
  // Fetch Audit Trail
  // -----------------------------
  useEffect(() => {
    const appIdToUse = application?.application_id || application?.id || id;
    if (id && application) fetchAuditEntries(appIdToUse);
  }, [id, application]);

  useEffect(() => {
    const fetchKycDetails = async () => {
      try {
        setKycLoading(true);
        setKycError(null);

        const appIdToUse = application?.application_id || application?.id || id;
        if (!appIdToUse) return;

        const data = await getKYCdetails(appIdToUse);
        setKycDetails(data && typeof data === "object" ? data : null);
      } catch (err) {
        console.error("Error fetching KYC details:", err);

        setKycError(
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Could not retrieve KYC details."
        );
        setKycDetails(null);
      } finally {
        setKycLoading(false);
      }
    };

    if (id && application) fetchKycDetails();
  }, [id, application]);

  // -----------------------------
  // Derived values
  // -----------------------------
  const actionRequests = useMemo(() => {
    const arr = actionRequestsData?.action_requests;
    return Array.isArray(arr) ? arr : [];
  }, [actionRequestsData]);

  const sortedActionRequests = useMemo(() => {
    return [...actionRequests].sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return tb - ta;
    });
  }, [actionRequests]);

  const sortedActionRequestsAsc = useMemo(() => {
    return [...actionRequests].sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return ta - tb;
    });
  }, [actionRequests]);

  const riskRules = Array.isArray(rules?.rules_triggered)
    ? rules.rules_triggered
    : [];

  const riskGrade = rules?.risk_grade || "";

  const riskTone = useMemo(() => {
    switch (riskGrade) {
      case "Enhanced Due Diligence (EDD)":
        return {
          badge: "bg-red-500 text-white border-red-500",
          soft: "border-red-500/20 bg-red-500/5",
          text: "text-red-500",
          icon: "text-red-500",
        };
      case "Standard Due Diligence (CDD)":
        return {
          badge: "bg-orange-400 text-white border-orange-400",
          soft: "border-orange-400/20 bg-orange-400/5",
          text: "text-orange-500",
          icon: "text-orange-500",
        };
      case "Simplified CDD":
        return {
          badge: "bg-emerald-600 text-white border-emerald-600",
          soft: "border-emerald-600/20 bg-emerald-600/5",
          text: "text-emerald-600",
          icon: "text-emerald-600",
        };
      default:
        return {
          badge: "bg-muted text-foreground border-border",
          soft: "border-border bg-muted/30",
          text: "text-foreground",
          icon: "text-muted-foreground",
        };
    }
  }, [riskGrade]);

  const latestActionRequest = sortedActionRequests[0] || null;
  const latestHasOcrWarnings = latestActionRequest?.ocr_warnings === true;

  const latestRelevantRequest = useMemo(() => {
    const open = sortedActionRequests.find((r) => r?.status === "OPEN");
    return open || sortedActionRequests[0] || null;
  }, [sortedActionRequests]);

  const requiredDocs = useMemo(() => {
    const docs = latestRelevantRequest?.documents;
    return Array.isArray(docs) ? docs : [];
  }, [latestRelevantRequest]);

  const requiredQns = useMemo(() => {
    const qs = latestRelevantRequest?.questions;
    return Array.isArray(qs) ? qs : [];
  }, [latestRelevantRequest]);

  const missingDocsCount = requiredDocs.length;
  const missingQnsCount = requiredQns.length;
  const hasMissing = missingDocsCount > 0 || missingQnsCount > 0;

  const actionReason =
    latestRelevantRequest?.reason || application?.reason || "";

  useEffect(() => {
    if (showActionRequired && actionReason) {
      setActiveTab("response");
    } else {
      setActiveTab("overview");
    }
  }, [showActionRequired, actionReason]);

  const allQuestions = useMemo(() => {
    const rows = [];
    for (const ar of sortedActionRequests) {
      const qs = Array.isArray(ar?.questions) ? ar.questions : [];
      for (const q of qs) {
        rows.push({
          action_request_id: ar?.action_request_id,
          status: ar?.status,
          created_at: ar?.created_at,
          item_id: q?.item_id,
          question_text: q?.question_text,
          answer_text: q?.answer_text,
          fulfilled_at: q?.fulfilled_at,
        });
      }
    }
    return rows;
  }, [sortedActionRequests]);

  const formattedDate = application?.last_edited
    ? new Date(application.last_edited).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "-";

  const individualsRaw = formData?.individuals;
  const directors = useMemo(() => {
    if (Array.isArray(individualsRaw)) return individualsRaw;
    if (individualsRaw && typeof individualsRaw === "object")
      return [individualsRaw];
    return [];
  }, [individualsRaw]);

  const firstActionRequestTime = useMemo(() => {
    if (sortedActionRequestsAsc.length === 0) return null;
    return new Date(sortedActionRequestsAsc[0]?.created_at || 0).getTime();
  }, [sortedActionRequestsAsc]);

  const parseExtractedData = (value) => {
    if (!value) return null;

    if (typeof value === "object") return value;

    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (err) {
        console.warn("Failed to parse extracted_data:", err, value);
        return null;
      }
    }

    return null;
  };

  const getDocumentOcrWarning = (doc) => {
    const extracted = parseExtractedData(doc?.extracted_data);
    const uploadValidation = extracted?.upload_validation || {};

    if (uploadValidation?.status !== "WARNING") {
      return null;
    }

    const reasons = Array.isArray(uploadValidation?.reasons)
      ? uploadValidation.reasons
      : [];

    return {
      message:
        reasons[0] ||
        "Document quality is flagged as moderate. Please review and verify the document's information carefully.",
      qualityBand: uploadValidation?.ocr_quality?.quality_band || null,
      qualityScore: uploadValidation?.ocr_quality?.quality_score ?? null,
    };
  };

  // const initialDocuments = useMemo(() => {
  //   if (!Array.isArray(documents)) return [];
  //   if (!firstActionRequestTime) return documents;

  //   return documents.filter((doc) => {
  //     const t = new Date(doc?.created_at || 0).getTime();
  //     return t && t < firstActionRequestTime;
  //   });
  // }, [documents, firstActionRequestTime]);

  const initialDocuments = useMemo(() => {
    if (!Array.isArray(documents)) return [];

    const filteredDocs = !firstActionRequestTime
      ? documents
      : documents.filter((doc) => {
          const t = new Date(doc?.created_at || 0).getTime();
          return t && t < firstActionRequestTime;
        });

    return filteredDocs.map((doc) => ({
      ...doc,
      ocr_warning: getDocumentOcrWarning(doc),
    }));
  }, [documents, firstActionRequestTime]);

  const resubmissionGroups = useMemo(() => {
    if (!Array.isArray(documents) || sortedActionRequestsAsc.length === 0)
      return [];

    return sortedActionRequestsAsc.map((request, index) => {
      const currentTime = new Date(request?.created_at || 0).getTime();
      const nextTime =
        index < sortedActionRequestsAsc.length - 1
          ? new Date(
              sortedActionRequestsAsc[index + 1]?.created_at || 0
            ).getTime()
          : Infinity;

      const groupedDocs = documents
        .filter((doc) => {
          const t = new Date(doc?.created_at || 0).getTime();
          return t && t >= currentTime && t < nextTime;
        })
        .map((doc) => {
          const matchedRequestDoc = request.documents?.find(
            (reqDoc) => reqDoc.submitted_document_name === doc.document_type
          );

          const ocrWarning = getDocumentOcrWarning(doc);

          return {
            ...doc,
            requested_document_name: matchedRequestDoc?.document_name || null,
            requested_document_desc: matchedRequestDoc?.document_desc || null,
            is_substitute: matchedRequestDoc?.is_substitute || false,
            submitted_document_name:
              matchedRequestDoc?.submitted_document_name || null,
            substitution_reason:
              matchedRequestDoc?.substitution_reason || null,
            fulfilled_at: matchedRequestDoc?.fulfilled_at || null,
            ocr_warning: ocrWarning,
          };
        });

      return {
        round: index + 1,
        action_request_id: request?.action_request_id,
        created_at: request?.created_at,
        status: request?.status,
        reason: request?.reason,
        documents: groupedDocs,
      };
    });
  }, [documents, sortedActionRequestsAsc]);

  // -----------------------------
  // Handlers
  // -----------------------------
  const handleDownload = async (doc) => {
    const newTab = window.open("", "_blank");

    try {
      const documentId = doc?.document_id;
      if (!documentId) {
        if (newTab) newTab.close();
        toast.error("Missing document_id");
        console.log("Doc object missing document_id:", doc);
        return;
      }

      const res = await downloadDocuments(documentId);
      const signedUrl = res?.url;

      if (!signedUrl) throw new Error("No url returned from download endpoint");

      if (newTab) newTab.location.href = signedUrl;
      else window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      if (newTab) newTab.close();
      console.error(
        "Download error:",
        e?.response?.status,
        e?.response?.data || e
      );
      toast.error("Could not open document", {
        description: e?.response?.data?.detail || e?.message || "Unknown error",
      });
    }
  };

  // -----------------------------
  // Loading / error states
  // -----------------------------
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Loading details...</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="font-medium text-red-500">
          {error || "Application not found."}
        </p>
        <Button onClick={() => navigate("/management-landing-page")}>
          Back to List
        </Button>
      </div>
    );
  }

  const appDisplayId =
    application?.application_id || application?.id || id || "-";

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="container mx-auto animate-fade-in px-6 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/management-landing-page")}
            className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </Button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
                <Building2 className="h-7 w-7 text-muted-foreground" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {application?.business_name || formData?.businessName || "-"}
                  </h1>
                  <StatusBadge status={currentStatus} />
                </div>

                <p className="mt-1 text-muted-foreground">
                  Application ID: {appDisplayId}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Last updated: {formattedDate}
                  </span>

                  {showActionRequired && hasMissing && (
                    <Badge className="border border-amber-500/20 bg-amber-500/10 text-amber-600">
                      {missingDocsCount + missingQnsCount} item(s) pending
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 pb-20">
          {latestHasOcrWarnings && (
            <Card className="border-amber-500 bg-amber-50">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700">
                      Document OCR Warning
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      Document quality is flagged as moderate. Please review and verify the document's information in the Documents tab.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {kycLoading ? (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Loading KYC details...</p>
              </CardContent>
            </Card>
          ) : kycError ? (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-red-500">{kycError}</p>
              </CardContent>
            </Card>
          ) : kycDetails ? (
            <KycVerificationCard kyc={kycDetails} />
          ) : null}

          <Card>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <CardHeader className="pb-3">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
                  {showActionRequired && actionReason && (
                    <TabsTrigger
                      value="response"
                      className="text-xs sm:text-sm"
                    >
                      Action Status
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="overview" className="text-xs sm:text-sm">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="risk" className="text-xs sm:text-sm">
                    Risk Assessment
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs sm:text-sm">
                    Documents
                  </TabsTrigger>
                  <TabsTrigger value="qna" className="text-xs sm:text-sm">
                    Questions & Answers
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="text-xs sm:text-sm">
                    Audit Trail
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent>
                <TabsContent value="overview" className="mt-0 space-y-6">
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Business Details
                    </h4>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Registration Number / UEN
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.uen || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Name of Corporation
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {application?.business_name ||
                            formData?.businessName ||
                            "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Incorporation Date
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.registrationDate || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Business Type
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formatBusinessType(
                            application?.business_type || formData?.businessType
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Industry
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.businessIndustry || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Status
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.businessStatus || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Employee Count
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.employeeCount || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Annual Revenue
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          ${formData?.annualRevenue || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.email || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.phone || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Account Currency
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.accountCurrency || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Bank Account Number
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.bankAccountNumber || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          SWIFT / BIC
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.swiftBic || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Source of Funds
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.sourceOfFunds || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Expected Monthly Transaction Volume
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.expectedMonthlyTransactionVolume || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Expected Transaction Countries
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {Array.isArray(
                            formData?.expectedCountriesOfTransactionActivity
                          ) &&
                          formData.expectedCountriesOfTransactionActivity.length >
                            0
                            ? formData.expectedCountriesOfTransactionActivity.join(
                                ", "
                              )
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      Registered Address
                    </h4>
                    <p className="text-sm font-medium text-foreground">
                      {formData?.registeredAddress || "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {application?.business_country || formData?.country || "-"}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <User className="h-4 w-4" />
                      Individuals ({directors.length})
                    </h4>

                    {directors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No individual details provided.
                      </p>
                    ) : (
                      <Accordion
                        type="single"
                        collapsible
                        defaultValue="director-0"
                        className="w-full"
                      >
                        {directors.map((d, idx) => {
                          const itemValue = `director-${idx}`;
                          return (
                            <AccordionItem
                              key={itemValue}
                              value={itemValue}
                              className="border-border"
                            >
                              <AccordionTrigger className="py-2.5 hover:no-underline">
                                <div className="flex items-center gap-2.5 text-left">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">
                                      {d?.fullName || `Individual ${idx + 1}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {d?.idNumber || "-"} • {d?.role || "-"}
                                    </p>
                                  </div>
                                </div>
                              </AccordionTrigger>

                              <AccordionContent>
                                <div className="grid grid-cols-1 gap-3 pl-10 pt-1 md:grid-cols-2">
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Position
                                    </p>
                                    <p className="text-sm text-foreground">
                                      {d?.position || "-"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Ownership
                                    </p>
                                    <p className="text-sm text-foreground">
                                      {d?.ownership || "-"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Nationality
                                    </p>
                                    <p className="text-sm text-foreground">
                                      {d?.nationality || "-"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Date of Birth
                                    </p>
                                    <p className="text-sm text-foreground">
                                      {d?.dateOfBirth || "-"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Residential Address
                                    </p>
                                    <p className="text-sm text-foreground">
                                      {d?.residentialAddress || "-"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Relationship
                                    </p>
                                    <p className="text-sm text-foreground">
                                      {d?.relationship || "-"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      PEP Declaration
                                    </p>
                                    <p className="text-sm text-foreground">
                                      {d?.pepDeclaration || "-"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      FATCA Declaration
                                    </p>
                                    <p className="text-sm text-foreground">
                                      {d?.fatcaDeclaration || "-"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Sanctions Declaration
                                    </p>
                                    <p className="text-sm text-foreground">
                                      {d?.sanctionsDeclaration || "-"}
                                    </p>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="risk" className="mt-0 space-y-5">
                  {riskLoading ? (
                    <p className="text-sm text-muted-foreground">Loading risk assessment...</p>
                  ) : riskError ? (
                    <p className="text-sm text-red-500">{riskError}</p>
                  ) : !rules ? (
                    <p className="text-sm text-muted-foreground">No risk assessment available.</p>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                            <ShieldAlert className={`h-4 w-4 ${riskTone.icon}`} />
                            Risk Assessment Summary
                          </h4>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Risk Grade</p>
                          <p className={`text-sm font-semibold ${riskTone.text}`}>
                            {rules.risk_grade || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Risk Score</p>
                          <div className="flex items-center gap-3">
                            {rules?.risk_score != null && (
                              <Badge className={`text-xs ${riskTone.badge}`}>
                                Score: {rules.risk_score}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Assessment ID</p>
                          <p className="break-all font-mono text-xs text-foreground">
                            {rules.job_id || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Completed At</p>
                          <p className="text-xs font-medium text-foreground">
                            {rules.completed_at
                              ? new Date(rules.completed_at).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Rules Triggered ({riskRules.length})
                        </p>

                        {riskRules.length > 0 ? (
                          <div className="space-y-2">
                            {riskRules.map((rule, index) => (
                              <div
                                key={`${rule.code || "rule"}-${index}`}
                                className={`flex items-start gap-2.5 rounded-lg border p-2.5 ${riskTone.soft}`}
                              >
                                <AlertOctagon
                                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${riskTone.icon}`}
                                />
                                <div className="min-w-0">
                                  <p className="text-[10px] font-mono text-muted-foreground">
                                    {rule.code || "-"}
                                  </p>
                                  <p className="text-sm text-foreground">
                                    {rule.description || "-"}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No rules triggered.</p>
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="documents" className="mt-0">
                  {docsLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Loading documents...
                    </p>
                  ) : docsError ? (
                    <p className="text-sm text-red-500">{docsError}</p>
                  ) : documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No documents uploaded yet.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">
                              Initial Submission
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Documents uploaded during the first application
                              submission.
                            </p>
                          </div>

                          <Badge className="border bg-muted text-foreground">
                            {initialDocuments.length} file(s)
                          </Badge>
                        </div>

                        {initialDocuments.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-4">
                            <p className="text-sm text-muted-foreground">
                              No initial submission documents detected.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {initialDocuments.map((doc) => (
                              <div
                                key={
                                  doc.document_id ||
                                  doc.id ||
                                  `${doc.document_type}-${doc.created_at}`
                                }
                                className="flex items-center justify-between rounded-lg border border-border p-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {doc.document_type || "Document"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {doc.created_at
                                      ? `Uploaded: ${new Date(doc.created_at).toLocaleString()}`
                                      : ""}
                                  </p>

                                  {doc.ocr_warning && (
                                    <div className="mt-2 rounded-md border border-orange-300 bg-orange-50 p-2">
                                      <div className="flex items-start gap-2">
                                        <AlertCircle className="mt-0.5 h-4 w-4 text-orange-600" />

                                        <div>
                                          <p className="text-xs font-medium text-orange-700">
                                            OCR Warning
                                          </p>

                                          <p className="mt-1 text-xs text-foreground">
                                            Document quality is moderate. Extracted data may be inaccurate — please verify against the original document. If already reviewed, you may ignore this warning.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="ml-2 h-8 w-8"
                                  type="button"
                                  title="Open"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDownload(doc);
                                  }}
                                  aria-label="Open document"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">
                              Resubmissions
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Documents uploaded after additional information
                              was requested.
                            </p>
                          </div>

                          <Badge className="border bg-muted text-foreground">
                            {resubmissionGroups.reduce(
                              (sum, group) => sum + group.documents.length,
                              0
                            )}{" "}
                            file(s)
                          </Badge>
                        </div>

                        {resubmissionGroups.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-4">
                            <p className="text-sm text-muted-foreground">
                              No resubmitted documents yet.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {resubmissionGroups.map((group) => (
                              <div
                                key={group.action_request_id || group.round}
                                className="rounded-xl border border-border p-4"
                              >
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <h5 className="text-sm font-semibold text-foreground">
                                      Resubmission Round {group.round}
                                    </h5>
                                    <p className="text-xs text-muted-foreground">
                                      Requested on{" "}
                                      {group.created_at
                                        ? new Date(
                                            group.created_at
                                          ).toLocaleString()
                                        : "-"}
                                    </p>
                                  </div>

                                  <Badge className="border bg-muted text-foreground">
                                    {group.documents.length} file(s)
                                  </Badge>
                                </div>

                                {group.reason && (
                                  <div className="mb-3 rounded-md bg-muted/50 p-3">
                                    <p className="text-xs font-medium text-muted-foreground">
                                      Escalation Reason
                                    </p>
                                    <p className="mt-1 text-sm text-foreground">
                                      {group.reason}
                                    </p>
                                  </div>
                                )}

                                {group.documents.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    No documents uploaded for this resubmission
                                    round yet.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {group.documents.map((doc) => (
                                      <div
                                        key={
                                          doc.document_id ||
                                          doc.id ||
                                          `${doc.document_type}-${doc.created_at}`
                                        }
                                        className="flex items-center justify-between rounded-lg border border-border p-3"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-sm font-medium text-foreground">
                                            {doc.document_type || "Document"}
                                          </p>

                                          <p className="text-xs text-muted-foreground">
                                            {doc.created_at
                                              ? `Uploaded: ${new Date(doc.created_at).toLocaleString()}`
                                              : ""}
                                          </p>

                                          {doc.ocr_warning && (
                                            <div className="mt-2 rounded-md border border-orange-300 bg-orange-50 p-2">
                                              <div className="flex items-start gap-2">
                                                <AlertCircle className="mt-0.5 h-4 w-4 text-orange-600" />

                                                <div>
                                                  <p className="text-xs font-medium text-orange-700">
                                                    OCR Warning
                                                  </p>

                                                  <p className="mt-1 text-xs text-foreground">
                                                    Document quality is moderate. Extracted data may be inaccurate — please verify against the original document. If already reviewed, you may ignore this warning.
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {doc.is_substitute && (
                                            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2">
                                              <p className="text-xs font-medium text-amber-700">
                                                Submitted as Substitute
                                              </p>

                                              {doc.requested_document_name && (
                                                <p className="mt-1 text-xs text-foreground">
                                                  Original Requested Document:{" "}
                                                  {doc.requested_document_name}
                                                </p>
                                              )}

                                              {doc.substitution_reason && (
                                                <p className="text-xs text-foreground">
                                                  Reason of Substitution:{" "}
                                                  {doc.substitution_reason}
                                                </p>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="ml-2 h-8 w-8"
                                          type="button"
                                          title="Open"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDownload(doc);
                                          }}
                                          aria-label="Open document"
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="qna" className="mt-0">
                  <div className="space-y-4">
                    {qnaLoading ? (
                      <p className="text-sm text-muted-foreground">
                        Loading questions & answers...
                      </p>
                    ) : qnaError ? (
                      <p className="text-sm text-red-500">{qnaError}</p>
                    ) : allQuestions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No questions found.
                      </p>
                    ) : (
                      allQuestions.map((qa, index) => (
                        <div
                          key={qa.item_id || `${qa.action_request_id}-${index}`}
                          className="space-y-2 rounded-lg border border-border p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              Request:{" "}
                              {qa.action_request_id?.slice?.(0, 8) || "-"} •{" "}
                              {qa.created_at
                                ? new Date(qa.created_at).toLocaleString()
                                : "-"}
                            </p>
                          </div>

                          <p className="text-sm font-medium text-foreground">
                            <span className="mr-1.5 text-muted-foreground">
                              Q{index + 1}.
                            </span>
                            {qa.question_text || "-"}
                          </p>

                          <div className="rounded-md bg-muted/50 p-2.5">
                            <p className="text-sm leading-relaxed text-foreground">
                              {qa.answer_text || "No answer submitted yet."}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="audit" className="mt-0">
                  {auditLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Loading audit trail...
                    </p>
                  ) : auditError ? (
                    <p className="text-sm text-red-500">{auditError}</p>
                  ) : (
                    <AuditTrail entries={auditEntries} />
                  )}
                </TabsContent>

                {showActionRequired && actionReason && (
                  <TabsContent value="response" className="mt-0 space-y-5">
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
                      <div className="mb-2 flex items-center gap-2 text-rose-500">
                        <AlertCircle className="h-4 w-4" />
                        <p className="text-sm font-semibold">Action Required</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">
                          Reason for Escalation:
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {actionReason}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Pending document requests ({requiredDocs.length})
                      </p>

                      {requiredDocs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No pending document requests.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {requiredDocs.map((doc, index) => (
                            <div
                              key={doc?.item_id || index}
                              className="rounded-lg border border-border p-3"
                            >
                              <p className="text-sm font-medium text-foreground">
                                {doc?.document_name ||
                                  `Requested Document ${index + 1}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {doc?.document_desc ||
                                  "Awaiting submission"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Pending questions ({requiredQns.length})
                      </p>

                      {requiredQns.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No pending questions.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {requiredQns.map((q, index) => (
                            <div
                              key={q?.item_id || index}
                              className="rounded-lg border border-border p-3"
                            >
                              <p className="text-sm font-medium text-foreground">
                                Q{index + 1}. {q?.question_text || "-"}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {q?.answer_text || "Awaiting response"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )}
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
}