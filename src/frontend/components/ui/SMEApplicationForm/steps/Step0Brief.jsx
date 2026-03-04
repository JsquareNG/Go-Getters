import React from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import { COUNTRIES } from "../config/countriesConfig";
import { BUSINESS_TYPES } from "../config/businessTypesConfig";

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
  const countryOptions = Object.values(COUNTRIES).map((country) => ({
    label: country.name,
    value: country.code,
  }));

  const businessTypeOptions = Object.values(BUSINESS_TYPES).map((type) => ({
    label: type.label,
    value: type.id,
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Before we get started, tell us about your business.
      </h2>

      {/* Country Selection - Required for conditional fields */}
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

      {/* Business Type Selection - Required for conditional fields */}
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
        disabled={disabled}
      />
    </div>
  );
};

export default Step0Brief;
