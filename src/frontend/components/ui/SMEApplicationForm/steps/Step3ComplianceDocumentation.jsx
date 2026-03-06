import React, { useMemo } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import FileUploadField from "../components/FileUploadField";
import SINGAPORE_CONFIG from "../config/singaporeConfig";

/**
 * Step3ComplianceDocumentation component
 * Fully Redux-driven via parent onFieldChange
 */
const Step3ComplianceDocumentation = ({
  data,
  onFieldChange,
  disabled = false,
}) => {
  // ---- dynamic field config from Singapore config ----
  const { complianceFieldsConfig, requiredDocuments } = useMemo(() => {
    const entity = SINGAPORE_CONFIG.entities[data?.businessType] || {};
    const step4 = entity.steps?.find((s) => s.id === "step4") || {};

    // Compliance fields
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

  // ---- Helper for nested fields ----
  const handleFieldChange = (name, value) => {
    onFieldChange(name, value);
  };

  // ---- Handle document upload ----
  // const handleDocumentChange = (fieldName, file) => {
  //   // Ensure documents object exists
  //   const updatedDocs = {
  //     ...data.documents,
  //     [fieldName]: file ? { file, progress: 0 } : null,
  //   };
  //   handleFieldChange("documents", updatedDocs);
  // };
  const handleDocumentChange = (fieldName, file) => {
    handleFieldChange(`documents.${fieldName}`, { file, progress: 0 });
  };

  const handleRadioChange = (fieldKey, value) => {
    // Ensure complianceFields[fieldKey] exists
    if (!data.complianceFields?.[fieldKey]) {
      handleFieldChange(`complianceFields.${fieldKey}`, {});
    }

    handleFieldChange(`complianceFields.${fieldKey}`, value);
  };

  // ---- Conditional fields ----
  const renderConditionalFields = (fieldKey, fieldValue) => {
    const fieldConfig = complianceFieldsConfig[fieldKey];
    if (!fieldConfig?.conditionalFields) return null;

    const conditional = fieldConfig.conditionalFields[fieldValue];
    if (!conditional) return null;

    return (
      <div className="mt-4 p-4 rounded-lg border border-gray-200">
        {Object.entries(conditional).map(([condKey, condCfg]) => (
          <FormFieldGroup
            key={`${fieldKey}_${condKey}`}
            fieldName={`complianceFields.${fieldKey}.${condKey}`}
            label={condCfg.label}
            value={data?.complianceFields?.[fieldKey]?.[condKey] || ""}
            onChange={handleFieldChange}
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

      {/* Compliance Fields */}
      {Object.entries(complianceFieldsConfig).map(([fieldKey, fieldCfg]) => {
        // Checkbox with options
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
                    // checked={data?.complianceFields?.[fieldKey] === opt}
                    checked={
                      data?.complianceFields?.[fieldKey]?.selected === opt
                    }
                    // onChange={(e) =>
                    //   handleFieldChange(
                    //     `complianceFields.${fieldKey}`,
                    //     e.target.value,
                    //   )
                    // }
                    onChange={(e) =>
                      handleFieldChange(
                        `complianceFields.${fieldKey}.selected`,
                        e.target.value,
                      )
                    }
                    disabled={disabled}
                  />
                  <span className="ml-2">{opt}</span>
                </label>
              ))}
              {/* {renderConditionalFields(
                fieldKey,
                data?.complianceFields?.[fieldKey],
              )} */}
              {renderConditionalFields(fieldKey, data?.complianceFields?.[fieldKey]?.selected)}
            </div>
          );
        }

        // Nested objects (like taxResidency)
        if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label) {
          return (
            <div key={fieldKey} className="mb-6">
              <p className="font-semibold text-gray-900 mb-4">
                {fieldKey.replace(/([A-Z])/g, " $1").trim()}
              </p>
              {Object.entries(fieldCfg).map(([subKey, subCfg]) => (
                <FormFieldGroup
                  key={`${fieldKey}_${subKey}`}
                  fieldName={`complianceFields.${fieldKey}.${subKey}`}
                  label={subCfg.label}
                  value={data?.complianceFields?.[fieldKey]?.[subKey] || ""}
                  onChange={handleFieldChange}
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
            fieldName={`complianceFields.${fieldKey}`}
            label={fieldCfg.label}
            value={data?.complianceFields?.[fieldKey] || ""}
            onChange={handleFieldChange}
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
          file={data?.documents?.[fieldName]?.file || null}
          onChange={(file) =>
            // handleFieldChange(`documents.${fieldName}`, { file, progress: 0 })
            handleDocumentChange(fieldName, file)
          }
          required
          acceptTypes="application/pdf,image/jpeg,image/png"
          maxSize={5242880}
          // uploadProgress={data?.documents?.[fieldName]?.progress || 0}
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
