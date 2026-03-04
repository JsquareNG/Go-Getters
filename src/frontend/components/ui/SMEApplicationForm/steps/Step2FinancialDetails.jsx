import React, { useMemo } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import SINGAPORE_CONFIG from "../config/singaporeConfig";

/**
 * Step2FinancialDetails component
 * Dynamically renders financial fields based on Singapore config
 */
const Step2FinancialDetails = ({
  data,
  errors,
  touched,
  onFieldChange,
  disabled = false,
}) => {
  // ---- helper to call onFieldChange ----
  const fireField = (name, value) => {
    if (!onFieldChange) return;
    if (onFieldChange.length >= 2) {
      onFieldChange(name, value);
      return;
    }
    onFieldChange({ target: { name, value } });
  };

  // ---- dynamic field config ----
  const { financialFieldsConfig, repeatableSectionsConfig } = useMemo(() => {
    const entity = SINGAPORE_CONFIG.entities[data?.businessType] || {};
    const step3 = entity.steps?.find((s) => s.id === "step3") || {};

    const financialFields = {};
    const repeatableSections = {};

    // top-level fields
    if (step3.fields) {
      Object.entries(step3.fields).forEach(([key, val]) => {
        financialFields[key] = {
          ...val,
        };
      });
    }

    // repeatable-section fields (e.g., partnerFinancials)
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
      {Object.entries(financialFieldsConfig).map(([fieldName, fieldConfig]) => {
        let type = fieldConfig.type;
        if (type === "number") type = "number";
        if (type === "textarea") type = "textarea";
        if (type === "select") type = "select";

        return (
          <FormFieldGroup
            key={fieldName}
            fieldName={fieldName}
            label={fieldConfig.label}
            placeholder={fieldConfig.placeholder || ""}
            value={data[fieldName] || ""}
            onChange={fireField}
            error={errors[fieldName]}
            touched={touched[fieldName]}
            type={type}
            options={fieldConfig.options || []}
            required={fieldConfig.required || false}
            helpText={fieldConfig.helpText || ""}
            disabled={disabled}
          />
        );
      })}

      {/* Repeatable Sections */}
      {Object.entries(repeatableSectionsConfig).map(([sectionKey, section]) => (
        <div key={sectionKey} className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">
            {section.label}
          </h3>

          {/* For simplicity, we render only one set (min) of fields; could extend for dynamic adding */}
          {Object.entries(section.fields).map(([fieldName, fieldConfig]) => {
            let type = fieldConfig.type;
            if (type === "number") type = "number";
            if (type === "textarea") type = "textarea";
            if (type === "select") type = "select";

            return (
              <FormFieldGroup
                key={fieldName}
                fieldName={fieldName}
                label={fieldConfig.label}
                placeholder={fieldConfig.placeholder || ""}
                value={data[sectionKey]?.[fieldName] || ""}
                onChange={(name, value) =>
                  fireField(`${sectionKey}.${name}`, value)
                }
                error={errors[fieldName]}
                touched={touched[fieldName]}
                type={type}
                options={fieldConfig.options || []}
                required={fieldConfig.required || false}
                helpText={fieldConfig.helpText || ""}
                disabled={disabled}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Step2FinancialDetails;