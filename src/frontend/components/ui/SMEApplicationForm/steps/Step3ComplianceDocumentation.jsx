import React, { useMemo } from "react";
import FileUploadField from "../components/FileUploadField";
import FormFieldGroup from "../components/FormFieldGroup";
import SINGAPORE_CONFIG from "../config/singaporeConfig";

/**
 * Step3ComplianceDocumentation component
 * Handles document uploads and additional compliance fields
 */
const Step3ComplianceDocumentation = ({
  data,
  documents,
  errors,
  touched,
  onDocumentChange,
  onFieldChange,
  disabled = false,
}) => {
  // ---- Grab the step4 configuration for the current business type ----
  const { complianceFieldsConfig, requiredDocuments } = useMemo(() => {
    const entity = SINGAPORE_CONFIG.entities[data?.businessType] || {};
    const step4 = entity.steps?.find((s) => s.id === "step4") || {};

    // Fields
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

  const handleDocumentChange = (fieldName, file, error = "") => {
    onDocumentChange(fieldName, file, error);
  };

  //TODO: this validation logic is getting complex, consider moving to a separate hook or utility file
  const fireField = (name, value) => {
    if (!onFieldChange) return;
    // all compliance inputs are stored under a nested object; we always
    // replace the whole object using the generic setter so that the
    // reducer (which only understands flat keys) can update state.
    const existing = data?.complianceFields || {};
    if (name.includes(".")) {
      // support dotted path (e.g. "pepDeclaration.country")
      const [top, sub] = name.split(".");
      const topObj = { ...(existing[top] || {}) };
      topObj[sub] = value;
      onFieldChange("complianceFields", { ...existing, [top]: topObj });
    } else {
      onFieldChange("complianceFields", { ...existing, [name]: value });
    }
  };

  // ---- Render conditional fields for checkboxes like PEP, Sanctions ----
  const renderConditionalFields = (fieldKey, fieldValue) => {
    const fieldConfig = complianceFieldsConfig[fieldKey];
    if (!fieldConfig || !fieldConfig.conditionalFields) return null;

    const selectedOption = fieldValue;
    const conditional = fieldConfig.conditionalFields[selectedOption];
    if (!conditional) return null;

    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        {Object.entries(conditional).map(([condKey, condCfg]) => (
          <FormFieldGroup
            key={`${fieldKey}_${condKey}`}
            fieldName={`${fieldKey}.${condKey}`}
            label={condCfg.label}
            value={data?.complianceFields?.[fieldKey]?.[condKey] || ""}
            onChange={(name, value) => {
              fireField(`${fieldKey}.${condKey}`, value);
            }}
            error={errors?.[fieldKey]?.[condKey]}
            touched={touched?.[fieldKey]?.[condKey]}
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
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Compliance & Documentation
      </h2>

      {/* Additional Compliance Fields */}
      {Object.entries(complianceFieldsConfig).map(([fieldKey, fieldCfg]) => {
        if (fieldCfg.type === "checkbox") {
          // render checkbox options
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
              {/* Render conditional fields if any */}
              {renderConditionalFields(
                fieldKey,
                data?.complianceFields?.[fieldKey],
              )}
            </div>
          );
        }

        // check if this is a nested object field group (like taxResidency)
        if (
          typeof fieldCfg === "object" &&
          !fieldCfg.type &&
          !fieldCfg.label &&
          Object.values(fieldCfg).some((v) => v.type)
        ) {
          // render nested fields (e.g., taxResidency.country, taxResidency.tin)
          return (
            <div key={fieldKey} className="mb-6">
              <p className="font-semibold text-gray-900 mb-4">
                {fieldKey.replace(/([A-Z])/g, " $1").trim()}
              </p>
              {Object.entries(fieldCfg).map(([subKey, subCfg]) => (
                <FormFieldGroup
                  key={`${fieldKey}_${subKey}`}
                  fieldName={`${fieldKey}.${subKey}`}
                  label={subCfg.label}
                  value={data?.complianceFields?.[fieldKey]?.[subKey] || ""}
                  onChange={(name, value) =>
                    fireField(`${fieldKey}.${subKey}`, value)
                  }
                  error={errors?.[fieldKey]?.[subKey]}
                  touched={touched?.[fieldKey]?.[subKey]}
                  required={subCfg.required}
                  type={subCfg.type || "text"}
                  disabled={disabled}
                />
              ))}
            </div>
          );
        }

        // normal flat fields
        return (
          <FormFieldGroup
            key={fieldKey}
            fieldName={fieldKey}
            label={fieldCfg.label}
            value={data?.complianceFields?.[fieldKey] || ""}
            onChange={(name, value) => fireField(fieldKey, value)}
            error={errors?.[fieldKey]}
            touched={touched?.[fieldKey]}
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

      {/* Dynamic Upload Fields */}
      {Object.entries(requiredDocuments).map(([fieldName, doc]) => (
        <FileUploadField
          key={fieldName}
          fieldName={fieldName}
          label={doc.label}
          file={documents?.[fieldName] || null}
          onChange={handleDocumentChange}
          error={errors?.[fieldName]}
          touched={touched?.[fieldName]}
          required
          acceptTypes="application/pdf,image/jpeg,image/png"
          maxSize={5242880}
          uploadProgress={documents?.[fieldName]?.progress}
          disabled={disabled}
        />
      ))}

      {/* Compliance Note */}
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
