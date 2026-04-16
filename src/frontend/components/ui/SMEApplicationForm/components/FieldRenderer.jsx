import React from "react";
import FormFieldGroup from "./FormFieldGroup";
import FileUploadField from "./FileUploadField";
import KYCVerificationCard from "./KYCVerificationCard";

/**
 * FieldRenderer
 * Handles:
 * - normal fields
 * - file fields (with optional OCR)
 * - KYC fields
 */
const FieldRenderer = ({
  fieldKey,
  fieldConfig,
  value,
  onChange,
  disabled = false,
  context = {},
}) => {
  const commonProps = {
    fieldName: fieldKey,
    label: fieldConfig.label,
    placeholder: fieldConfig.placeholder,
    value,
    onChange,
    required: fieldConfig.required,
    type: fieldConfig.type,
    disabled,
    helpText: fieldConfig.helpText || fieldConfig.helperText,
    options: fieldConfig.options || [],
  };

  const rowPrefix = context?.rowPrefix || "";
  const fullFieldPath = rowPrefix ? `${rowPrefix}.${fieldKey}` : fieldKey;
  const handleFieldChange = (name, value) => {
    if (!name || typeof name !== "string") return;
    onChange(name, value);
  };

  if (fieldConfig.type === "kyc") {
    const providerSessionField =
      fieldConfig.providerSessionField || "provider_session_id";

    const kycDataField = fieldConfig.kycDataField || fieldKey;

    const sourceData = context.rowData || context.data || {};
    const rowPrefix = context.rowPrefix || "";

    return (
      <KYCVerificationCard
        data={{
          ...sourceData,
          provider_session_id: sourceData?.[providerSessionField] ?? "",
          kycData: sourceData?.[kycDataField] ?? {},
        }}
        applicationId={context?.applicationId}
        disabled={disabled}
        onFieldChange={(key, val) => {
          if (key === "provider_session_id") {
            onChange(providerSessionField, val);
            return;
          }

          if (key === "kyc") {
            onChange(kycDataField, val);
            return;
          }

          onChange(key, val);
        }}
        onPersistKycResult={
          context?.onPersistKycResult
            ? (payload) =>
                context.onPersistKycResult({
                  ...payload,
                  providerSessionField,
                  kycDataField,
                  rowPrefix,
                })
            : undefined
        }
        onBeforeStartKyc={context?.onBeforeStartKyc}
      />
    );
  }

  if (fieldConfig.type === "file") {
    // // const hasLocalFile =
    // //   value instanceof File ||
    // //   value?.file instanceof File ||
    // //   value?.uploaded ||
    // //   value?.document_id;
    // const hasLocalFile =
    //   value instanceof File ||
    //   value?.file instanceof File ||
    //   value?.verificationStatus ||
    //   value?.verified !== undefined ||
    //   value?.original_filename;

    // const displayedFile = hasLocalFile
    //   ? value
    //   : context?.getDisplayedFileValue
    //     ? context.getDisplayedFileValue(fullFieldPath, fieldConfig)
    //     : value;
    const displayedFile = context?.getDisplayedFileValue
  ? context.getDisplayedFileValue(fullFieldPath, fieldConfig)
  : value;

    const verificationMeta = context?.getFieldVerificationMeta
      ? context.getFieldVerificationMeta(fullFieldPath, fieldConfig)
      : context?.verificationState?.[fullFieldPath] || null;

    const ocrMeta =
      context?.ocrState?.[fullFieldPath] || context?.ocrState?.[fieldKey] || {};

    return (
      <FileUploadField
        fieldName={fullFieldPath}
        label={fieldConfig.label}
        file={displayedFile}
        onChange={(nextValue) => handleFieldChange(fullFieldPath, nextValue)}
        required={fieldConfig.required}
        disabled={disabled}
        placeholder={fieldConfig.placeholder}
        helpText={fieldConfig.helpText || fieldConfig.helperText}
        acceptTypes="application/pdf,image/jpeg,image/png"
        maxSize={5242880}
        beforeAcceptFile={
          context?.beforeAcceptFile
            ? context.beforeAcceptFile(fullFieldPath, fieldConfig)
            : undefined
        }
        verificationMeta={verificationMeta}
        ocr={fieldConfig.ocr === true}
        ocrLoading={ocrMeta.loading || false}
        ocrStatus={ocrMeta.status || ""}
        ocrMessage={ocrMeta.message || ""}
      />
    );
  }

  return <FormFieldGroup {...commonProps} />;
};

export default FieldRenderer;
