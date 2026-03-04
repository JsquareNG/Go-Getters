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
import { getApplicationByAppId } from "./../api/applicationApi";
import { allDocuments, downloadDocuments } from "./../api/documentApi";

const stepsByStatus = {
  "Not started": [
    { label: "Company Information", completed: false, current: true },
    { label: "Business Documentation", completed: false, current: false },
    { label: "Authorized Signatories", completed: false, current: false },
    { label: "Review & Submit", completed: false, current: false },
  ],
  Draft: [
    { label: "Company Information", completed: true, current: false },
    { label: "Business Documentation", completed: true, current: false },
    { label: "Authorized Signatories", completed: false, current: true },
    { label: "Review & Submit", completed: false, current: false },
  ],
  Submitted: [
    { label: "Company Information", completed: true, current: false },
    { label: "Business Documentation", completed: true, current: false },
    { label: "Authorized Signatories", completed: true, current: false },
    { label: "Review & Submit", completed: true, current: false },
    { label: "Bank Review", completed: false, current: true },
  ],
  "Under Review": [
    { label: "Company Information", completed: true, current: false },
    { label: "Business Documentation", completed: true, current: false },
    { label: "Authorized Signatories", completed: true, current: false },
    { label: "Review & Submit", completed: true, current: false },
    { label: "Bank Review", completed: false, current: true },
  ],
  "Requires Action": [
    { label: "Company Information", completed: true, current: false },
    { label: "Business Documentation", completed: true, current: false },
    { label: "Authorized Signatories", completed: true, current: false },
    { label: "Review & Submit", completed: true, current: false },
    {
      label: "Additional Information Required",
      completed: false,
      current: true,
    },
  ],
  Approved: [
    { label: "Company Information", completed: true, current: false },
    { label: "Business Documentation", completed: true, current: false },
    { label: "Authorized Signatories", completed: true, current: false },
    { label: "Review & Submit", completed: true, current: false },
    { label: "Bank Review", completed: true, current: false },
    { label: "Account Activated", completed: true, current: false },
  ],
};

export default function ApplicationDetail() {
  const { id } = useParams(); // application_id
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState(null);

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

        const docs = await allDocuments(id); // should return docs for this application
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

  const currentStatus = application?.current_status || "Not started"; //"Draft", "Submitted", "Under Review", "Requires Action", "Approved"

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

  /**
   * Download handler (works with your backend)
   * Backend: GET /documents/download-url/{document_id}
   * Returns: { url: "https://..." }
   *
   * IMPORTANT:
   * Your backend queries Document.document_id, so we must pass doc.document_id (NOT doc.id).
   *
   * Also opens a blank tab immediately to avoid popup blockers.
   */
  const handleDownload = async (doc) => {
    const newTab = window.open("", "_blank"); // open immediately on click to avoid popup blocking

    try {
      const documentId = doc?.document_id; // matches backend
      if (!documentId) {
        if (newTab) newTab.close();
        toast.error("Missing document_id");
        console.log("Doc object missing document_id:", doc);
        return;
      }

      const res = await downloadDocuments(documentId);
      const signedUrl = res?.url; // backend returns { url }

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

          {/* To continue with draft application */}
          {currentStatus === "Draft" && (
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                onClick={() => navigate(`/applications/form/${id}/edit`)}
                className="text-sm"
              >
                Open Draft
              </Button>
            </div>
          )}
        </div>

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
                    <p className="text-sm text-muted-foreground">
                      Business Name
                    </p>
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
                    <p className="text-sm text-muted-foreground">
                      Business Type
                    </p>
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
                                  <p className="text-sm text-muted-foreground">
                                    Email
                                  </p>
                                  <p className="font-medium text-foreground">
                                    {d?.email || "-"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Phone
                                  </p>
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
                    <p className="text-sm text-muted-foreground">
                      Initial Deposit
                    </p>
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
                    <p className="text-sm text-muted-foreground">
                      Currencies Required
                    </p>
                    {/* add badges here when you have currencies array */}
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Services Requested
                    </p>
                    {/* add badges here when you have services array */}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requires Action feedback */}
            {currentStatus === "Requires Action" && application.reason && (
              <Card className="border-rose-500/30 bg-rose-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-rose-500 text-lg">
                    <AlertCircle className="h-5 w-5" />
                    Action Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground mb-4">{application.reason}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button className="gap-2">
                      <Upload className="h-4 w-4" /> Upload Documents
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
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

                        {/* Click-safe download button */}
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
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div className="flex-1 w-px bg-gray-500" />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-foreground">
                        To Get Started
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div className="flex-1 w-px bg-gray-500" />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-foreground">
                        Basic Information
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div className="flex-1 w-px bg-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Financial Details
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div className="flex-1 w-px bg-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Compliance
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <div className="flex-1 w-px bg-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Manual Review
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
