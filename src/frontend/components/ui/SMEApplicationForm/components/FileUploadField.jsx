import React, { useRef, useState, useEffect, useMemo } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

/**
 * FileUploadField
 * Handles file selection + optional async validation before file is accepted.
 * Parent decides what validation to run via beforeAcceptFile().
 * Included built-in validation for file type and size, as well as display of async verification status.
 * Also supports optional OCR status display if the uploaded file will be processed for autofill.
 */
const FileUploadField = ({
  fieldName,
  label,
  file,
  onChange,
  uploadProgress = 0,
  required = true,
  acceptTypes = "application/pdf,image/jpeg,image/png",
  maxSize = 5242880, // 5MB
  helpText = "Accepted formats: PDF, JPG, PNG. Max size: 5MB",
  placeholder = "",
  disabled = false,

  // optional async validation hook
  beforeAcceptFile,

  // shared verification state from parent
  verificationMeta = null,

  // optional OCR state display
  ocr = false,
  ocrLoading = false,
  ocrStatus = "",
  ocrMessage = "",
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [localError, setLocalError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const actualFile = file instanceof File ? file : file?.file || null;
  const existingUploadedFile =
    !actualFile && file?.original_filename ? file : null;

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

    const currentFile = file instanceof File ? file : file?.file;

    if (currentFile instanceof File) {
      const url = URL.createObjectURL(currentFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    setPreviewUrl(null);
  }, [file]);

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const validateBasicFileRules = (selectedFile) => {
    setLocalError("");

    if (!selectedFile) {
      onChange(null);
      return false;
    }

    if (selectedFile.size > maxSize) {
      setLocalError("File is too large. Maximum size is 5MB.");
      onChange(null);
      return false;
    }

    const mime = (selectedFile.type || "").toLowerCase();
    const name = (selectedFile.name || "").toLowerCase();
    const isPdfByExt = name.endsWith(".pdf");
    const acceptsPdf = allowedTypes.includes("application/pdf");

    let ok = allowedTypes.includes(mime);
    if (!ok && acceptsPdf && isPdfByExt) ok = true;

    if (!ok) {
      setLocalError("Invalid file type. Please upload PDF, JPG, or PNG.");
      onChange(null);
      return false;
    }

    return true;
  };

  const validateAndSend = async (selectedFile) => {
    if (!validateBasicFileRules(selectedFile)) return;

    try {
      setIsValidating(true);

      if (beforeAcceptFile) {
        const processedValue = await beforeAcceptFile(selectedFile);
        onChange(processedValue ?? null);
      } else {
        onChange(selectedFile);
      }
    } catch (err) {
      // Do NOT set localError here.
      // Async verification/classification errors should come from verificationMeta
      onChange(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    await validateAndSend(selectedFile);
    e.target.value = "";
  };

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

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    await validateAndSend(droppedFile);
  };

  const handlePreview = (e) => {
    e.stopPropagation();
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  const isUploading = uploadProgress > 0 && uploadProgress < 100;
  const isBusy = disabled || isUploading || isValidating;

  const effectiveVerificationMeta =
    verificationMeta ||
    (isValidating
      ? { status: "verifying", message: "Verifying document..." }
      : null);

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {placeholder && (
        <label className="block text-xs font-medium text-red-800 italic mb-1">
          {placeholder}
        </label>
      )}

      <div
        onClick={() => !isBusy && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isBusy ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        } ${
          isDragging
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
          disabled={isBusy}
        />

        {file ? (
          <div className="text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />

            <p className="text-sm font-medium text-gray-900">
              {actualFile?.name ||
                existingUploadedFile?.original_filename ||
                "Uploaded file"}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              {actualFile?.size
                ? formatFileSize(actualFile.size)
                : existingUploadedFile?.mime_type || "Previously uploaded"}
              {/* {actualFile?.size
                ? formatFileSize(actualFile.size)
                : existingUploadedFile?.mime_type || "Previously uploaded"} */}
            </p>

            {previewUrl && actualFile && (
              <button
                type="button"
                onClick={handlePreview}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                View file
              </button>
            )}

            <p className="text-xs text-gray-400 mt-2">Click to change</p>

            {isUploading && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                  <div
                    className="h-2 bg-green-500"
                    style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
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
              </span>{" "}
              or drag and drop
            </p>

            <p className="text-xs text-gray-500 mt-1">{helpText}</p>
          </div>
        )}
      </div>

      {localError && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span>{localError}</span>
          </div>
        </div>
      )}

      {effectiveVerificationMeta?.status === "verifying" && (
        <div className="mt-2 flex items-center gap-2 text-sm text-amber-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{effectiveVerificationMeta.message || "Verifying..."}</span>
        </div>
      )}

      {effectiveVerificationMeta?.status === "verified" && (
        <div className="mt-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span>
              {effectiveVerificationMeta.message ||
                "Document verified successfully."}
            </span>
          </div>

          {effectiveVerificationMeta.detectedType && (
            <p className="mt-1 text-xs text-green-700">
              Detected type:{" "}
              <span className="font-medium">
                {effectiveVerificationMeta.detectedType}
              </span>
            </p>
          )}
        </div>
      )}

      {effectiveVerificationMeta?.status === "failed" && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span>
              {effectiveVerificationMeta.message ||
                "Document verification failed."}
            </span>
          </div>

          {effectiveVerificationMeta.expectedType && (
            <p className="mt-1 text-xs text-red-700">
              Expected type:{" "}
              <span className="font-medium">
                {effectiveVerificationMeta.expectedType}
              </span>
            </p>
          )}

          {effectiveVerificationMeta.detectedType && (
            <p className="mt-1 text-xs text-red-700">
              Detected type:{" "}
              <span className="font-medium">
                {effectiveVerificationMeta.detectedType}
              </span>
            </p>
          )}
        </div>
      )}

      {ocr && (
        <div className="mt-2">
          {ocrLoading && (
            <div className="flex items-start gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{ocrMessage || "Processing document and autofilling fields..."}</p>
            </div>
          )}

          {!ocrLoading && ocrStatus === "completed" && (
            <div className="flex items-start gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{ocrMessage || "Autofill completed. Please review."}</p>
            </div>
          )}

          {!ocrLoading && ocrStatus === "failed" && (
            <div className="flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{ocrMessage || "OCR failed."}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploadField;