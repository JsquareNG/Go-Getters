import React, { useMemo } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import FileUploadField from "../components/FileUploadField";
import { generateDocKey } from "../utils/formHelpers";
import SINGAPORE_CONFIG from "../config/singaporeConfig";
import SINGAPORE_CONFIG2 from "../config/updatedSingaporeConfig";

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
    const entity = SINGAPORE_CONFIG2.entities[data?.businessType] || {};
    const step4 = entity.steps?.find((s) => s.id === "step4") || {};

    // Compliance fields
    const fields = step4.fields || {};

    // Map documents array to object with camelCase keys
    const docsObj = {};
    (step4.documents || []).forEach((doc) => {
      const key = generateDocKey(doc);
      docsObj[key] = { label: doc };
    });

    return { complianceFieldsConfig: fields, requiredDocuments: docsObj };
  }, [data?.businessType]);

  // ---- Helper for nested fields ----
  // const handleFieldChange = (name, value) => {
  //   onFieldChange(name, value);
  // };
  const handleFieldChange = (name, value) => {
    if (!name || typeof name !== "string") {
      console.error("Invalid field name:", name);
      return;
    }

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
  // const handleDocumentChange = (fieldName, file) => {
  //   handleFieldChange(`documents.${fieldName}`, { file, progress: 0 });
  // };

  // const handleDocumentChange = (fieldName, file) => {
  //   if (!fieldName) {
  //     console.error("Invalid document field:", fieldName);
  //     return;
  //   }

  //   handleFieldChange(`documents.${fieldName}`, {
  //     file,
  //     progress: 0,
  //   });
  // };

   const handleDocumentChange = (fieldPath, file) => {
    if (!fieldPath) {
      console.error("Invalid document field:", fieldPath);
      return;
    }

    handleFieldChange(fieldPath, {
      file,
      progress: 0,
    });
  };

  // ---- recursive field renderer ----
  const renderField = (fieldKey, fieldCfg, parentKey = null) => {
    const fullKey = parentKey ? `${parentKey}.${fieldKey}` : fieldKey;
    const value = parentKey
      ? data?.complianceFields?.[parentKey]?.[fieldKey]
      : data?.complianceFields?.[fieldKey];

    // Nested object (no type/label)
    if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label) {
      return (
        <div key={fullKey} className="mb-6">
          <p className="font-semibold text-gray-900 mb-2">
            {fieldKey.replace(/([A-Z])/g, " $1").trim()}
          </p>
          {Object.entries(fieldCfg).map(([subKey, subCfg]) =>
            renderField(subKey, subCfg, fullKey),
          )}
        </div>
      );
    }

    // File field
    if (fieldCfg.type === "file") {
      return (
        <FileUploadField
          key={fullKey}
          fieldName={fullKey}
          label={fieldCfg.label}
          // file={value?.file || null}
          file={data?.[fullKey] || null} // <- must match your Redux structure
          // onChange={(file) => handleDocumentChange(fieldKey, file)}
          onChange={(file) => handleDocumentChange(fullKey, file)}
          required={fieldCfg.required || false}
          acceptTypes="application/pdf,image/jpeg,image/png"
          placeholder={fieldCfg.placeholder || ""}
          maxSize={5242880}
          disabled={disabled}
        />
      );
    }

    // Select/radio with conditional fields
    if (fieldCfg.type === "select") {
      const selected = value?.selected || "";
      return (
        <div key={fullKey} className="mb-6">
          <p className="font-semibold text-gray-900">{fieldCfg.label}</p>
          {fieldCfg.options.map((opt) => (
            <label key={opt} className="inline-flex items-center mr-4">
              <input
                type="radio"
                name={fullKey}
                value={opt}
                checked={selected === opt}
                onChange={(e) =>
                  onFieldChange(`${fullKey}.selected`, e.target.value)
                }
                disabled={disabled}
              />
              <span className="ml-2">{opt}</span>
            </label>
          ))}

          {fieldCfg.conditionalFields?.[selected] &&
            Object.entries(fieldCfg.conditionalFields[selected]).map(
              ([condKey, condCfg]) => renderField(condKey, condCfg, fullKey),
            )}
        </div>
      );
    }

    // Normal flat field
    return (
      <FormFieldGroup
        key={fullKey}
        fieldName={fullKey}
        label={fieldCfg.label}
        placeholder={fieldCfg.placeholder || ""}
        value={value || ""}
        onChange={onFieldChange}
        required={fieldCfg.required || false}
        type={fieldCfg.type || "text"}
        disabled={disabled}
      />
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Compliance & Documentation
      </h2>

      {/* Compliance Fields */}
      {/* {Object.entries(complianceFieldsConfig).map(([fieldKey, fieldCfg]) => {
        if (fieldCfg.type === "select") {
          return (
            <div key={fieldKey} className="mb-6">
              <p className="font-semibold text-gray-900">{fieldCfg.label}</p>
              {fieldCfg.options.map((opt) => (
                <label key={opt} className="inline-flex items-center mr-4">
                  <input
                    type="radio"
                    name={fieldKey}
                    value={opt}
                    checked={
                      data?.complianceFields?.[fieldKey]?.selected === opt
                    }
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
              {renderConditionalFields(
                fieldKey,
                data?.complianceFields?.[fieldKey]?.selected,
              )}
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
      })} */}

      {/* Required Documents */}
      {/* <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800 mb-2">
          <strong>Required Documents:</strong>
        </p>
        <ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
          {Object.entries(requiredDocuments).map(([key, doc]) => (
            <li key={key}>{doc.label}</li>
          ))}
        </ul>
      </div> */}

      {/* {Object.entries(requiredDocuments).map(([fieldName, doc]) => (
        <FileUploadField
          key={fieldName}
          fieldName={fieldName}
          label={doc.label}
          file={data?.documents?.[fieldName]?.file || null}
          onChange={(file) => handleDocumentChange(fieldName, file)}
          required
          acceptTypes="application/pdf,image/jpeg,image/png"
          placeholderText={doc.placeholder || ""}
          maxSize={5242880}
          disabled={disabled}
        />
      ))} */}
      {/* Render compliance fields */}
      {Object.entries(complianceFieldsConfig).map(([key, cfg]) =>
        renderField(key, cfg),
      )}

      {/* Required Documents List */}
      {/* <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800 mb-2">
          <strong>Required Documents:</strong>
        </p>
        <ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
          {Object.entries(requiredDocuments).map(([key, doc]) => (
            <li key={key}>{doc.label}</li>
          ))}
        </ul>
      </div> */}

      {/* Render file upload fields */}
      {Object.entries(requiredDocuments).map(([fieldName, doc]) =>
        renderField(fieldName, { type: "file", label: doc.label }),
      )}

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
