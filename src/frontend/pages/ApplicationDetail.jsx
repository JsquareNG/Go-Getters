// ApplicationDetail.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  Upload,
  User,
  MapPin,
  Mail,
  Phone,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui";

import { getApplicationByAppId, getMissingItems } from "./../api/applicationApi";
import { allDocuments, downloadDocuments } from "./../api/documentApi";
import { userInfo } from "./../api/usersApi";

// ✅ Your ResubmitDialog
import { ResubmitDialog } from "../components/ui/features/ResubmitDialog";

export default function ApplicationDetail() {
  const { id } = useParams(); // application_id
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState(null);

  // ✅ missing items from /applications/getRequired/{application_id}
  const [missing, setMissing] = useState(null);
  const [missingLoading, setMissingLoading] = useState(false);

  // ✅ this controls the ResubmitDialog
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [user, setUser] = useState(null);

  // the userInfo
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

  // --- Fetch application ---
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

  // --- Fetch documents for this application ---
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

  const currentStatus = application?.current_status || "Not started";

  // --- Fetch missing items (getRequired) ---
  useEffect(() => {
    const fetchMissing = async () => {
      if (!id) return;

      try {
        setMissingLoading(true);
        const data = await getMissingItems(id);
        setMissing(data);
      } catch (err) {
        console.error("Error fetching missing items:", err);
        setMissing(null);
      } finally {
        setMissingLoading(false);
      }
    };

    fetchMissing();
  }, [id, currentStatus]);

  const requiredDocs = Array.isArray(missing?.required_documents)
    ? missing.required_documents
    : [];
  const requiredQns = Array.isArray(missing?.required_questions)
    ? missing.required_questions
    : [];

  const missingDocsCount = requiredDocs.length;
  const missingQnsCount = requiredQns.length;
  const hasMissing = missingDocsCount > 0 || missingQnsCount > 0;

  // ✅ IMPORTANT: reason often lives in missing.reason (ActionRequest), not application.reason
  const actionReason = missing?.reason || application?.reason || "";
  const showActionRequired = currentStatus === "Requires Action";

  const formattedDate = application?.last_edited
    ? new Date(application.last_edited).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "-";

  const directors = useMemo(() => {
    const arr = application?.form_data?.directors;
    return Array.isArray(arr) ? arr : [];
  }, [application]);

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
      console.error("Download error:", e?.response?.status, e?.response?.data || e);
      toast.error("Could not open document", {
        description: e?.response?.data?.detail || e?.message || "Unknown error",
      });
    }
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
        <p className="text-red-500 font-medium">
          {error || "Application not found."}
        </p>
        <Button onClick={() => navigate("/landingpage")}>Back to List</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8 animate-fade-in">
        <Button
          variant="ghost"
          onClick={() => navigate("/landingpage")}
          className="mb-6 -ml-2 text-slate-600 hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Button>

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <Building2 className="h-7 w-7 text-slate-600" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">
                {application.business_name}
              </h1>
              <p className="text-slate-600 mb-2">Corporate Account</p>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={currentStatus} />
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Calendar className="h-4 w-4" />
                  Last updated: {formattedDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Action Required (shows whenever status is Requires Action) */}
        {showActionRequired && (
          <Card className="mb-6 border-rose-600/30 bg-rose-600/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-rose-600 text-lg">
                <AlertCircle className="h-5 w-5" />
                Action Required
              </CardTitle>
            </CardHeader>

            <CardContent>
              {missingLoading ? (
                <p className="text-xs text-muted-foreground mb-4">
                  Loading missing items...
                </p>
              ) : hasMissing ? (
                <div className="mb-4 rounded-md bg-secondary/40 p-3">
                  <p className="text-sm font-medium text-foreground">
                    Items to resubmit
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {missingDocsCount} document{missingDocsCount === 1 ? "" : "s"} and{" "}
                    {missingQnsCount} question{missingQnsCount === 1 ? "" : "s"} requested.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button className="gap-2" onClick={() => setResubmitOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Upload Documents
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MAIN 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  Business Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Registration Number
                    </p>
                    <p className="font-medium text-foreground">
                      {application.business_registration_number || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Business Name</p>
                    <p className="font-medium text-foreground">
                      {application.business_name || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Incorporation Date
                    </p>
                    <p className="font-medium text-foreground">
                      {application.incorporationDate || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Business Type</p>
                    <p className="font-medium text-foreground">
                      {application.business_type || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium text-foreground">
                      {application.industry || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Employee Count
                    </p>
                    <p className="font-medium text-foreground">
                      {application.employeeCount || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Annual Revenue
                    </p>
                    <p className="font-medium text-foreground">
                      {application.annualRevenue || "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Directors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  Directors ({directors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {directors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No directors provided.
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
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-3 text-left">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {d?.fullName || `Director ${idx + 1}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {d?.idNumber || "-"}
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-11 pt-1">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Email</p>
                                  <p className="font-medium text-foreground">
                                    {d?.email || "-"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Phone</p>
                                  <p className="font-medium text-foreground">
                                    {d?.phone || "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>

            {/* Registered Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  Registered Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-foreground">
                  Street: {application.street || "-"}
                </p>
                <p className="text-muted-foreground">
                  City and Postal Code: {application.city || "-"},{" "}
                  {application.postalCode || "-"}
                </p>
                Country:{" "}
                <p className="text-muted-foreground">
                  {application.business_country || "-"}
                </p>
              </CardContent>
            </Card>

            {/* Account Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Account Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Initial Deposit</p>
                    <p className="font-medium text-foreground">
                      {application.initialDeposit || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Expected Monthly Volume
                    </p>
                    <p className="font-medium text-foreground">
                      {application.expectedMonthlyVolume || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Currencies Required</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Services Requested</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Documents
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {docsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading documents...</p>
                ) : docsError ? (
                  <p className="text-sm text-red-500">{docsError}</p>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No documents uploaded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={
                          doc.document_id ||
                          doc.id ||
                          `${doc.document_type}-${doc.created_at}`
                        }
                        className="relative flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {doc.document_type || "Document"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.created_at
                              ? `Uploaded: ${new Date(doc.created_at).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          className="relative z-50 h-8 w-8 p-0 pointer-events-auto"
                          type="button"
                          title="Download"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDownload(doc);
                          }}
                          aria-label="Download"
                        >
                          <Download className="h-4 w-4 pointer-events-none" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Review Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Review Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    "To Get Started",
                    "Basic Information",
                    "Financial Details",
                    "Compliance",
                    "Manual Review",
                  ].map((label, idx) => (
                    <div className="flex gap-3" key={label}>
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            idx < 4 ? "bg-green-500" : "bg-amber-500"
                          }`}
                        />
                        {idx < 4 && <div className="flex-1 w-px bg-gray-500" />}
                      </div>
                      <div className={idx < 4 ? "pb-4" : ""}>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Resubmit dialog */}
        <ResubmitDialog
          open={resubmitOpen}
          onOpenChange={setResubmitOpen}
          applicationId={id}
          email={user?.email}
          firstName={user?.first_name}
          actionRequired={actionReason}
          requiredDocuments={requiredDocs}
          requiredQuestions={requiredQns}
        />
      </main>
    </div>
  );
}