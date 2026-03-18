import React, { useMemo } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import FileUploadField from "../components/FileUploadField";
import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";

/**
 * Step2FinancialDetails component
 * Fully Redux-driven
 */
const Step2FinancialDetails = ({ data, onFieldChange, disabled = false }) => {
  const CONFIG_MAP = {
    Singapore: SINGAPORE_CONFIG,
    Indonesia: INDONESIA_CONFIG,
  };

  const activeConfig = CONFIG_MAP[data?.country] || SINGAPORE_CONFIG;

  const { financialFieldsConfig, repeatableSectionsConfig } = useMemo(() => {
    const entity = activeConfig.entities[data?.businessType] || {};
    const step3 = entity.steps?.find((s) => s.id === "step3") || {};

    const financialFields = {};
    const repeatableSections = {};

    if (step3.fields) {
      Object.entries(step3.fields).forEach(([key, val]) => {
        financialFields[key] = { ...val };
      });
    }

    if (step3.repeatableSections) {
      Object.entries(step3.repeatableSections).forEach(
        ([sectionKey, section]) => {
          repeatableSections[sectionKey] = {
            label: section.label,
            min: section.min,
            max: section.max,
            fields: { ...section.fields },
          };
        },
      );
    }

    return {
      financialFieldsConfig: financialFields,
      repeatableSectionsConfig: repeatableSections,
    };
  }, [data?.businessType, data?.country]);

  // ---- recursive field renderer ----
  const renderField = (fieldName, fieldConfig, parentKey = null) => {
    const fullKey = parentKey ? `${parentKey}.${fieldName}` : fieldName;
    const value = parentKey
      ? data?.[parentKey]?.[fieldName]
      : data?.[fieldName];

    // Nested object recursion
    if (
      typeof fieldConfig === "object" &&
      !fieldConfig.type &&
      !fieldConfig.label
    ) {
      return (
        <div key={fullKey} className="mb-6">
          <p className="font-semibold text-gray-900 mb-2">
            {fieldName.replace(/([A-Z])/g, " $1").trim()}
          </p>
          {Object.entries(fieldConfig).map(([subKey, subCfg]) =>
            renderField(subKey, subCfg, fullKey),
          )}
        </div>
      );
    }

    // File field
    if (fieldConfig.type === "file") {
      return (
        <FileUploadField
          key={fullKey}
          fieldName={fullKey}
          label={fieldConfig.label}
          file={value?.file || null}
          onChange={(file) => onFieldChange(fullKey, { file })}
          required={fieldConfig.required || false}
          acceptTypes="application/pdf,image/jpeg,image/png"
          maxSize={5242880}
          disabled={disabled}
        />
      );
    }

    // Regular field
    return (
      <FormFieldGroup
        key={fullKey}
        fieldName={fullKey}
        label={fieldConfig.label}
        placeholder={fieldConfig.placeholder || ""}
        value={value || ""}
        onChange={(name, val) => onFieldChange(fullKey, val)}
        type={fieldConfig.type || "text"}
        options={fieldConfig.options || []}
        required={fieldConfig.required || false}
        helpText={fieldConfig.helpText || ""}
        disabled={disabled}
      />
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Financial Details
      </h2>

      {/* Top-Level Financial Fields */}
      {/* {Object.entries(financialFieldsConfig).map(([fieldName, fieldConfig]) => (
        <FormFieldGroup
          key={fieldName}
          fieldName={fieldName}
          label={fieldConfig.label}
          placeholder={fieldConfig.placeholder || ""}
          value={data[fieldName] || ""}
          onChange={onFieldChange}
          type={fieldConfig.type || "text"}
          options={fieldConfig.options || []}
          required={fieldConfig.required || false}
          helpText={fieldConfig.helpText || ""}
          disabled={disabled}
        />
      ))} */}

      {/* Repeatable Sections */}
      {/* {Object.entries(repeatableSectionsConfig).map(([sectionKey, section]) => (
        <div key={sectionKey} className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">
            {section.label}
          </h3> */}

      {/* Render min number of repeatable fields; can extend later */}
      {/* {Object.entries(section.fields).map(([fieldName, fieldConfig]) => (
            <FormFieldGroup
              key={fieldName}
              fieldName={fieldName}
              label={fieldConfig.label}
              placeholder={fieldConfig.placeholder || ""}
              value={data[sectionKey]?.[fieldName] || ""}
              onChange={(name, value) =>
                onFieldChange(`${sectionKey}.${name}`, value)
              }
              type={fieldConfig.type || "text"}
              options={fieldConfig.options || []}
              required={fieldConfig.required || false}
              helpText={fieldConfig.helpText || ""}
              disabled={disabled}
            />
          ))}
        </div>
      ))} */}

      {/* Top-Level Financial Fields */}
      {Object.entries(financialFieldsConfig).map(([fieldName, fieldConfig]) =>
        renderField(fieldName, fieldConfig),
      )}

      {/* Repeatable Sections */}
      {Object.entries(repeatableSectionsConfig).map(([sectionKey, section]) => (
        <div key={sectionKey} className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">
            {section.label}
          </h3>
          {Object.entries(section.fields).map(([fieldName, fieldConfig]) =>
            renderField(fieldName, fieldConfig, sectionKey),
          )}
        </div>
      ))}
    </div>
  );
};

export default Step2FinancialDetails;
