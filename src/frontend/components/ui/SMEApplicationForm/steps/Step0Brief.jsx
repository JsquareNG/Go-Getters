import React from "react";
import FormFieldGroup from "../components/FormFieldGroup";
// import { COUNTRIES } from "../config/countriesConfig";
// import { BUSINESS_TYPES } from "../config/businessTypesConfig"
import SINGAPORE_CONFIG from "../config/singaporeConfig";

/**
 * Step0Brief component
 * Collects SME country of operation and business type
 */
const Step0Brief = ({
  data,
  errors,
  touched,
  onFieldChange,
  disabled = false,
}) => {
  const countryOptions = [
    {
      label: SINGAPORE_CONFIG.country.name,
      value: SINGAPORE_CONFIG.country.code,
    },
  ];

  // the configuration object uses the key `entities` (not `entityTypes`),
  // so make sure to read from the correct property.  If the country is
  // Singapore we turn the map of entity definitions into an options array
  // for the select control.  When the country changes we also clear any
  // previously selected business type so that the user is forced to choose
  // a new one.
  const businessTypeOptions =
    data.country === "SG" && SINGAPORE_CONFIG.entities
      ? Object.entries(SINGAPORE_CONFIG.entities).map(([key, entity]) => ({
          label: entity.label,
          value: key,
        }))
      : [];

  // if someone selects a country other than SG (future‑proofing) or changes
  // the country after already having picked a business type, reset the
  // businessType field so the select shows the fresh options.
  // Note: the parent form hook `setField` will re-render this component when
  // it updates, so this effect simply keeps the value in sync.
  React.useEffect(() => {
    if (data.country !== "SG" && data.businessType) {
      onFieldChange("businessType", "");
    }
  }, [data.country, data.businessType, onFieldChange]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Before we get started, tell us about your business.
      </h2>

      {/* Country Selection */}
      <FormFieldGroup
        fieldName="country"
        label="Country of Operation"
        value={data.country}
        onChange={onFieldChange}
        error={errors.country}
        touched={touched.country}
        type="select"
        options={countryOptions}
        required
        disabled={disabled}
      />

      {/* Business Type Selection */}
      <FormFieldGroup
        fieldName="businessType"
        label="Business Type"
        value={data.businessType}
        onChange={onFieldChange}
        error={errors.businessType}
        touched={touched.businessType}
        type="select"
        options={businessTypeOptions}
        required
        disabled={!data.country || disabled}
      />
    </div>
  );
};

export default Step0Brief;
