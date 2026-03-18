import React, { useRef, useState, useEffect, useMemo } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

/**
 * FileUploadField
 * Fully Redux-controlled file upload
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
  placeholderText = "",
  disabled = false,
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // const actualFile = file instanceof File ? file : file?.file;
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

  // useEffect(() => {
  //   if (!file) {
  //     setPreviewUrl(null);
  //     return;
  //   }

  //   // Redux may store { file, progress }
  //   const actualFile = file instanceof File ? file : file?.file;

  //   if (!(actualFile instanceof File)) {
  //     setPreviewUrl(null);
  //     return;
  //   }

  //   const url = URL.createObjectURL(actualFile);
  //   setPreviewUrl(url);

  //   return () => URL.revokeObjectURL(url);
  // }, [file]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const actualFile = file instanceof File ? file : file?.file;

    if (actualFile instanceof File) {
      const url = URL.createObjectURL(actualFile);
      setPreviewUrl(url);

      return () => URL.revokeObjectURL(url);
    }

    // backend-loaded uploaded document has no browser File object
    setPreviewUrl(null);
  }, [file]);

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const validateAndSend = (selectedFile) => {
    if (!selectedFile) {
      onChange(null); // report null if no file
      return;
    }

    if (selectedFile.size > maxSize) {
      onChange(null);
      return;
    }

    const mime = (selectedFile.type || "").toLowerCase();
    const name = (selectedFile.name || "").toLowerCase();
    const isPdfByExt = name.endsWith(".pdf");
    const acceptsPdf = allowedTypes.includes("application/pdf");

    let ok = allowedTypes.includes(mime);
    if (!ok && acceptsPdf && isPdfByExt) ok = true;

    if (!ok) {
      onChange(null);
      return;
    }

    onChange(selectedFile); // only send file to parent
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    validateAndSend(selectedFile);
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

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    validateAndSend(droppedFile);
  };

  const handlePreview = (e) => {
    e.stopPropagation();
    if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  const isUploading = uploadProgress > 0 && uploadProgress < 100;

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          disabled || isUploading
            ? "opacity-60 cursor-not-allowed"
            : "cursor-pointer"
        } ${isDragging ? "border-gray-500 bg-gray-100" : "border-gray-300 hover:border-gray-400 bg-gray-50"}`}
      >
        <input
          ref={inputRef}
          type="file"
          id={fieldName}
          onChange={handleFileChange}
          accept={acceptTypes}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {file ? (
          <div className="text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">
              {/* {file.name} */}
              {/* {actualFile?.name} */}
              {actualFile?.name ||
                existingUploadedFile?.original_filename ||
                "Uploaded file"}
            </p>

            {placeholderText && !isUploading && (
              <p className="text-xs text-gray-400 mt-1">{placeholderText}</p>
            )}

            <p className="text-xs text-gray-500 mt-1">
              {/* {formatFileSize(file.size)} */}
              {/* {formatFileSize(actualFile?.size)} */}

              {actualFile?.size
                ? formatFileSize(actualFile.size)
                : existingUploadedFile?.mime_type || "Previously uploaded"}
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
    </div>
  );
};

export default FileUploadField;
