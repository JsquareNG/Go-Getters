import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import FileUploadField from "../components/FileUploadField";
import FormFieldGroup from "../components/FormFieldGroup";
import SINGAPORE_CONFIG from "../config/singaporeConfig";
import { updateField } from "@/store/applicationFormSlice";

/**
 * Step3ComplianceDocumentation component
 * Handles document uploads and additional compliance fields (Redux version)
 */
const Step3ComplianceDocumentation = ({ disabled = false }) => {
  const dispatch = useDispatch();
  const data = useSelector((state) => state.applicationForm.formData);
  const documents = useSelector((state) => state.applicationForm.documents);

  // ---- Grab the step4 configuration for the current business type ----
  const { complianceFieldsConfig, requiredDocuments } = useMemo(() => {
    const entity = SINGAPORE_CONFIG.entities[data?.businessType] || {};
    const step4 = entity.steps?.find((s) => s.id === "step4") || {};

    const fields = step4.fields || {};

    // Map documents array to object with camelCase keys
    const docsObj = {};
    (step4.documents || []).forEach((doc) => {
      const key = doc
        .toLowerCase()
        .replace(/[^\w]+/g, " ")
        .trim()
        .replace(/\s+/g, "_");
      docsObj[key] = { label: doc };
    });

    return { complianceFieldsConfig: fields, requiredDocuments: docsObj };
  }, [data?.businessType]);

  // ---- Redux field update ---- need to handle nested fields for conditional logic
  const fireField = (name, value) => {
    const existing = data?.complianceFields || {};
    if (name.includes(".")) {
      const [top, sub] = name.split(".");
      const topObj = { ...(existing[top] || {}) };
      topObj[sub] = value;
      dispatch(updateField({ field: "complianceFields", value: { ...existing, [top]: topObj } }));
    } else {
      dispatch(updateField({ field: "complianceFields", value: { ...existing, [name]: value } }));
    }
  };

  // ---- Redux document update ----
  const handleDocumentChange = (fieldName, file, error = "") => {
    dispatch(updateField({ field: `documents.${fieldName}`, value: { file, error, progress: 0 } }));
  };

  // ---- Conditional fields helper ----
  const renderConditionalFields = (fieldKey, fieldValue) => {
    const fieldConfig = complianceFieldsConfig[fieldKey];
    if (!fieldConfig?.conditionalFields) return null;

    const conditional = fieldConfig.conditionalFields[fieldValue];
    if (!conditional) return null;

    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        {Object.entries(conditional).map(([condKey, condCfg]) => (
          <FormFieldGroup
            key={`${fieldKey}_${condKey}`}
            fieldName={`${fieldKey}.${condKey}`}
            label={condCfg.label}
            value={data?.complianceFields?.[fieldKey]?.[condKey] || ""}
            onChange={(name, value) => fireField(`${fieldKey}.${condKey}`, value)}
            required={condCfg.required}
            type={condCfg.type || "text"}
            disabled={disabled}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Compliance & Documentation</h2>

      {/* Additional Compliance Fields */}
      {Object.entries(complianceFieldsConfig).map(([fieldKey, fieldCfg]) => {
        if (fieldCfg.type === "checkbox") {
          return (
            <div key={fieldKey} className="mb-6">
              <p className="font-semibold text-gray-900">{fieldCfg.label}</p>
              {fieldCfg.options.map((opt) => (
                <label key={opt} className="inline-flex items-center mr-4">
                  <input
                    type="radio"
                    name={fieldKey}
                    value={opt}
                    checked={data?.complianceFields?.[fieldKey] === opt}
                    onChange={(e) => fireField(fieldKey, e.target.value)}
                    disabled={disabled}
                  />
                  <span className="ml-2">{opt}</span>
                </label>
              ))}
              {renderConditionalFields(fieldKey, data?.complianceFields?.[fieldKey])}
            </div>
          );
        }

        // Nested field groups (e.g., taxResidency)
        if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label && Object.values(fieldCfg).some((v) => v.type)) {
          return (
            <div key={fieldKey} className="mb-6">
              <p className="font-semibold text-gray-900 mb-4">{fieldKey.replace(/([A-Z])/g, " $1").trim()}</p>
              {Object.entries(fieldCfg).map(([subKey, subCfg]) => (
                <FormFieldGroup
                  key={`${fieldKey}_${subKey}`}
                  fieldName={`${fieldKey}.${subKey}`}
                  label={subCfg.label}
                  value={data?.complianceFields?.[fieldKey]?.[subKey] || ""}
                  onChange={(name, value) => fireField(`${fieldKey}.${subKey}`, value)}
                  required={subCfg.required}
                  type={subCfg.type || "text"}
                  disabled={disabled}
                />
              ))}
            </div>
          );
        }

        // Normal flat fields
        return (
          <FormFieldGroup
            key={fieldKey}
            fieldName={fieldKey}
            label={fieldCfg.label}
            value={data?.complianceFields?.[fieldKey] || ""}
            onChange={(name, value) => fireField(fieldKey, value)}
            required={fieldCfg.required}
            type={fieldCfg.type || "text"}
            disabled={disabled}
          />
        );
      })}

      {/* Required Documents */}
      <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800 mb-2">
          <strong>Required Documents:</strong>
        </p>
        <ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
          {Object.entries(requiredDocuments).map(([key, doc]) => (
            <li key={key}>{doc.label}</li>
          ))}
        </ul>
      </div>

      {Object.entries(requiredDocuments).map(([fieldName, doc]) => (
        <FileUploadField
          key={fieldName}
          fieldName={fieldName}
          label={doc.label}
          file={documents?.[fieldName]?.file || null}
          onChange={handleDocumentChange}
          required
          acceptTypes="application/pdf,image/jpeg,image/png"
          maxSize={5242880}
          uploadProgress={documents?.[fieldName]?.progress || 0}
          disabled={disabled}
        />
      ))}

      {/* Compliance Note */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          ✓ All documents and declarations will be reviewed by our compliance team within 2-3 business days.
        </p>
        <p className="text-sm text-blue-800 mt-2">
          ✓ We may request additional documents or clarifications if needed.
        </p>
      </div>
    </div>
  );
};

export default Step3ComplianceDocumentation;