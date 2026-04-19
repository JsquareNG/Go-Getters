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
  Download,
  Undo2,
  Trash2,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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
  withdrawApplication,
  deleteApplication,
  getReviewJob,
  submitSmeApplicationApi,
} from "./../api/applicationApi";
import { allDocuments, downloadDocuments, replaceDocument } from "./../api/documentApi";
import { classifyAndExtractApi } from "./../api/ocrApi";
import { userInfo } from "./../api/usersApi";
import { getAuditTrail } from "./../api/auditTrailApi";
import { generateAlternativeDocumentOptions } from "./../api/smartAI";
import { ResubmitDialog } from "../components/ui/features/ResubmitDialog";
import { AuditTrail } from "../components/ui/features/AuditTrail";
import {
  SINGAPORE_CONFIG,
  INDONESIA_CONFIG,
} from "../components/ui/SMEApplicationForm/config";
import ResubmitDocumentUploadField from "../components/ui/features/ResubmitDocumentUploadField";

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

export default function ApplicationDetail() {
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

  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [pageBanner, setPageBanner] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [rules, setRules] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState(null);

 
  const [alternativeDocOptionsByItemId, setAlternativeDocOptionsByItemId] =
    useState({});
  const [alternativeDocsLoading, setAlternativeDocsLoading] = useState(false);
  const [alternativeDocsError, setAlternativeDocsError] = useState(null);
  const [hasLoadedAlternativeDocs, setHasLoadedAlternativeDocs] =
    useState(false);

  const crossValidationReason =
    application?.cross_validation_result?.reason || null;
  const mismatchDocumentDetails = Array.isArray(
    application?.cross_validation_result?.summary?.mismatch_document_details
  )
    ? application?.cross_validation_result?.summary.mismatch_document_details
    : [];
  const crossValidationResult = application?.cross_validation_result || null;
  const mismatchByDocumentId = useMemo(() => {
    return mismatchDocumentDetails.reduce((acc, item) => {
      if (item?.document_id) {
        acc[item.document_id] = item;
      }
      return acc;
    }, {});
  }, [mismatchDocumentDetails]);
  const shouldShowDocumentWarning =
    application?.document_warning === true

  const [reuploadFiles, setReuploadFiles] = useState({});
  const [reuploadErrors, setReuploadErrors] = useState({});
  const [isSubmittingReupload, setIsSubmittingReupload] = useState(false);
  
  const [checkingReuploadByDocId, setCheckingReuploadByDocId] = useState({});
  const [reuploadValidationByDocId, setReuploadValidationByDocId] = useState({});

  const uploadedCount = mismatchDocumentDetails.filter(
    (doc) => reuploadFiles[doc.document_id]
  ).length;

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
          "Could not retrieve questions & answers.",
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
          "Could not retrieve audit trail.",
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
  const previousStatusKey = normKey(application?.previous_status);
  const showActionRequired = currentStatusKey === "requires action";

  const canWithdraw = useMemo(() => {
    if (
      currentStatusKey === "draft" &&
      previousStatusKey === "requires action"
    ) {
      return true;
    }
    if (
      currentStatusKey === "requires action" &&
      previousStatusKey === "under review"
    ) {
      return true;
    }
    if (
      currentStatusKey === "requires action" &&
      previousStatusKey === "under manual review"
    ) {
      return true;
    }
    return false;
  }, [currentStatusKey, previousStatusKey]);

  const canDelete = useMemo(() => {
    return currentStatusKey === "draft" && previousStatusKey == null;
  }, [currentStatusKey, previousStatusKey]);

 
  const CONFIG_MAP = {
    Singapore: SINGAPORE_CONFIG,
    Indonesia: INDONESIA_CONFIG,
  };

  const businessType =
    formData?.businessType || application?.business_type || "";

  const country =
    formData?.country ||
    formData?.businessCountry ||
    application?.business_country ||
    "Singapore";

  const activeConfig = CONFIG_MAP[country] || SINGAPORE_CONFIG;

  const entityConfig = useMemo(() => {
    return activeConfig?.entities?.[businessType] || null;
  }, [activeConfig, businessType]);

  const step2Config = useMemo(() => {
    return entityConfig?.steps?.find((s) => s.id === "step2") || null;
  }, [entityConfig]);

  const step3Config = useMemo(() => {
    return entityConfig?.steps?.find((s) => s.id === "step3") || null;
  }, [entityConfig]);

  const step4Config = useMemo(() => {
    return entityConfig?.steps?.find((s) => s.id === "step4") || null;
  }, [entityConfig]);


  const getNestedValue = (obj, path) => {
    if (!obj || !path) return undefined;

    return String(path)
      .split(".")
      .reduce((acc, key) => {
        if (acc == null) return undefined;
        const isIndex = !Number.isNaN(Number(key));
        return isIndex ? acc[Number(key)] : acc[key];
      }, obj);
  };


  const prettifyKey = (key) => {
    return String(key || "")
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatValue = (value) => {
    if (value == null || value === "") return "-";

    if (Array.isArray(value)) {
      if (!value.length) return "-";
      return value.join(", ");
    }

    if (typeof value === "object") return "-";

    return String(value);
  };

  const repeatableSections = step2Config?.repeatableSections || {};

  const businessRepeatableSections = useMemo(() => {
    return Object.entries(repeatableSections).filter(
      ([, sectionConfig]) => sectionConfig?.storage === "businessActivities",
    );
  }, [repeatableSections]);

  const individualRepeatableSections = useMemo(() => {
    return Object.entries(repeatableSections).filter(
      ([, sectionConfig]) => sectionConfig?.storage === "individuals",
    );
  }, [repeatableSections]);

  const getBusinessActivityRows = (sectionConfig, formData) => {
    const storageKey = sectionConfig?.storage;
    const rows = Array.isArray(formData?.[storageKey])
      ? formData[storageKey]
      : [];

    const rowTypeField = sectionConfig?.rowTypeField;
    const rowTypeValue = sectionConfig?.rowTypeValue;

    if (!rowTypeField || !rowTypeValue) return rows;

    return rows.filter((row) => row?.[rowTypeField] === rowTypeValue);
  };


  const getRepeatableSectionRows = (sectionKey, sectionConfig, formData) => {
    const storageKey = sectionConfig?.storage;
    const rows = Array.isArray(formData?.[storageKey])
      ? formData[storageKey]
      : [];

    const rowTypeField = sectionConfig?.rowTypeField;
    const rowTypeValue = sectionConfig?.rowTypeValue;

    if (!rowTypeField || !rowTypeValue) return rows;

    return rows.filter((row) => row?.[rowTypeField] === rowTypeValue);
  };

 
  useEffect(() => {
    const fetchUser = async () => {
      if (!application?.user_id) return;

      try {
        const data = await userInfo(application.user_id);
        setUser(data);
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    };

    fetchUser();
  }, [application]);

  useEffect(() => {
    if (id) fetchDocuments();
  }, [id]);


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

  
  useEffect(() => {
    const appIdToUse = application?.application_id || application?.id || id;
    if (id && application) fetchQnA(appIdToUse);
  }, [id, application]);

  useEffect(() => {
    const appIdToUse = application?.application_id || application?.id || id;
    if (id && application) fetchAuditEntries(appIdToUse);
  }, [id, application]);

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
  
  const allDocsUploaded = mismatchDocumentDetails.every(
    (doc) => !!reuploadFiles[doc.document_id]
  );

  const isChecking = Object.values(checkingReuploadByDocId).some(Boolean);

  const canSubmitReupload =
    allDocsUploaded && !isChecking && !isSubmittingReupload;

  const firstActionRequestTime = useMemo(() => {
    if (sortedActionRequestsAsc.length === 0) return null;
    return new Date(sortedActionRequestsAsc[0]?.created_at || 0).getTime();
  }, [sortedActionRequestsAsc]);

  const initialDocuments = useMemo(() => {
    if (!Array.isArray(documents)) return [];
    if (!firstActionRequestTime) {
      return documents.map((doc) => ({
        ...doc,
        mismatch_detail: mismatchByDocumentId[doc.document_id] || null,
      }));
    }

    return documents
      .filter((doc) => {
        const t = new Date(doc?.created_at || 0).getTime();
        return t && t < firstActionRequestTime;
      })
      .map((doc) => ({
        ...doc,
        mismatch_detail: mismatchByDocumentId[doc.document_id] || null,
      }));
  }, [documents, firstActionRequestTime, mismatchByDocumentId]);

  const resubmissionGroups = useMemo(() => {
    if (!Array.isArray(documents) || sortedActionRequestsAsc.length === 0)
      return [];

    return sortedActionRequestsAsc.map((request, index) => {
      const currentTime = new Date(request?.created_at || 0).getTime();
      const nextTime =
        index < sortedActionRequestsAsc.length - 1
          ? new Date(
              sortedActionRequestsAsc[index + 1]?.created_at || 0,
            ).getTime()
          : Infinity;

      const groupedDocs = documents
        .filter((doc) => {
          const t = new Date(doc?.created_at || 0).getTime();
          return t && t >= currentTime && t < nextTime;
        })
        .map((doc) => {
          
          const matchedRequestDoc = request.documents?.find(
            (reqDoc) => reqDoc.submitted_document_name === doc.document_type,
          );

          return {
            ...doc,
            requested_document_name: matchedRequestDoc?.document_name || null,
            requested_document_desc: matchedRequestDoc?.document_desc || null,
            is_substitute: matchedRequestDoc?.is_substitute || false,
            submitted_document_name:
              matchedRequestDoc?.submitted_document_name || null,
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

  const alternativeDocumentsAIPayload = useMemo(() => {
    return {
      requested_documents: requiredDocs.map((doc) => ({
        item_id: doc?.item_id,
        document_name: doc?.document_name,
        document_desc: doc?.document_desc || null,
      })),
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
  }, [requiredDocs, application, rules, documents, actionRequestsData]);

  const requiredDocsWithAlternatives = useMemo(() => {
    return requiredDocs.map((doc) => ({
      ...doc,
      alternativeDocumentOptions:
        alternativeDocOptionsByItemId[doc.item_id] || [],
    }));
  }, [requiredDocs, alternativeDocOptionsByItemId]);


  useEffect(() => {
    setAlternativeDocOptionsByItemId({});
    setAlternativeDocsError(null);
    setHasLoadedAlternativeDocs(false);
  }, [id, latestRelevantRequest?.action_request_id]);


  useEffect(() => {
    const fetchAlternativeDocumentOptions = async () => {
      try {
        setAlternativeDocsLoading(true);
        setAlternativeDocsError(null);

        console.log(alternativeDocumentsAIPayload)

        const response = await generateAlternativeDocumentOptions(
          alternativeDocumentsAIPayload,
        );

        const results = Array.isArray(response?.data?.results)
          ? response.data.results
          : [];

        const mapped = results.reduce((acc, item) => {
          acc[item.item_id] = Array.isArray(item.alternative_document_options)
            ? item.alternative_document_options
            : [];
          return acc;
        }, {});

        setAlternativeDocOptionsByItemId(mapped);
        setHasLoadedAlternativeDocs(true);
      } catch (err) {
        console.error("Error generating alternative document options:", {
          message: err?.message,
          status: err?.response?.status,
          data: err?.response?.data,
          url: err?.config?.url,
        });

        setAlternativeDocsError(
          err?.response?.data?.detail ||
            err?.response?.data?.message ||
            err?.message ||
            "Could not generate alternative document options.",
        );

        setAlternativeDocOptionsByItemId({});
      } finally {
        setAlternativeDocsLoading(false);
      }
    };

    if (!showActionRequired) return;
    if (!actionReason) return;
    if (hasLoadedAlternativeDocs) return;
    if (!application) return;
    if (requiredDocs.length === 0) return;
    if (docsLoading || qnaLoading || riskLoading) return;

    fetchAlternativeDocumentOptions();
  }, [
    showActionRequired,
    actionReason,
    hasLoadedAlternativeDocs,
    application,
    requiredDocs,
    docsLoading,
    qnaLoading,
    riskLoading,
    alternativeDocumentsAIPayload,
  ]);

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
        e?.response?.data || e,
      );
      toast.error("Could not open document", {
        description: e?.response?.data?.detail || e?.message || "Unknown error",
      });
    }
  };

  const handleWithdraw = async () => {
    try {
      setIsWithdrawing(true);
      await withdrawApplication(id);
      navigate("/landingpage", {
        state: {
          banner: {
            type: "withdrawn",
            message: `Application ${id} has been withdrawn successfully.`,
          },
        },
      });
    } catch (err) {
      console.error(
        "[API] withdrawApplication failed",
        err?.response?.data || err,
      );
      toast.error("Could not withdraw application", {
        description:
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Unknown error",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteApplication(id);
      navigate("/landingpage", {
        state: {
          banner: {
            type: "deleted",
            message: `Application ${id} has been deleted successfully.`,
          },
        },
      });
    } catch (err) {
      console.error(
        "[API] deleteApplication failed",
        err?.response?.data || err,
      );
      toast.error("Could not delete application", {
        description:
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Unknown error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getReadableDocumentLabel = (docType) => {
    if (!docType) return "Document";
    return String(docType)
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleReuploadFileChange = async (doc, file) => {
    const documentId = doc.document_id;

    if (!file) {
      setReuploadFiles((prev) => ({
        ...prev,
        [documentId]: null,
      }));
      setReuploadErrors((prev) => ({
        ...prev,
        [documentId]: "",
      }));
      setReuploadValidationByDocId((prev) => ({
        ...prev,
        [documentId]: null,
      }));
      return;
    }

    setReuploadFiles((prev) => ({
      ...prev,
      [documentId]: file,
    }));
    setReuploadErrors((prev) => ({
      ...prev,
      [documentId]: "",
    }));
    setReuploadValidationByDocId((prev) => ({
      ...prev,
      [documentId]: null,
    }));

    try {
      setCheckingReuploadByDocId((prev) => ({
        ...prev,
        [documentId]: true,
      }));

      const expectedDocType = doc.mismatch_detail?.document_type;

      const result = await classifyAndExtractApi(file, expectedDocType);

      const uploadValidation = result?.upload_validation || {};
      const status = uploadValidation?.status || "FAIL";
      const reasons = Array.isArray(uploadValidation?.reasons)
        ? uploadValidation.reasons
        : [];

      setReuploadValidationByDocId((prev) => ({
        ...prev,
        [documentId]: result,
      }));

      if (status === "FAIL") {
        setReuploadFiles((prev) => ({
          ...prev,
          [documentId]: null,
        }));

        setReuploadErrors((prev) => ({
          ...prev,
          [documentId]:
            reasons[0] || "Uploaded file failed document checking.",
        }));

        toast.error("Document check failed", {
          description: reasons[0] || "Please upload the correct document.",
        });

        return;
      }

      setReuploadErrors((prev) => ({
        ...prev,
        [documentId]: "",
      }));

      toast.success("Document checked successfully");
    } catch (err) {
      console.error("Reupload OCR check failed:", err);

      setReuploadFiles((prev) => ({
        ...prev,
        [documentId]: null,
      }));

      setReuploadErrors((prev) => ({
        ...prev,
        [documentId]:
          err?.response?.data?.detail ||
          err?.message ||
          "Could not check uploaded document.",
      }));

      toast.error("Could not check uploaded document", {
        description:
          err?.response?.data?.detail || err?.message || "Unknown error",
      });
    } finally {
      setCheckingReuploadByDocId((prev) => ({
        ...prev,
        [documentId]: false,
      }));
    }
  };

  const handleSubmitReuploadedDocuments = async () => {
    try {
      setIsSubmittingReupload(true);

      const missingUploads = mismatchDocumentDetails.filter(
        (doc) => !reuploadFiles[doc.document_id]
      );

      if (missingUploads.length > 0) {
        const nextErrors = {};
        missingUploads.forEach((doc) => {
          nextErrors[doc.document_id] = "Please upload this document.";
        });
        setReuploadErrors(nextErrors);
        return;
      }

      for (const doc of mismatchDocumentDetails) {
        await replaceDocument({
          documentId: doc.document_id,
          file: reuploadFiles[doc.document_id],
          extracted_data:
            reuploadValidationByDocId[doc.document_id] || {},
        });
      }

      await submitSmeApplicationApi({
        application_id: id,
      });

      navigate("/landingpage", {
        state: {
          banner: {
            type: "success",
            message:
              "You have successfully reuploaded the required documents and submitted your application.",
          },
        },
      });

    } catch (err) {
      console.error("Reupload submit error:", err);

      toast.error("Failed to submit documents", {
        description:
          err?.response?.data?.detail ||
          err?.message ||
          "Unknown error",
      });
    } finally {
      setIsSubmittingReupload(false);
    }
  };

  const handleResubmitSuccess = async () => {
    const refreshedApp = await fetchApplication(false);
    const appIdToUse = refreshedApp?.application_id || refreshedApp?.id || id;

    await Promise.all([
      fetchDocuments(),
      fetchQnA(appIdToUse),
      fetchAuditEntries(appIdToUse),
    ]);

    navigate("/landingpage", {
      state: {
        banner: {
          type: "success",
          message:
            "You have successfully uploaded the requested documents and submitted your application.",
        },
      },
    });
  };

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
        <Button onClick={() => navigate("/landingpage")}>Back to List</Button>
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
            onClick={() => navigate("/landingpage")}
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
                    {application?.business_name ||
                      formData?.businessName ||
                      "-"}
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
                      {missingDocsCount + missingQnsCount} item(s) pending your
                      action
                    </Badge>
                  )}
                </div>

                {pageBanner && (
                  <div
                    className={`mt-3 flex items-center rounded-lg border px-4 py-3 animate-fade-in ${
                      pageBanner.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    <p className="flex-1 text-sm font-medium">
                      {pageBanner.message}
                    </p>

                    <button
                      onClick={() => setPageBanner(null)}
                      className="ml-auto flex items-center pl-6 text-xs font-medium opacity-70 hover:underline hover:opacity-100"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>

            {currentStatus === "Draft" && (
              <div className="flex items-center justify-center">
                <Button onClick={() => navigate(`/application/edit/${id}/0`)}>
                  Open Draft
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 pb-20">
          {shouldShowDocumentWarning && (
            <Card className="border-red-500 bg-red-50">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">
                      Document Mismatch Detected
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {crossValidationReason}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                <TabsContent value="overview" className="mt-0 space-y-8">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          Business Information
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Core business, activity, and registered address
                          details submitted in the application.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5 space-y-6">
                      <div>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                          {Object.entries(step2Config?.fields || {})
                            .filter(([, fieldCfg]) => fieldCfg?.type !== "file")
                            .filter(
                              ([fieldKey]) => fieldKey !== "registeredAddress",
                            )
                            .map(([fieldKey, fieldCfg]) => (
                              <div key={fieldKey} className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-red-800">
                                  {fieldCfg?.label || prettifyKey(fieldKey)}
                                </p>
                                <p className="text-sm font-medium text-foreground break-words">
                                  {formatValue(
                                    getNestedValue(formData, fieldKey),
                                  )}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>

                      {businessRepeatableSections.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-semibold text-foreground">
                                Business Activity
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                Declared business activities for this
                                application.
                              </p>
                            </div>

                            {businessRepeatableSections.map(
                              ([sectionKey, sectionConfig]) => {
                                const rows = getBusinessActivityRows(
                                  sectionConfig,
                                  formData,
                                );

                                return (
                                  <div
                                    key={sectionKey}
                                    className="rounded-lg border border-border bg-muted/20 p-4"
                                  >
                                    <div className="mb-3 flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-foreground">
                                          {sectionConfig?.label ||
                                            prettifyKey(sectionKey)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {rows.length} record
                                          {rows.length === 1 ? "" : "s"}
                                        </p>
                                      </div>

                                      <Badge className="border bg-muted text-foreground">
                                        {rows.length}
                                      </Badge>
                                    </div>

                                    {rows.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">
                                        No business activity details provided.
                                      </p>
                                    ) : (
                                      <div className="space-y-3">
                                        {rows.map((row, idx) => (
                                          <div
                                            key={`${sectionKey}-${idx}`}
                                            className="rounded-lg bg-background p-4"
                                          >
                                            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                                              {Object.entries(
                                                sectionConfig?.fields || {},
                                              )
                                                .filter(
                                                  ([, fieldCfg]) =>
                                                    fieldCfg?.type !== "file",
                                                )
                                                .filter(
                                                  ([fieldKey]) =>
                                                    fieldKey !==
                                                    "conditionalFields",
                                                )
                                                .map(([fieldKey, fieldCfg]) => (
                                                  <div
                                                    key={fieldKey}
                                                    className="space-y-1"
                                                  >
                                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-red-800">
                                                      {fieldCfg?.label ||
                                                        prettifyKey(fieldKey)}
                                                    </p>
                                                    <p className="text-sm text-foreground break-words">
                                                      {formatValue(
                                                        row?.[fieldKey],
                                                      )}
                                                    </p>
                                                  </div>
                                                ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </>
                      )}

                      
                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">
                              Registered Address
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Official registered address of the business.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <p className="text-sm font-medium text-foreground">
                            {formData?.registeredAddress || "-"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {application?.business_country ||
                              formData?.country ||
                              "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                 
                  <section className="space-y-5">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          Individuals & Roles
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Individuals captured in the application, grouped by
                          role based on the selected entity type.
                        </p>
                      </div>
                    </div>

                    {individualRepeatableSections.map(
                      ([sectionKey, sectionConfig]) => {
                        const rows = getRepeatableSectionRows(
                          sectionKey,
                          sectionConfig,
                          formData,
                        );

                        return (
                          <div
                            key={sectionKey}
                            className="rounded-xl border border-border bg-card p-5"
                          >
                            <div className="mb-4 flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">
                                  {sectionConfig?.label ||
                                    prettifyKey(sectionKey)}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {rows.length} record
                                  {rows.length === 1 ? "" : "s"}
                                </p>
                              </div>

                              <Badge className="border bg-muted text-foreground">
                                {rows.length}
                              </Badge>
                            </div>

                            {rows.length === 0 ? (
                              <div className="rounded-lg border border-dashed border-border p-4">
                                <p className="text-sm text-muted-foreground">
                                  No details provided for this section.
                                </p>
                              </div>
                            ) : (
                              <Accordion
                                type="single"
                                collapsible
                                defaultValue={`${sectionKey}-0`}
                                className="w-full"
                              >
                                {rows.map((row, idx) => {
                                  const itemValue = `${sectionKey}-${idx}`;

                                  return (
                                    <AccordionItem
                                      key={itemValue}
                                      value={itemValue}
                                      className="border-border"
                                    >
                                      <AccordionTrigger className="py-3 hover:no-underline">
                                        <div className="flex items-center gap-3 text-left">
                                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                          </div>

                                          <div>
                                            <p className="text-sm font-semibold text-foreground">
                                              {row?.fullName ||
                                                row?.name ||
                                                `${sectionConfig?.label || "Individual"} ${idx + 1}`}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              
                                              • {row?.role || "-"}
                                            </p>
                                          </div>
                                        </div>
                                      </AccordionTrigger>

                                      <AccordionContent>
                                        <div className="rounded-lg bg-muted/30 p-4">
                                          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                                            {Object.entries(
                                              sectionConfig?.fields || {},
                                            )
                                              .filter(
                                                ([, fieldCfg]) =>
                                                  fieldCfg?.type !== "file",
                                              )
                                              .filter(
                                                ([fieldKey]) =>
                                                  fieldKey !== "kyc",
                                              )

                                              .map(([fieldKey, fieldCfg]) => (
                                                <div
                                                  key={fieldKey}
                                                  className="space-y-1"
                                                >
                                                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-red-800">
                                                    {fieldCfg?.label ||
                                                      prettifyKey(fieldKey)}
                                                  </p>
                                                  <p className="text-sm text-foreground break-words">
                                                    {formatValue(
                                                      row?.[fieldKey],
                                                    )}
                                                  </p>
                                                </div>
                                              ))}

                                            
                                          </div>
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  );
                                })}
                              </Accordion>
                            )}
                          </div>
                        );
                      },
                    )}
                  </section>
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
                                className="flex items-start justify-between rounded-lg border border-border p-3 gap-3"
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
                                  {doc.mismatch_detail && (
                                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                                      <div className="flex items-start gap-2">
                                        <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-semibold text-red-700">
                                            Reupload Required
                                          </p>
                                          <p className="mt-1 text-xs text-foreground">
                                            {doc.mismatch_detail.reason ||
                                              "This document contains a critical mismatch and must be reuploaded."}
                                          </p>

                                          {Array.isArray(doc.mismatch_detail.mismatch_fields) &&
                                            doc.mismatch_detail.mismatch_fields.length > 0 && (
                                              <div className="mt-2 space-y-1">
                                                {doc.mismatch_detail.mismatch_fields.map((field, idx) => (
                                                  <p key={idx} className="text-xs text-foreground">
                                                    <span className="font-medium">
                                                      {field.form_field || field.doc_field || "Field"}:
                                                    </span>{" "}
                                                    Form value:{" "}
                                                    <span className="font-mono">{field.form_value || "-"}</span>{" "}
                                                    | Document value:{" "}
                                                    <span className="font-mono">{field.doc_value || "-"}</span>
                                                  </p>
                                                ))}
                                              </div>
                                            )}

                                          <div className="mt-3">
                                            <ResubmitDocumentUploadField
                                              fieldName={`reupload-${doc.document_id}`}
                                              label={doc.document_type || "Document"}
                                              description=""
                                              file={reuploadFiles[doc.document_id] || null}
                                              onChange={(file) => handleReuploadFileChange(doc, file)}
                                              required={true}
                                              disabled={isSubmittingReupload}
                                              error={reuploadErrors[doc.document_id] || ""}
                                              helpText="Accepted formats: PDF, JPG, PNG. Max size: 5MB"
                                            />
                                            {checkingReuploadByDocId[doc.document_id] && (
                                              <Button
                                                type="button"
                                                variant="outline"
                                                disabled
                                                className="mt-2 w-fit gap-2"
                                              >
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Checking uploaded document...
                                              </Button>
                                            )}
                                            {!reuploadErrors[doc.document_id] &&
                                              ["PASS", "WARNING"].includes(
                                                reuploadValidationByDocId[doc.document_id]?.upload_validation?.status
                                              ) && (
                                                <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
                                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                                  <span>Document checked successfully.</span>
                                                </div>
                                              )}
                                          </div>

                                          {reuploadErrors[doc.document_id] && (
                                            <p className="mt-2 text-xs text-red-600">
                                              {reuploadErrors[doc.document_id]}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="ml-2 h-8 w-8 shrink-0 self-start"
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
                      
                      {initialDocuments.some((doc) => doc.mismatch_detail) && (
                        <div className="mt-4 flex flex-col items-end">
                          <Button
                            onClick={handleSubmitReuploadedDocuments}
                            disabled={!canSubmitReupload}
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Submit Reuploaded Documents
                          </Button>

                          {!allDocsUploaded && (
                            <p className="mt-2 text-xs text-red-600">
                              Please upload all required documents ({uploadedCount}/{mismatchDocumentDetails.length} uploaded).
                            </p>
                          )}
                        </div>
                      )}
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
                                        ? new Date(
                                            group.created_at,
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
                                  "Awaiting your submission"}
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
                                {q?.answer_text || "Awaiting your response"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        className="gap-2"
                        onClick={() => setResubmitOpen(true)}
                        disabled={alternativeDocsLoading}
                      >
                        <Upload className="h-4 w-4" />
                        Upload Documents
                      </Button>
                    </div>

                    {alternativeDocsLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          Please wait while we prepare alternative document
                          suggestions to help you complete your submission...
                        </span>
                      </div>
                    )}

                    {alternativeDocsError && (
                      <p className="text-sm text-amber-600">
                        Could not load suggested alternative documents. You can
                        still continue with the original upload flow.
                      </p>
                    )}
                  </TabsContent>
                )}
              </CardContent>
            </Tabs>
          </Card>

          {canWithdraw && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <p className="mb-3 text-sm text-muted-foreground">
                  If you no longer wish to proceed, you may withdraw this
                  application.
                </p>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full gap-2 bg-violet-500/10 text-destructive hover:bg-destructive/5 hover:text-destructive"
                      disabled={isWithdrawing}
                    >
                      <Undo2 className="h-4 w-4" />
                      {isWithdrawing
                        ? "Withdrawing..."
                        : "Withdraw Application"}
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will withdraw your application for{" "}
                        <strong>
                          {application?.business_name ||
                            formData?.businessName ||
                            "-"}
                        </strong>
                        . This action cannot be undone and you would need to
                        start a new application.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isWithdrawing}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-violet-500/10 text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleWithdraw}
                        disabled={isWithdrawing}
                      >
                        Withdraw
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}

          {canDelete && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <p className="mb-3 text-sm text-muted-foreground">
                  If this draft application is no longer needed, you may delete
                  it.
                </p>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full gap-2 bg-red-500 text-white hover:bg-destructive/5 hover:text-destructive"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? "Deleting..." : "Delete Application"}
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Application?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your draft application for{" "}
                        <strong>
                          {application?.business_name ||
                            formData?.businessName ||
                            "-"}
                        </strong>
                        . This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-500/10 text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </div>

        <ResubmitDialog
          open={resubmitOpen}
          onOpenChange={setResubmitOpen}
          applicationId={id}
          email={user?.email}
          firstName={user?.first_name}
          actionRequired={actionReason}
          requiredDocuments={requiredDocsWithAlternatives}
          requiredQuestions={requiredQns}
          onSuccess={handleResubmitSuccess}
        />
      </main>
    </div>
  );
}
