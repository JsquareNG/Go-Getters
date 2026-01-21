import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";;
import { RiskBadge } from "../components/ui/RiskBadge";
import { StatusBadge } from "../components/ui/StatusBadge";
import { DocumentItem } from "../components/ui/documentItem";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { mockApplicationsReview } from "../data/mockData";
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  FileText,
  History,
} from "lucide-react";
import { format, parseISO, differenceInHours } from "date-fns";
import { toast } from "sonner";

const ApplicationReviewDetail = () => {
  const { id } = useParams(); // ✅ removed TS generic
  const navigate = useNavigate();

  const application = mockApplicationsReview.find((app) => app.id === id);

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showResubmitDialog, setShowResubmitDialog] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]); // ✅ removed <string[]>
  const [rejectionReason, setRejectionReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  if (!application) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Application not found
            </h2>
            <p className="text-muted-foreground mb-4">
              The application you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate("/staff-landingpage")}>Back to Applications</Button>
          </div>
        </main>
      </div>
    );
  }

  const hoursUntilSLA = differenceInHours(parseISO(application.slaDeadline), new Date());
  const isOverdue = hoursUntilSLA <= 0;

  const handleViewDocument = (doc) => {
    toast.info(`Viewing ${doc.name}`, { description: "Document viewer would open here" });
  };

  const handleAddNote = (doc) => {
    toast.info(`Adding note to ${doc.name}`, { description: "Note dialog would open here" });
  };

  const handleApprove = () => {
    toast.success("Application Approved", {
      description: `${application.customerName}'s application has been approved.`,
    });
    setShowApproveDialog(false);
    navigate("/");
  };

  const handleReject = () => {
    toast.error("Application Rejected", {
      description: `${application.customerName}'s application has been rejected.`,
    });
    setShowRejectDialog(false);
    navigate("/");
  };

  const handleRequestResubmission = () => {
    toast.success("Resubmission Requested", {
      description: `Request sent to ${application.customerName} for document resubmission.`,
    });
    setShowResubmitDialog(false);
    navigate("/");
  };

  const toggleDocSelection = (docId) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((x) => x !== docId) : [...prev, docId]
    );
  };

  return (
    <div className="min-h-screen bg-background">

      <main className="container mx-auto px-6 py-12">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/staff-landingpage")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </div>

        {/* Application Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-muted-foreground">{application.id}</span>
              <RiskBadge level={application.riskLevel} />
              <StatusBadge status={application.status} />
            </div>
            <h1 className="text-3xl font-bold text-foreground">{application.customerName}</h1>
            {application.businessName && (
              <p className="text-lg text-muted-foreground flex items-center gap-2 mt-1">
                <Building2 className="h-5 w-5" />
                {application.businessName}
              </p>
            )}
          </div>

          {/* SLA Timer */}
          <div
            className={`p-4 rounded-lg border ${
              isOverdue
                ? "bg-risk-critical/10 border-risk-critical/20"
                : "bg-secondary"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className={`h-4 w-4 ${isOverdue ? "text-risk-critical" : "text-muted-foreground"}`} />
              <span className={`text-sm font-medium ${isOverdue ? "text-risk-critical" : "text-muted-foreground"}`}>
                SLA Deadline
              </span>
            </div>
            <p className={`text-2xl font-bold ${isOverdue ? "text-risk-critical" : "text-foreground"}`}>
              {isOverdue ? "OVERDUE" : `${hoursUntilSLA}h remaining`}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(application.slaDeadline), "PPP p")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{application.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{application.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Submitted {format(parseISO(application.submissionDate), "PPP")}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Product</p>
                  <p className="font-medium">{application.productType}</p>
                </div>
              </CardContent>
            </Card>

            {/* Risk Flags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-risk-high" />
                  Risk Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {application.riskReasons.map((reason, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm p-2 bg-risk-high/5 border border-risk-high/10 rounded-md"
                    >
                      <AlertTriangle className="h-4 w-4 text-risk-high mt-0.5 shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {application.timeline.map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-accent" />
                        {index < application.timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">{event.action}</p>
                        {event.details && (
                          <p className="text-xs text-muted-foreground">{event.details}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(event.timestamp), "PPP p")}
                          {event.user && ` • ${event.user}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Documents ({application.documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {application.documents.map((doc) => (
                  <DocumentItem
                    key={doc.id}
                    document={doc}
                    onView={handleViewDocument}
                    onAddNote={handleAddNote}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Action Bar */}
            <Card className="bottom-4 shadow-lg border-2">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    className="flex-1 bg-status-success hover:bg-status-success/90 text-status-success-foreground"
                    onClick={() => setShowApproveDialog(true)}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Approve Application
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 border-status-warning text-status-warning hover:bg-status-warning/10"
                    onClick={() => setShowResubmitDialog(true)}
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Request Resubmission
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 border-status-error text-status-error hover:bg-status-error/10"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Reject Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {application.customerName}'s application for{" "}
              {application.productType}?
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-status-success/10 border border-status-success/20 rounded-lg">
            <p className="text-sm text-status-success font-medium">
              This action will mark the application as approved and notify the customer.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-status-success hover:bg-status-success/90" onClick={handleApprove}>
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {application.customerName}'s application?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rejection Reason</label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="failed_verification">Failed identity verification</SelectItem>
                  <SelectItem value="aml_concerns">AML/Compliance concerns</SelectItem>
                  <SelectItem value="incomplete_docs">Incomplete documentation</SelectItem>
                  <SelectItem value="credit_risk">Unacceptable credit risk</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Additional Notes</label>
              <Textarea
                placeholder="Provide additional context for the rejection..."
                className="mt-1.5"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resubmission Dialog */}
      <Dialog open={showResubmitDialog} onOpenChange={setShowResubmitDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Document Resubmission</DialogTitle>
            <DialogDescription>
              Select the documents that need to be resubmitted and provide feedback.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Documents</label>
              <div className="space-y-2">
                {application.documents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <Checkbox
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={() => toggleDocSelection(doc.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.type}</p>
                    </div>
                    <StatusBadge status={doc.status} type="document" />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Reason for Resubmission</label>
              <Select>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poor_quality">Poor image quality</SelectItem>
                  <SelectItem value="expired">Document expired</SelectItem>
                  <SelectItem value="incomplete">Incomplete/partial document</SelectItem>
                  <SelectItem value="mismatch">Information mismatch</SelectItem>
                  <SelectItem value="wrong_type">Wrong document type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Instructions for Customer</label>
              <Textarea
                placeholder="Explain what the customer needs to correct or resubmit..."
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestResubmission} disabled={selectedDocs.length === 0}>
              Send Request ({selectedDocs.length} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationReviewDetail;
