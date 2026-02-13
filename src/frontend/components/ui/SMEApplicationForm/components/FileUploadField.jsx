import React from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

/**
 * FileUploadField component
 * Custom file upload with validation and preview
 */
const FileUploadField = ({
  fieldName,
  label,
  file,
  onChange,
  error,
  touched,
  uploadProgress, // optional 0-100
  required = true,
  acceptTypes = "application/pdf,image/jpeg,image/png",
  maxSize = 5242880, // 5MB in bytes
  helpText = "Accepted formats: PDF, JPG, PNG. Max size: 5MB",
}) => {
  const hasError = error && touched;
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size
      if (selectedFile.size > maxSize) {
        onChange(
          fieldName,
          null,
          `File size exceeds ${formatFileSize(maxSize)}`,
        );
        return;
      }

      // Validate file type
      const allowedTypes = acceptTypes.split(",");
      if (!allowedTypes.includes(selectedFile.type)) {
        onChange(
          fieldName,
          null,
          `File type not accepted. Allowed: ${acceptTypes}`,
        );
        return;
      }

      onChange(fieldName, selectedFile, "");
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          hasError
            ? "border-red-500 bg-red-50"
            : "border-gray-300 hover:border-gray-400 bg-gray-50"
        }`}
      >
        <input
          type="file"
          id={fieldName}
          onChange={handleFileChange}
          accept={acceptTypes}
          className="hidden"
          disabled={uploadProgress >= 0 && uploadProgress < 100}
        />

        <label htmlFor={fieldName} className="cursor-pointer">
          {file ? (
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(file.size)}
              </p>
              <p className="text-xs text-gray-400 mt-2">Click to change</p>

              {typeof uploadProgress === "number" && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                    <div
                      className="h-2 bg-green-500"
                      style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <svg
                className="mx-auto h-8 w-8 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v28a4 4 0 004 4h24a4 4 0 004-4V20m-16-12v16m-8-8l8 8 8-8"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium text-primary cursor-pointer">
                  Click to upload
                </span>
                {" or drag and drop"}
              </p>
              <p className="text-xs text-gray-500 mt-1">{helpText}</p>
            </div>
          )}
        </label>
      </div>

      {hasError && (
        <div className="text-red-500 text-sm mt-2 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUploadField;
