import React, { useEffect } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import SINGAPORE_CONFIG from "../config/singaporeConfig";

/**
 * Step0Brief component
 * Collects SME country of operation and business type
 */
const Step0Brief = ({
  data = {},
  errors = {},
  touched = {},
  onFieldChange,
  disabled = false,
}) => {
  // Ensure data.country has a default for safe access
  const currentCountry = data.country || "";
  const currentBusinessType = data.businessType || "";

  // Country options (currently only Singapore)
  const countryOptions = [
    {
      label: SINGAPORE_CONFIG.country?.name || "Singapore",
      value: SINGAPORE_CONFIG.country?.code || "SG",
    },
  ];

  // Business type options (only if country is SG and entities exist)
  const businessTypeOptions =
    currentCountry === "SG" && SINGAPORE_CONFIG.entities
      ? Object.entries(SINGAPORE_CONFIG.entities).map(([key, entity]) => ({
          label: entity?.label || key,
          value: key,
        }))
      : [];

  // Reset businessType if country changes
  useEffect(() => {
    if (currentCountry !== "SG" && currentBusinessType) {
      onFieldChange?.("businessType", "");
    }
  }, [currentCountry, currentBusinessType, onFieldChange]);

    // --- NEW: populate fields if draft exists ---
  useEffect(() => {
    if (data.country && data.country !== currentCountry) {
      onFieldChange?.("country", data.country);
    }
    if (data.businessType && data.businessType !== currentBusinessType) {
      onFieldChange?.("businessType", data.businessType);
    }
  }, [data, currentCountry, currentBusinessType, onFieldChange]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Before we get started, tell us about your business.
      </h2>

      {/* Country Selection */}
      <FormFieldGroup
        fieldName="country"
        label="Country of Operation"
        value={data.country || ""}
        // onChange={(value) => onFieldChange?.("country", value)}
        onChange={onFieldChange} // Pass directly
        error={errors.country || ""}
        touched={touched.country || false}
        type="select"
        options={countryOptions}
        required
        disabled={disabled}
      />

      {/* Business Type Selection */}
      <FormFieldGroup
        fieldName="businessType"
        label="Business Type"
        value={data.businessType || ""}
        // onChange={(value) => onFieldChange?.("businessType", value)}
        onChange={onFieldChange} // Pass directly
        error={errors.businessType || ""}
        touched={touched.businessType || false}
        type="select"
        options={businessTypeOptions}
        required
        disabled={!data.country || disabled}
      />
    </div>
  );
};

export default Step0Brief;
