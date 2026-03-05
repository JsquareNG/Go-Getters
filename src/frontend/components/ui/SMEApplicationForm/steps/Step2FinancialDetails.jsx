import React, { useMemo } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import SINGAPORE_CONFIG from "../config/singaporeConfig";

/**
 * Step2FinancialDetails component
 * Fully Redux-driven
 */
const Step2FinancialDetails = ({ data, onFieldChange, disabled = false }) => {
  // ---- dynamic field config from Singapore config ----
  const { financialFieldsConfig, repeatableSectionsConfig } = useMemo(() => {
    const entity = SINGAPORE_CONFIG.entities[data?.businessType] || {};
    const step3 = entity.steps?.find((s) => s.id === "step3") || {};

    const financialFields = {};
    const repeatableSections = {};

    if (step3.fields) {
      Object.entries(step3.fields).forEach(([key, val]) => {
        financialFields[key] = { ...val };
      });
    }

    if (step3.repeatableSections) {
      Object.entries(step3.repeatableSections).forEach(([sectionKey, section]) => {
        repeatableSections[sectionKey] = {
          label: section.label,
          min: section.min,
          max: section.max,
          fields: { ...section.fields },
        };
      });
    }

    return { financialFieldsConfig: financialFields, repeatableSectionsConfig: repeatableSections };
  }, [data?.businessType]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Financial Details
      </h2>

      {/* Top-Level Financial Fields */}
      {Object.entries(financialFieldsConfig).map(([fieldName, fieldConfig]) => (
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
      ))}

      {/* Repeatable Sections */}
      {Object.entries(repeatableSectionsConfig).map(([sectionKey, section]) => (
        <div key={sectionKey} className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">
            {section.label}
          </h3>

          {/* Render min number of repeatable fields; can extend later */}
          {Object.entries(section.fields).map(([fieldName, fieldConfig]) => (
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
      ))}
    </div>
  );
};

export default Step2FinancialDetails;