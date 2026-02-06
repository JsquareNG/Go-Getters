import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Upload,
  ExternalLink,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Separator } from "../components/ui/separator";
import { getApplicationByAppId } from "./../api/applicationApi"; // Import the API function

const stepsByStatus = {
  "Not started": [
    { label: "Company Information", completed: false, current: true },
    { label: "Business Documentation", completed: false, current: false },
    { label: "Authorized Signatories", completed: false, current: false },
    { label: "Review & Submit", completed: false, current: false },
  ],
  "Draft": [
    { label: "Company Information", completed: true, current: false },
    { label: "Business Documentation", completed: true, current: false },
    { label: "Authorized Signatories", completed: false, current: true },
    { label: "Review & Submit", completed: false, current: false },
  ],
  "Submitted": [
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
    { label: "Additional Information Required", completed: false, current: true },
  ],
  "Approved": [
    { label: "Company Information", completed: true, current: false },
    { label: "Business Documentation", completed: true, current: false },
    { label: "Authorized Signatories", completed: true, current: false },
    { label: "Review & Submit", completed: true, current: false },
    { label: "Bank Review", completed: true, current: false },
    { label: "Account Activated", completed: true, current: false },
  ],
};

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State management for API data
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <p className="text-red-500 font-medium">{error || "Application not found."}</p>
        <Button onClick={() => navigate("/landingpage")}>Back to List</Button>
      </div>
    );
  }

  // Mapping your Payload keys to the component logic
  const currentStatus = application.current_status || "Not started";
  const steps = stepsByStatus[currentStatus] || [];
  const isEditable = ["Not started", "Draft", "Requires Action"].includes(currentStatus);
  
  // Format the last_edited date
  const formattedDate = new Date(application.last_edited).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

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

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <Building2 className="h-7 w-7 text-slate-600" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">
                {application.business_name} {/* Using business_name from payload */}
              </h1>
              <p className="text-slate-600 mb-2">Corporate Account</p>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={currentStatus} /> {/* Using current_status */}
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Calendar className="h-4 w-4" />
                  Last updated: {formattedDate}
                </span>
              </div>
            </div>
          </div>

          {isEditable && (
            <Button className="shrink-0">
              {currentStatus === "Not started" ? "Start Application" : "Continue Application"}
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Logic for "Requires Action" feedback */}
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

            <Card>
              <CardHeader><CardTitle className="text-lg">Application Progress</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.label} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                            step.completed ? "border-emerald-400 bg-emerald-400" :
                            step.current ? "border-primary bg-primary" : "border-muted bg-background"
                          }`}>
                          {step.completed ? <CheckCircle2 className="h-4 w-4 text-background" /> :
                           step.current ? <Clock className="h-4 w-4 text-primary-foreground" /> :
                           <span className="text-xs text-slate-600">{index + 1}</span>}
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`w-0.5 h-8 ${step.completed ? "bg-emerald-400" : "bg-border"}`} />
                        )}
                      </div>
                      <div className="pt-1">
                        <p className={`font-medium ${step.current ? "text-foreground" : "text-slate-600"}`}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Application Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Application ID</p>
                  <p className="font-mono text-sm">{application.application_id}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-slate-600 mb-1">Country</p>
                  <p className="text-sm">{application.business_country}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Last Edited</p>
                  <p className="text-sm">{formattedDate}</p>
                </div>
              </CardContent>
            </Card>
            {["Under Review", "Approved", "Requires Action"].includes(application.current_status) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Submitted Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Documents Submitted</p>
                    <div className="space-y-2">
                      {["Business Registration Certificate", "Directors' Resolution", "Proof of Address"].map((doc) => (
                        <div key={doc} className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/50">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-600" />
                            <span className="text-sm">{doc}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}