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
      />
    );
  }

  if (fieldConfig.type === "file") {
    return (
      <FileUploadField
        fieldName={fieldKey}
        label={fieldConfig.label}
        file={value}
        onChange={(file) =>
          onChange(fieldKey, file ? { file, progress: 0 } : null)
        }
        required={fieldConfig.required}
        disabled={disabled}
        placeholder={fieldConfig.placeholder}
        helpText={fieldConfig.helpText || fieldConfig.helperText}
        ocr={fieldConfig.ocr === true}
        ocrLoading={context?.ocrState?.[fieldKey]?.loading || false}
        ocrStatus={context?.ocrState?.[fieldKey]?.status || ""}
        ocrMessage={context?.ocrState?.[fieldKey]?.message || ""}
      />
    );
  }

  return <FormFieldGroup {...commonProps} />;
};

export default FieldRenderer;
