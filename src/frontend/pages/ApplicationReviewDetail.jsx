// ApplicationReviewDetail.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  AlertCircle,
  Upload,
  User,
  MapPin,
  FileQuestion,
  CheckCircle2,
  XCircle,
  Download,
  ShieldAlert,
  AlertOctagon,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";
import { Badge } from "../components/ui/primitives/Badge";
import DecisionReasonDialog from "../components/ui/features/DecisionReasonDialog";
import { Textarea } from "../components/ui/primitives/Textarea";
import { toast } from "sonner";
import {
  getApplicationByAppId,
  approveApplication,
  rejectApplication,
  escalateApplication,
  getQnA,
  getReviewJob,
} from "@/api/applicationApi";
import { getAuditTrail } from "@/api/auditTrailApi";
import { allDocuments, downloadDocuments } from "./../api/documentApi";
import { getKYCdetails } from "@/api/livenessDetectionApi";
import RequestDocumentsDialog from "../components/ui/features/RequestDocumentsDialog";
import { AuditTrail } from "../components/ui/features/AuditTrail";
import { KycVerificationCard } from "../components/ui/features/kycVerificationCard";

const formatBusinessType = (value) => {
  if (!value) return "-";
  return String(value)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatBool = (value) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "-";
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return value;
};

export default function ApplicationReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [rules, setRules] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState(null);

  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState(null);

  const [kycDetails, setKycDetails] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState(null);

  const [actionRequestsData, setActionRequestsData] = useState(null);
  const [qnaLoading, setQnaLoading] = useState(false);
  const [qnaError, setQnaError] = useState(null);

  const [auditEntries, setAuditEntries] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);

  const [requestDocsOpen, setRequestDocsOpen] = useState(false);

  // New state for approve/reject popup
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [decisionType, setDecisionType] = useState(null); // "approve" | "reject"
  const [decisionReason, setDecisionReason] = useState("");

  // -----------------------------
  // Fetch application
  // -----------------------------
  useEffect(() => {
    const fetchApplication = async () => {
      try {
        setIsLoading(true);
        const data = await getApplicationByAppId(id);
        setApplication(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching application:", err);
        setError("Could not retrieve application details.");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchApplication();
  }, [id]);
  // -----------------------------
  // Fetch uploaded documents
  // -----------------------------
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setDocsLoading(true);
        setDocsError(null);

        const docs = await allDocuments(id);
        setDocuments(Array.isArray(docs) ? docs : []);
      } catch (err) {
        console.error("Error fetching documents:", err);
        setDocsError("Could not retrieve documents.");
      } finally {
        setDocsLoading(false);
      }
    };

    if (id) fetchDocuments();
  }, [id]);

  // -----------------------------
  // Fetch Risk Assessment
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
            "Could not retrieve risk assessment.",
        );
        setRules(null);
      } finally {
        setRiskLoading(false);
      }
    };

    if (id && application) fetchReviewJob();
  }, [id, application]);

  // -----------------------------
  // Fetch KYC Details by Application ID
  // -----------------------------
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
        console.error("Error fetching KYC details:", {
          message: err?.message,
          status: err?.response?.status,
          data: err?.response?.data,
          url: err?.config?.url,
        });

        setKycError(
          err?.response?.data?.detail ||
            err?.response?.data?.message ||
            err?.message ||
            "Could not retrieve KYC details.",
        );
        setKycDetails(null);
      } finally {
        setKycLoading(false);
      }
    };

    if (id && application) fetchKycDetails();
  }, [id, application]);

  // -----------------------------
  // Fetch Action Requests (QnA)
  // -----------------------------
  useEffect(() => {
    const fetchQnA = async () => {
      try {
        setQnaLoading(true);
        setQnaError(null);

        const appIdToUse = application?.application_id || application?.id || id;
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
            "Could not retrieve questions & answers.",
        );
        setActionRequestsData(null);
      } finally {
        setQnaLoading(false);
      }
    };

    if (id && application) fetchQnA();
  }, [id, application]);

  // -----------------------------
  // Fetch Audit Trail
  // -----------------------------
  useEffect(() => {
    const fetchAuditTrail = async () => {
      try {
        setAuditLoading(true);
        setAuditError(null);

        const appIdToUse = application?.application_id || application?.id || id;
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
            "Could not retrieve audit trail.",
        );
        setAuditEntries([]);
      } finally {
        setAuditLoading(false);
      }
    };

    if (id && application) fetchAuditTrail();
  }, [id, application]);

  // -----------------------------
  // Derived values
  // -----------------------------
  const formData = application?.form_data || {};

  const currentStatus = application?.current_status || "Not started";
  const canReview = ["Under Review", "Under Manual Review"].includes(currentStatus);

  const manualReviewAIPayload = useMemo(() => {
    return {
      application_data: application?.form_data || {},
      risk_assessment: {
        risk_grade: rules?.risk_grade || null,
        risk_score: rules?.risk_score ?? null,
        triggered_rules: Array.isArray(rules?.rules_triggered)
          ? rules.rules_triggered
          : [],
      },
      documents: Array.isArray(documents) ? documents : [],
      action_requests: Array.isArray(actionRequestsData?.action_requests)
        ? actionRequestsData.action_requests
        : [],
    };
  }, [application, rules, documents, actionRequestsData]);


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
    if (individualsRaw && typeof individualsRaw === "object") return [individualsRaw];
    return [];
  }, [individualsRaw]);

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

  const latestOpenRequest = useMemo(() => {
    return sortedActionRequests.find((r) => r?.status === "OPEN") || null;
  }, [sortedActionRequests]);

  const actionReason =
    latestOpenRequest?.reason ?? application?.reason ?? formData?.reason;

  const missingDocuments = useMemo(() => {
    const docs = latestOpenRequest?.documents;
    return Array.isArray(docs) ? docs : [];
  }, [latestOpenRequest]);

  const allQuestions = useMemo(() => {
    const rows = [];
    for (const ar of sortedActionRequests) {
      const qs = Array.isArray(ar?.questions) ? ar.questions : [];
      for (const q of qs) {
        rows.push({
          action_request_id: ar?.action_request_id,
          status: ar?.status,
          reason: ar?.reason,
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

  const riskRules = Array.isArray(rules?.rules_triggered) ? rules.rules_triggered : [];
  const riskGrade = rules?.risk_grade || "";

  const riskTone = useMemo(() => {
    switch (riskGrade) {
      case "Enhanced CDD":
        return {
          badge: "bg-red-500 text-white border-red-500",
          soft: "border-red-500/20 bg-red-500/5",
          text: "text-red-500",
          icon: "text-red-500",
        };
      // case "Standard CDD":
      case "Standard CDD":
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

  const firstActionRequestTime = useMemo(() => {
    if (sortedActionRequestsAsc.length === 0) return null;
    return new Date(sortedActionRequestsAsc[0]?.created_at || 0).getTime();
  }, [sortedActionRequestsAsc]);

  const initialDocuments = useMemo(() => {
    if (!Array.isArray(documents)) return [];
    if (!firstActionRequestTime) return documents;

    return documents.filter((doc) => {
      const t = new Date(doc?.created_at || 0).getTime();
      return t && t < firstActionRequestTime;
    });
  }, [documents, firstActionRequestTime]);

  const resubmissionGroups = useMemo(() => {
    if (!Array.isArray(documents) || sortedActionRequestsAsc.length === 0) return [];

    return sortedActionRequestsAsc.map((request, index) => {
      const currentTime = new Date(request?.created_at || 0).getTime();
      const nextTime =
        index < sortedActionRequestsAsc.length - 1
          ? new Date(sortedActionRequestsAsc[index + 1]?.created_at || 0).getTime()
          : Infinity;

      // const groupedDocs = documents.filter((doc) => {
      //   const t = new Date(doc?.created_at || 0).getTime();
      //   return t && t >= currentTime && t < nextTime;
      // });
      const groupedDocs = documents
      .filter((doc) => {
        const t = new Date(doc?.created_at || 0).getTime();
        return t && t >= currentTime && t < nextTime;
      })
      .map((doc) => {
        // 🔥 find matching request document
        const matchedRequestDoc = request.documents?.find(
          (reqDoc) =>
            reqDoc.submitted_document_name === doc.document_type
        );

        return {
          ...doc,
          requested_document_name: matchedRequestDoc?.document_name || null,
          requested_document_desc: matchedRequestDoc?.document_desc || null,
          is_substitute: matchedRequestDoc?.is_substitute || false,
          submitted_document_name: matchedRequestDoc?.submitted_document_name || null,
          substitution_reason: matchedRequestDoc?.substitution_reason || null,
          fulfilled_at: matchedRequestDoc?.fulfilled_at || null,
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

  const shouldShowKycBanner = !!kycDetails && !kycLoading && !kycError;

  // -----------------------------
  // Handlers
  // -----------------------------
  const handleOpenDocument = async (doc) => {
    const newTab = window.open("", "_blank");

    try {
      const documentId = doc?.document_id;
      if (!documentId) {
        if (newTab) newTab.close();
        toast.error("Missing document_id");
        console.log("Doc missing document_id:", doc);
        return;
      }

      const res = await downloadDocuments(documentId);
      const signedUrl = res?.url;

      if (!signedUrl) throw new Error("No url returned from download endpoint");

      if (newTab) newTab.location.href = signedUrl;
      else window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (newTab) newTab.close();
      console.error("Open document error:", err?.response?.status, err?.response?.data || err);
      toast.error("Could not open document", {
        description: err?.response?.data?.detail || err?.message || "Unknown error",
      });
    }
  };

  const handleRequestDocuments = () => {
    setRequestDocsOpen(true);
  };

  const resetDecisionDialog = () => {
    setDecisionDialogOpen(false);
    setDecisionType(null);
    setDecisionReason("");
  };

  const handleSubmitRequestDocs = async ({ reason, documents, questions }) => {
    if (!id) return;

    try {
      setIsUpdatingStatus(true);

      const appIdToUse = application?.application_id || id;

      await escalateApplication(appIdToUse, {
        reason,
        documents,
        questions,
      });

      navigate("/staff-landingpage", {
        state: {
          banner: {
            type: "success",
            message: `Application ID ${appIdToUse} has been escalated for additional documents/questions.`,
          },
        },
      });
    } catch (err) {
      console.error("Escalate failed:", err);
      toast.error("Request Documents failed", {
        description:
          err?.response?.data?.detail || err?.message || "Could not escalate application.",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // const handleApprove = async () => {
  //   if (!id) return;

  //   const reason = window.prompt("Reason for approving this application?") || "";
  //   if (!reason.trim()) {
  //     toast.error("Reason required", { description: "Please enter a reason to approve." });
  //     return;
  //   }

  //   try {
  //     setIsUpdatingStatus(true);
  //     const appIdToUse = application?.application_id || id;
  //     await approveApplication(appIdToUse, reason.trim());

  //     toast.success("Application Approved", {
  //       description: `${
  //         application?.business_name || formData?.businessName || "Application"
  //       } has been approved.`,
  //     });

  //     navigate("/staff-landingpage");
  //   } catch (err) {
  //     console.error("Approve failed:", err);
  //     toast.error("Approve failed", {
  //       description: err?.response?.data?.detail || err?.message || "Could not approve application.",
  //     });
  //   } finally {
  //     setIsUpdatingStatus(false);
  //   }
  // };

  // const handleReject = async () => {
  //   if (!id) return;

  //   const reason = window.prompt("Reason for rejecting this application?") || "";
  //   if (!reason.trim()) {
  //     toast.error("Reason required", { description: "Please enter a reason to reject." });
  //     return;
  //   }

  //   try {
  //     setIsUpdatingStatus(true);
  //     const appIdToUse = application?.application_id || id;
  //     await rejectApplication(appIdToUse, reason.trim());

  //     toast.success("Application Rejected", {
  //       description: `${
  //         application?.business_name || formData?.businessName || "Application"
  //       } has been rejected.`,
  //     });

  //     navigate("/staff-landingpage");
  //   } catch (err) {
  //     console.error("Reject failed:", err);
  //     toast.error("Reject failed", {
  //       description: err?.response?.data?.detail || err?.message || "Could not reject application.",
  //     });
  //   } finally {
  //     setIsUpdatingStatus(false);
  //   }
  // };

  const handleApprove = () => {
    setDecisionType("approve");
    setDecisionDialogOpen(true);
  };

  const handleReject = () => {
    setDecisionType("reject");
    setDecisionDialogOpen(true);
  };

  const handleSubmitDecision = async (reason) => {
    if (!id || !decisionType) return;

    try {
      setIsUpdatingStatus(true);

      const appIdToUse = application?.application_id || id;
      const businessLabel = application?.business_name || formData?.businessName || "Application";

      if (decisionType === "approve") {
        await approveApplication(appIdToUse, reason.trim());

        toast.success("Application Approved", {
          description: `${businessLabel} has been approved.`,
        });
      } else if (decisionType === "reject") {
        await rejectApplication(appIdToUse, reason.trim());

        toast.success("Application Rejected", {
          description: `${businessLabel} has been rejected.`,
        });
      }

      setDecisionDialogOpen(false);
      setDecisionType(null);

      navigate("/staff-landingpage", {
        state: {
          banner: {
            type: decisionType === "approve" ? "success" : "error",
            message:
              decisionType === "approve"
                ? `You have approved application ID ${appIdToUse}.`
                : `You have rejected application ID ${appIdToUse}.`,
          },
        },
      });

      // navigate("/staff-landingpage");
    } catch (err) {
      console.error(`${decisionType} failed:`, err);

      toast.error(
        decisionType === "approve" ? "Approve failed" : "Reject failed",
        {
          description:
            err?.response?.data?.detail ||
            err?.message ||
            `Could not ${decisionType} application.`,
        },
      );
    } finally {
      setIsUpdatingStatus(false);
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
        <p className="font-medium text-red-500">{error || "Application not found."}</p>
        <Button onClick={() => navigate("/staff-landingpage")}>Back to List</Button>
      </div>
    );
  }

  const appDisplayId = application?.application_id || application?.id || id || "-";

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="container mx-auto animate-fade-in px-6 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/staff-landingpage")}
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
                <p className="mt-1 text-muted-foreground">Application ID: {appDisplayId}</p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Last updated: {formattedDate}
                  </span>
                  {missingDocuments.length > 0 && (
                    <Badge className="border border-amber-500/20 bg-amber-500/10 text-amber-600">
                      {missingDocuments.length} item(s) pending applicant action
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 pb-20">
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
          ) : shouldShowKycBanner ? (
            <KycVerificationCard kyc={kycDetails} />
          ) : null}

          <Card>
            <Tabs defaultValue="overview" className="w-full">
              <CardHeader className="pb-3">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
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
                  {currentStatus === "Requires Action" && actionReason && (
                    <TabsTrigger value="response" className="text-xs sm:text-sm">
                      Action Status
                    </TabsTrigger>
                  )}
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
                        <p className="text-xs text-muted-foreground">Registration Number / UEN</p>
                        <p className="text-sm font-medium text-foreground">{formData?.uen || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Business Name</p>
                        <p className="text-sm font-medium text-foreground">
                          {application?.business_name || formData?.businessName || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Incorporation Date</p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.registrationDate || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Business Type</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatBusinessType(application?.business_type || formData?.businessType)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Industry</p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.businessIndustry || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Business Status</p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.businessStatus || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Employee Count</p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.employeeCount || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Annual Revenue</p>
                        <p className="text-sm font-medium text-foreground">
                          ${formData?.annualRevenue || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium text-foreground">{formData?.email || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium text-foreground">{formData?.phone || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Currency</p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.accountCurrency || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bank Account Number</p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.bankAccountNumber || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">SWIFT / BIC</p>
                        <p className="text-sm font-medium text-foreground">
                          {formData?.swiftBic || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Source of Funds</p>
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
                          {Array.isArray(formData?.expectedCountriesOfTransactionActivity) &&
                          formData.expectedCountriesOfTransactionActivity.length > 0
                            ? formData.expectedCountriesOfTransactionActivity.join(", ")
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
                      <p className="text-sm text-muted-foreground">No individual details provided.</p>
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
                                    <p className="text-xs text-muted-foreground">Position</p>
                                    <p className="text-sm text-foreground">{d?.position || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Ownership</p>
                                    <p className="text-sm text-foreground">{d?.ownership || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Nationality</p>
                                    <p className="text-sm text-foreground">{d?.nationality || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                                    <p className="text-sm text-foreground">{d?.dateOfBirth || "-"}</p>
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
                                    <p className="text-xs text-muted-foreground">Relationship</p>
                                    <p className="text-sm text-foreground">
                                      {d?.relationship || "-"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">PEP Declaration</p>
                                    <p className="text-sm text-foreground">
                                      {d?.pepDeclaration || "-"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">FATCA Declaration</p>
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
                    <p className="text-sm text-muted-foreground">Loading documents...</p>
                  ) : docsError ? (
                    <p className="text-sm text-red-500">{docsError}</p>
                  ) : documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">
                              Initial Submission
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Documents uploaded during the first application submission.
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
                                    handleOpenDocument(doc);
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
                            <h4 className="text-sm font-semibold text-foreground">Resubmissions</h4>
                            <p className="text-xs text-muted-foreground">
                              Documents uploaded after reviewer requests for additional information.
                            </p>
                          </div>
                          <Badge className="border bg-muted text-foreground">
                            {resubmissionGroups.reduce(
                              (sum, group) => sum + group.documents.length,
                              0,
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
                                        ? new Date(group.created_at).toLocaleString()
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
                                      Escalation Reason:
                                    </p>
                                    <p className="mt-1 text-sm text-foreground">{group.reason}</p>
                                  </div>
                                )}

                                {group.documents.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    No documents uploaded for this resubmission round yet.
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

                                          {doc.is_substitute && (
                                            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2">
                                              <p className="text-xs font-medium text-amber-700">
                                                Submitted as Substitute
                                              </p>

                                              {doc.requested_document_name && (
                                                <p className="mt-1 text-xs text-foreground">
                                                  Original Requested Document: {doc.requested_document_name}
                                                </p>
                                              )}

                                              {doc.substitution_reason && (
                                                <p className="text-xs text-foreground">
                                                  Reason of Substitution: {doc.substitution_reason}
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
                                            handleOpenDocument(doc);
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
                      <p className="text-sm text-muted-foreground">No questions requested.</p>
                    ) : (
                      allQuestions.map((qa, index) => (
                        <div
                          key={qa.item_id || `${qa.action_request_id}-${index}`}
                          className="space-y-2 rounded-lg border border-border p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              Request: {qa.action_request_id?.slice?.(0, 8) || "-"} •{" "}
                              {qa.created_at ? new Date(qa.created_at).toLocaleString() : "-"}
                            </p>
                          </div>

                          <p className="text-sm font-medium text-foreground">
                            <span className="mr-1.5 text-muted-foreground">Q{index + 1}.</span>
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
                    <p className="text-sm text-muted-foreground">Loading audit trail...</p>
                  ) : auditError ? (
                    <p className="text-sm text-red-500">{auditError}</p>
                  ) : (
                    <AuditTrail entries={auditEntries} />
                  )}
                </TabsContent>

                {currentStatus === "Requires Action" && actionReason && (
                  <TabsContent value="response" className="mt-0 space-y-5">
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
                      <div className="mb-2 flex items-center gap-2 text-rose-500">
                        <AlertCircle className="h-4 w-4" />
                        <p className="text-sm font-semibold">Action Required</p>
                      </div>
                      <p className="text-sm text-foreground">{actionReason}</p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Pending document requests ({missingDocuments.length})
                      </p>

                      {missingDocuments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No pending document requests.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {missingDocuments.map((doc, index) => (
                            <div
                              key={doc?.item_id || index}
                              className="rounded-lg border border-border p-3"
                            >
                              <p className="text-sm font-medium text-foreground">
                                {doc?.document_name || `Requested Document ${index + 1}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {doc?.document_desc || "Awaiting applicant submission"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button className="gap-2" disabled>
                        <Upload className="h-4 w-4" />
                        Awaiting Applicant Upload
                      </Button>
                    </div>
                  </TabsContent>
                )}
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </main>

      <RequestDocumentsDialog
        open={requestDocsOpen}
        onOpenChange={setRequestDocsOpen}
        businessName={application?.business_name || formData?.businessName || "-"}
        missingCount={missingDocuments.length}
        onSubmit={handleSubmitRequestDocs}
        isSubmitting={isUpdatingStatus}
        aiPayload={manualReviewAIPayload}
        aiDisabled={
          isLoading || riskLoading || docsLoading || qnaLoading || !application
        }
      />

      <DecisionReasonDialog
        open={decisionDialogOpen}
        onOpenChange={(open) => {
          if (!isUpdatingStatus) {
            setDecisionDialogOpen(open);
            if (!open) setDecisionType(null);
          }
        }}
        type={decisionType || "approve"}
        businessName={application?.business_name || formData?.businessName || ""}
        isSubmitting={isUpdatingStatus}
        onSubmit={handleSubmitDecision}
      />

      {canReview && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-slate-200/70 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="container mx-auto flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <p className="hidden text-sm text-muted-foreground sm:block">
                Reviewing <span className="font-medium text-foreground">{appDisplayId}</span>
              </p>
              {missingDocuments.length > 0 && (
                <Badge className="border border-amber-500/20 bg-amber-500/10 text-xs text-amber-600">
                  {missingDocuments.length} item(s) pending
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-500/10"
                onClick={handleRequestDocuments}
                disabled={isUpdatingStatus}
              >
                <FileQuestion className="h-4 w-4" />
                {isUpdatingStatus ? "Requesting..." : "Request Documents"}
              </Button>

              <Button
                variant="outline"
                className="gap-2 border-destructive bg-red-500 text-white hover:bg-red-600"
                onClick={handleReject}
                disabled={isUpdatingStatus}
              >
                <XCircle className="h-4 w-4" />
                {isUpdatingStatus && decisionType === "reject" && decisionDialogOpen
                  ? "Rejecting..."
                  : "Reject Application"}
              </Button>

              <Button
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-600/90"
                onClick={handleApprove}
                disabled={isUpdatingStatus}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isUpdatingStatus && decisionType === "approve" && decisionDialogOpen
                  ? "Approving..."
                  : "Approve Application"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}