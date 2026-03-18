import React, { useEffect, useMemo, useState } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import FileUploadField from "../components/FileUploadField";
import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";
import { allDocuments } from "@/api/documentApi";

const Step3ComplianceDocumentation = ({
  data,
  onFieldChange,
  disabled = false,
  applicationId,
}) => {
  const CONFIG_MAP = {
    Singapore: SINGAPORE_CONFIG,
    Indonesia: INDONESIA_CONFIG,
  };

  const activeConfig = CONFIG_MAP[data?.country] || SINGAPORE_CONFIG;

  const [existingDocuments, setExistingDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const step4Fields = useMemo(() => {
    const entity = activeConfig.entities?.[data?.businessType] || {};
    const step4 = entity.steps?.find((s) => s.id === "step4") || {};
    return step4.fields || {};
  }, [activeConfig, data?.businessType]);

  useEffect(() => {
    if (!applicationId) return;

    const fetchDocuments = async () => {
      try {
        setLoadingDocuments(true);
        const docs = await allDocuments(applicationId);
        console.log(docs);
        setExistingDocuments(Array.isArray(docs) ? docs : []);
      } catch (err) {
        console.error("Failed to fetch existing documents:", err);
        setExistingDocuments([]);
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [applicationId]);

  const existingDocumentMap = useMemo(() => {
    return existingDocuments.reduce((acc, doc) => {
      acc[doc.document_type] = doc;
      return acc;
    }, {});
  }, [existingDocuments]);

  const getNestedValue = (obj, path) => {
    if (!obj || !path) return undefined;

    return path.split(".").reduce((acc, key) => {
      if (acc == null) return undefined;
      const isIndex = !Number.isNaN(Number(key));
      return isIndex ? acc[Number(key)] : acc[key];
    }, obj);
  };

  const getDisplayedFileValue = (fieldPath) => {
    const localValue =
      getNestedValue(data?.formData || {}, fieldPath) ??
      getNestedValue(data, fieldPath) ??
      null;
    console.log("local", localValue);

    // Prefer local unsaved file/value first
    // if (localValue) return localValue;
    const hasLocalFile =
      localValue &&
      (localValue instanceof File || localValue?.file instanceof File);

    if (hasLocalFile) return localValue;

    // Fallback to backend existing uploaded document
    const existingDoc = existingDocumentMap[fieldPath];
    console.log("e", existingDoc);

    if (!existingDoc) return null;

    return {
      uploaded: true,
      document_id: existingDoc.document_id,
      document_type: existingDoc.document_type,
      original_filename: existingDoc.original_filename,
      storage_path: existingDoc.storage_path,
      mime_type: existingDoc.mime_type,
      status: existingDoc.status,
      created_at: existingDoc.created_at,
    };
  };

  const handleFieldChange = (name, value) => {
    if (!name || typeof name !== "string") {
      console.error("Invalid field name:", name);
      return;
    }

    onFieldChange(name, value);
  };

  const handleDocumentChange = (fieldPath, file) => {
    if (!fieldPath) {
      console.error("Invalid document field:", fieldPath);
      return;
    }

    handleFieldChange(fieldPath, file ? { file, progress: 0 } : null);
  };

  const renderField = (fieldKey, fieldCfg, parentPath = "") => {
    const fullPath = parentPath ? `${parentPath}.${fieldKey}` : fieldKey;
    const value =
      getNestedValue(data?.formData || {}, fullPath) ??
      getNestedValue(data, fullPath) ??
      null;

    if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label) {
      return (
        <div key={fullPath} className="mb-6">
          <p className="font-semibold text-gray-900 mb-2">
            {fieldKey.replace(/([A-Z])/g, " $1").trim()}
          </p>

          {Object.entries(fieldCfg).map(([subKey, subCfg]) =>
            renderField(subKey, subCfg, fullPath),
          )}
        </div>
      );
    }

    if (fieldCfg.type === "file") {
      return (
        <FileUploadField
          key={fullPath}
          fieldName={fullPath}
          label={fieldCfg.label}
          file={getDisplayedFileValue(fullPath)}
          onChange={(file) => handleDocumentChange(fullPath, file)}
          required={fieldCfg.required || false}
          acceptTypes="application/pdf,image/jpeg,image/png"
          placeholder={fieldCfg.placeholder || ""}
          maxSize={5242880}
          disabled={disabled}
        />
      );
    }

    if (fieldCfg.type === "select") {
      return (
        <div key={fullPath} className="mb-6">
          <FormFieldGroup
            fieldName={fullPath}
            label={fieldCfg.label}
            placeholder={fieldCfg.placeholder || ""}
            value={value ?? ""}
            onChange={onFieldChange}
            type="select"
            options={fieldCfg.options || []}
            required={fieldCfg.required || false}
            disabled={disabled}
          />

          {fieldCfg.conditionalFields &&
            value &&
            Object.entries(fieldCfg.conditionalFields[value] || {}).map(
              ([condKey, condCfg]) => renderField(condKey, condCfg, parentPath),
            )}
        </div>
      );
    }

    return (
      <FormFieldGroup
        key={fullPath}
        fieldName={fullPath}
        label={fieldCfg.label}
        placeholder={fieldCfg.placeholder || ""}
        value={value ?? ""}
        onChange={onFieldChange}
        required={fieldCfg.required || false}
        type={fieldCfg.type || "text"}
        options={fieldCfg.options || []}
        disabled={disabled}
      />
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Documentation</h2>

      {loadingDocuments && (
        <p className="mb-4 text-sm text-gray-500">
          Loading uploaded documents...
        </p>
      )}

      {Object.entries(step4Fields).map(([key, cfg]) => renderField(key, cfg))}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          ✓ All documents and declarations will be reviewed by our compliance
          team within 2-3 business days.
        </p>
        <p className="text-sm text-blue-800 mt-2">
          ✓ We may request additional documents or clarifications if needed.
        </p>
      </div>
    </div>
  );
};

export default Step3ComplianceDocumentation;
