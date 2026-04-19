import React from "react";
import { AlertCircle } from "lucide-react";

const ReadOnlyFormWrapper = ({ children, isReadOnly, applicationStatus }) => {
  if (!isReadOnly) {
    return children;
  }

  return (
    <div className="relative">
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900">Application Submitted</h3>
          <p className="text-sm text-blue-800 mt-1">
            This application has been submitted and is under review. You cannot
            modify the form.
            {applicationStatus && (
              <span className="block mt-1">
                <strong>Current Status:</strong> {applicationStatus}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="opacity-75 pointer-events-none">{children}</div>
    </div>
  );
};

export default ReadOnlyFormWrapper;
