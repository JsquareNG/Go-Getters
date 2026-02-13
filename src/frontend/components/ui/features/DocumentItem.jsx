import { Button, StatusBadge } from "../primitives";
import { Eye, Download, MessageSquare, FileText } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

const DocumentItem = ({ document, onView, onAddNote }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-card border rounded-lg hover:shadow-card transition-shadow">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-secondary rounded-lg">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground">{document.name}</h4>
            <StatusBadge status={document.status} type="document" />
          </div>

          <p className="text-sm text-muted-foreground">
            {document.type} • Uploaded{" "}
            {formatDistanceToNow(parseISO(document.uploadedAt), {
              addSuffix: true,
            })}
          </p>

          {document.reviewNotes && (
            <p className="text-sm text-status-warning mt-1 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {document.reviewNotes}
            </p>
          )}

          {document.rejectionReason && (
            <p className="text-sm text-status-error mt-1">
              Reason: {document.rejectionReason}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onView(document)}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>

        <Button variant="ghost" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>

        <Button variant="ghost" size="sm" onClick={() => onAddNote(document)}>
          <MessageSquare className="h-4 w-4 mr-1" />
          Note
        </Button>
      </div>
    </div>
  );
};

export { DocumentItem };
