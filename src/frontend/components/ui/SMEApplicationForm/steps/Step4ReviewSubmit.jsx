import React from "react";
import { COUNTRIES } from "../config/countriesConfig";
import { BUSINESS_TYPES } from "../config/businessTypesConfig";
import { CheckCircle2 } from "lucide-react";

/**
 * Step4ReviewSubmit component
 * Displays all collected information for review before final submission
 */
const Step4ReviewSubmit = ({ data, onEdit, isSubmitting = false }) => {
  const countryName = COUNTRIES[data.country]?.name || "Not selected";
  const businessTypeName =
    Object.values(BUSINESS_TYPES).find((type) => type.id === data.businessType)
      ?.label || "Not selected";

  const formatDocumentName = (file) => {
    if (!file) return "Not uploaded";
    return `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
  };

  const ReviewSection = ({ title, fields, onEditClick }) => (
    <div className="mb-8 border rounded-lg p-6 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <button
          onClick={() => onEditClick(title)}
          className="text-sm text-red-500 hover:text-red-700 font-medium"
        >
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field, idx) => (
          <div
            key={idx}
            className="bg-white p-3 rounded border border-gray-200"
          >
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              {field.label}
            </p>
            <p className="text-sm text-gray-900 break-words">{field.value}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // Build review data dynamically
  const basicInfoFields = [
    { label: "Company Name", value: data.companyName },
    { label: "Registration Number", value: data.registrationNumber },
    { label: "Country", value: countryName },
    { label: "Business Type", value: businessTypeName },
    { label: "Email", value: data.email },
    { label: "Phone", value: data.phone },
  ];

  // Add dynamic country-specific fields to review
  if (data.country && COUNTRIES[data.country]?.fields) {
    Object.entries(COUNTRIES[data.country].fields).forEach(
      ([fieldName, fieldConfig]) => {
        const value = data.countrySpecificFields[fieldName];
        if (value) {
          basicInfoFields.push({
            label: fieldConfig.label,
            value: value,
          });
        }
      },
    );
  }

  // Add dynamic business-type-specific fields to review
  if (data.businessType) {
    const businessTypeConfig = Object.values(BUSINESS_TYPES).find(
      (type) => type.id === data.businessType,
    );
    if (businessTypeConfig?.fields) {
      Object.entries(businessTypeConfig.fields).forEach(
        ([fieldName, fieldConfig]) => {
          const value = data.businessTypeSpecificFields[fieldName];
          if (value) {
            basicInfoFields.push({
              label: fieldConfig.label,
              value: value,
            });
          }
        },
      );
    }
  }

  const financialFields = [
    { label: "Bank Account Number", value: data.bankAccountNumber },
    { label: "SWIFT / BIC Code", value: data.swift },
    { label: "Account Currency", value: data.currency },
    {
      label: "Annual Revenue",
      value: `${data.currency} ${parseFloat(data.annualRevenue).toLocaleString()}`,
    },
    { label: "Tax ID", value: data.taxId },
  ];

  const complianceFields = [
    {
      label: "KYC Document",
      value: formatDocumentName(data.documents.kycDocument),
    },
    {
      label: "Business License",
      value: formatDocumentName(data.documents.businessLicense),
    },
    {
      label: "Proof of Address",
      value: formatDocumentName(data.documents.proofOfAddress),
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-gray-900">
        Review Your Application
      </h2>
      <p className="text-gray-600 mb-8">
        Please review all information below. Click "Edit" to make changes before
        submitting.
      </p>

      {/* Basic Information Review */}
      <ReviewSection
        title="Basic Information"
        fields={basicInfoFields}
        onEditClick={() => onEdit(1)}
      />

      {/* Financial Details Review */}
      <ReviewSection
        title="Financial Details"
        fields={financialFields}
        onEditClick={() => onEdit(2)}
      />

      {/* Compliance & Documentation Review */}
      <ReviewSection
        title="Compliance & Documentation"
        fields={complianceFields}
        onEditClick={() => onEdit(3)}
      />

      {/* Submission Confirmation */}
      <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800 mb-2">
          <strong>✓ Ready to Submit</strong>
        </p>
        <p className="text-sm text-green-800">
          All required information has been provided. Click "Submit Application"
          below to complete your registration.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-gray-100 border border-gray-300 rounded-lg">
        <p className="text-xs text-gray-700">
          <strong>Disclaimer:</strong> By submitting this application, you
          confirm that all information provided is accurate and complete to the
          best of your knowledge. Any false information may result in
          application rejection and potential legal consequences.
        </p>
      </div>

      {isSubmitting && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Processing your application...
          </p>
        </div>
      )}
    </div>
  );
};

export default Step4ReviewSubmit;
