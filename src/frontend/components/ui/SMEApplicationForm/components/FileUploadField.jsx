import React, { useMemo, useRef, useState, useEffect } from "react";
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
  console.log("FileUploadField:", fieldName, { error, touched });
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const [previewUrl, setPreviewUrl] = useState(null);

  const hasError = error && touched;
  // const hasError = Boolean(error);

  const allowedTypes = useMemo(
    () =>
      (acceptTypes || "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    [acceptTypes],
  );

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handlePreview = (e) => {
    e.stopPropagation(); // prevents opening file picker
    if (!previewUrl) return;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const validateAndSend = (selectedFile) => {
    if (!selectedFile) return;

    // Validate file size
    if (selectedFile.size > maxSize) {
      onChange(fieldName, null, `File size exceeds ${formatFileSize(maxSize)}`);
      return;
    }

    // Validate file type (robust for PDFs)
    const mime = (selectedFile.type || "").toLowerCase();
    const name = (selectedFile.name || "").toLowerCase();
    const isPdfByExt = name.endsWith(".pdf");

    const acceptsPdf = allowedTypes.includes("application/pdf");

    let ok = allowedTypes.includes(mime);

    // If browser reports weird mime (e.g. octet-stream), allow pdf by extension
    if (!ok && acceptsPdf && isPdfByExt) ok = true;

    if (!ok) {
      onChange(
        fieldName,
        null,
        `File type not accepted. Allowed: ${acceptTypes}`,
      );
      return;
    }

    onChange(fieldName, selectedFile, "");
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    validateAndSend(selectedFile);

    // allow re-selecting the same file again
    e.target.value = "";
  };

  // const handleFileChange = (e) => {
  //   const selectedFile = e.target.files?.[0];
  //   if (selectedFile) {
  //     // Validate file size
  //     if (selectedFile.size > maxSize) {
  //       onChange(
  //         fieldName,
  //         null,
  //         `File size exceeds ${formatFileSize(maxSize)}`,
  //       );
  //       return;
  //     }

  //     // Validate file type
  //     const allowedTypes = acceptTypes.split(",");
  //     if (!allowedTypes.includes(selectedFile.type)) {
  //       onChange(
  //         fieldName,
  //         null,
  //         `File type not accepted. Allowed: ${acceptTypes}`,
  //       );
  //       return;
  //     }

  //     onChange(fieldName, selectedFile, "");
  //   }
  // };

  // drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    validateAndSend(droppedFile);
  };

  const disabled =
    typeof uploadProgress === "number" && uploadProgress >= 0 && uploadProgress < 100;

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          hasError
            ? "border-red-500 bg-red-50"
            : "border-gray-300 hover:border-gray-400 bg-gray-50"
        }`}
      > */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        } ${
          hasError
            ? "border-red-500 bg-red-50"
            : isDragging
              ? "border-gray-500 bg-gray-100"
              : "border-gray-300 hover:border-gray-400 bg-gray-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          id={fieldName}
          onChange={handleFileChange}
          accept={acceptTypes}
          className="hidden"
          disabled={disabled}
        />
        <label
          htmlFor={fieldName}
          className="cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
        {/* <label htmlFor={fieldName} className="cursor-pointer"> */}
          {file ? (
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(file.size)}
              </p>

              {previewUrl && (
                <button
                  type="button"
                  onClick={handlePreview}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  View file
                </button>
              )}

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
