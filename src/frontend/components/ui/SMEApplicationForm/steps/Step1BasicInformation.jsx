import React from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import { COUNTRIES } from "../config/countriesConfig";
import { BUSINESS_TYPES } from "../config/businessTypesConfig";

/**
 * Step1BasicInformation component
 * Collects SME basic information and dynamically shows country/business-specific fields
 */
const Step1BasicInformation = ({
  data,
  errors,
  touched,
  onFieldChange,
  onCountrySpecificFieldChange,
  onBusinessTypeFieldChange,
  countrySpecificFieldsConfig,
  businessTypeSpecificFieldsConfig,
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
        Basic Information
      </h2>

      {/* Standard Fields */}
      <FormFieldGroup
        fieldName="companyName"
        label="Company Name"
        placeholder="Enter company legal name"
        value={data.companyName}
        onChange={onFieldChange}
        error={errors.companyName}
        touched={touched.companyName}
        required
      />

      <FormFieldGroup
        fieldName="registrationNumber"
        label="Business Registration Number"
        placeholder="Enter registration number"
        value={data.registrationNumber}
        onChange={onFieldChange}
        error={errors.registrationNumber}
        touched={touched.registrationNumber}
        required
      />

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
      />

      {/* Dynamic Country-Specific Fields */}
      {data.country &&
        Object.entries(countrySpecificFieldsConfig).map(
          ([fieldName, fieldConfig]) => (
            <FormFieldGroup
              key={fieldName}
              fieldName={fieldName}
              label={fieldConfig.label}
              placeholder={fieldConfig.placeholder}
              value={data.countrySpecificFields[fieldName] || ""}
              onChange={onCountrySpecificFieldChange}
              error={errors[fieldName]}
              touched={touched[fieldName]}
              required={fieldConfig.required}
              helpText={`Format: ${fieldConfig.placeholder}`}
            />
          ),
        )}

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
      />

      {/* Dynamic Business-Type-Specific Fields */}
      {data.businessType &&
        Object.entries(businessTypeSpecificFieldsConfig).map(
          ([fieldName, fieldConfig]) => (
            <FormFieldGroup
              key={fieldName}
              fieldName={fieldName}
              label={fieldConfig.label}
              placeholder={fieldConfig.placeholder}
              value={data.businessTypeSpecificFields[fieldName] || ""}
              onChange={onBusinessTypeFieldChange}
              error={errors[fieldName]}
              touched={touched[fieldName]}
              required={fieldConfig.required}
              type={fieldName.includes("Details") ? "textarea" : "text"}
            />
          ),
        )}

      {/* Contact Information */}
      <FormFieldGroup
        fieldName="email"
        label="Email Address"
        placeholder="company@example.com"
        value={data.email}
        onChange={onFieldChange}
        error={errors.email}
        touched={touched.email}
        type="email"
        required
      />

      <FormFieldGroup
        fieldName="phone"
        label="Phone Number"
        placeholder="+1 (555) 000-0000"
        value={data.phone}
        onChange={onFieldChange}
        error={errors.phone}
        touched={touched.phone}
        type="tel"
        required
      />
    </div>
  );
};

export default Step1BasicInformation;
