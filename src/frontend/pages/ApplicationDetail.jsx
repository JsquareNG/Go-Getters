import React from "react";
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
import { mockApplications } from "../data/mockApplications";
import { Separator } from "../components/ui/separator";

const stepsByStatus = {
  "Not started": [
    { label: "Company Information", completed: false, current: true },
    { label: "Business Documentation", completed: false, current: false },
    { label: "Authorized Signatories", completed: false, current: false },
    { label: "Review & Submit", completed: false, current: false },
  ],
  "In Progress": [
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
    { label: "Additional Information Required", completed: false, current: true },
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
  const { id } = useParams();
  const navigate = useNavigate();

  const application = mockApplications.find((app) => app.id === id);

  if (!application) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/landingpage")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applications
          </Button>
          <p className="text-slate-600">Application not found.</p>
        </main>
      </div>
    );
  }

  const steps = stepsByStatus[application.status] || [];
  const isEditable = ["Not started", "In Progress", "Requires Action"].includes(
    application.status
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8 animate-fade-in">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/landingpage")}
          className="mb-6 -ml-2 text-slate-600 hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Button>

        {/* Application Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <Building2 className="h-7 w-7 text-slate-600" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">
                {application.companyName}
              </h1>
              <p className="text-slate-600 mb-2">
                {application.accountType}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={application.status} />
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Calendar className="h-4 w-4" />
                  {application.lastUpdated}
                </span>
              </div>
            </div>
          </div>

          {isEditable && (
            <Button className="shrink-0">
              {application.status === "Not started"
                ? "Start Application"
                : "Continue Application"}
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Action Required Card */}
            {application.status === "Requires Action" &&
              application.actionRequired && (
                <Card className="border-rose-500/30 bg-rose-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-rose-500 text-lg">
                      <AlertCircle className="h-5 w-5" />
                      Action Required
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground mb-4">
                      {application.actionRequired}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Documents
                      </Button>
                      <Button variant="outline">View Feedback Details</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Application Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Application Progress</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.label} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                            step.completed
                              ? "border-emerald-400 bg-emerald-400"
                              : step.current
                              ? "border-primary bg-primary"
                              : "border-muted bg-background"
                          }`}
                        >
                          {step.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-background" />
                          ) : step.current ? (
                            <Clock className="h-4 w-4 text-primary-foreground" />
                          ) : (
                            <span className="text-xs text-slate-600">
                              {index + 1}
                            </span>
                          )}
                        </div>

                        {index < steps.length - 1 && (
                          <div
                            className={`w-0.5 h-8 ${
                              step.completed ? "bg-emerald-400" : "bg-border"
                            }`}
                          />
                        )}
                      </div>

                      <div className="pt-1">
                        <p
                          className={`font-medium ${
                            step.current
                              ? "text-foreground"
                              : "text-slate-600"
                          }`}
                        >
                          {step.label}
                        </p>

                        {step.current && (
                          <p className="text-sm text-slate-600 mt-0.5">
                            {application.status === "Under Review" ||
                            application.status === "Submitted"
                              ? "Your application is being reviewed by our team"
                              : "Currently in progress"}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Submitted Information */}
            {["Submitted", "Under Review", "Approved", "Requires Action"].includes(
              application.status
            ) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Submitted Information</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        Company Name
                      </p>
                      <p className="font-medium">{application.companyName}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        Account Type
                      </p>
                      <p className="font-medium">{application.accountType}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        Registration Number
                      </p>
                      <p className="font-medium">202400123A</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        Country of Incorporation
                      </p>
                      <p className="font-medium">Singapore</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-slate-600 mb-2">
                      Documents Submitted
                    </p>

                    <div className="space-y-2">
                      {[
                        "Business Registration Certificate",
                        "Directors' Resolution",
                        "Proof of Address",
                      ].map((doc) => (
                        <div
                          key={doc}
                          className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/50"
                        >
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

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Application Details</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">
                    Application ID
                  </p>
                  <p className="font-mono text-sm">
                    {application.id.toUpperCase()}
                  </p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-slate-600 mb-1">Created</p>
                  <p className="text-sm">January 10, 2026</p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 mb-1">
                    Last Updated
                  </p>
                  <p className="text-sm">
                    {application.lastUpdated
                      .replace("Updated ", "")
                      .replace("Submitted ", "")}
                  </p>
                </div>

                {application.status === "Approved" && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        Account Number
                      </p>
                      <p className="font-mono text-sm">0123-456789-01-3</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-3">
                    Need assistance with your application?
                  </p>
                  <Button variant="outline" className="w-full">
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
