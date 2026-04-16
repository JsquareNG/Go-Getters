import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, FileText, Upload } from "lucide-react";

const ResubmitDocumentUploadField = ({
  fieldName,
  label,
  description = "",
  file = null,
  onChange,
  uploadProgress = 0,
  required = true,
  acceptTypes = "application/pdf,image/jpeg,image/png",
  maxSize = 5242880,
  helpText = "Accepted formats: PDF, JPG, PNG. Max size: 5MB",
  disabled = false,
  error = "",
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const allowedTypes = useMemo(
    () =>
      (acceptTypes || "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    [acceptTypes],
  );

  useEffect(() => {
    if (!(file instanceof File)) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const validateAndSend = (selectedFile) => {
    if (!selectedFile) {
      onChange(null);
      return;
    }

    if (selectedFile.size > maxSize) {
      onChange(null);
      return;
    }

    const mime = (selectedFile.type || "").toLowerCase();
    const name = (selectedFile.name || "").toLowerCase();
    const acceptsPdf = allowedTypes.includes("application/pdf");
    const isPdfByExt = name.endsWith(".pdf");

    let ok = allowedTypes.includes(mime);
    if (!ok && acceptsPdf && isPdfByExt) ok = true;

    if (!ok) {
      onChange(null);
      return;
    }

    onChange(selectedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    validateAndSend(selectedFile);
    e.target.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
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

    if (disabled) return;

    const droppedFile = e.dataTransfer?.files?.[0] || null;
    validateAndSend(droppedFile);
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handlePreview = (e) => {
    e.stopPropagation();
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  const isUploading = uploadProgress > 0 && uploadProgress < 100;

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-3">
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          disabled || isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${
          error
            ? "border-red-500"
            : isDragging
            ? "border-red-400 bg-red-50"
            : "border-border hover:border-red-300 hover:bg-muted/30"
        }`}
      >
        <input
          ref={inputRef}
          id={fieldName}
          type="file"
          accept={acceptTypes}
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />

        {file ? (
          <div className="text-center">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />

            <div className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="max-w-[260px] truncate text-sm font-medium text-foreground">
                {file.name}
              </p>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
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

            <p className="mt-2 text-xs text-gray-400">Click to change</p>

            {isUploading && (
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded bg-muted">
                  <div
                    className="h-2 bg-red-500"
                    style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {uploadProgress}%
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Click to upload</span>{" "}
              or drag and drop
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{helpText}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResubmitDocumentUploadField;