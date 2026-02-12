import React from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import { COUNTRIES } from "../config/countriesConfig";

/**
 * Step2FinancialDetails component
 * Collects financial and bank account information
 */
const Step2FinancialDetails = ({ data, errors, touched, onFieldChange }) => {
  // Get currency from selected country (pre-populate)
  const countryCurrency = data.country ? COUNTRIES[data.country]?.currency : "";

  const currencyOptions = [
    { label: "SGD - Singapore Dollar", value: "SGD" },
    { label: "HKD - Hong Kong Dollar", value: "HKD" },
    { label: "USD - US Dollar", value: "USD" },
    { label: "MYR - Malaysian Ringgit", value: "MYR" },
    { label: "EUR - Euro", value: "EUR" },
    { label: "GBP - British Pound", value: "GBP" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Financial Details
      </h2>

      {/* Bank Account Information */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Important:</strong> Ensure all bank details are accurate.
          We'll verify these with your bank.
        </p>
      </div>

      <FormFieldGroup
        fieldName="bankAccountNumber"
        label="Bank Account Number"
        placeholder="e.g., 1234567890"
        value={data.bankAccountNumber}
        onChange={onFieldChange}
        error={errors.bankAccountNumber}
        touched={touched.bankAccountNumber}
        required
        helpText="Your business bank account for cross-border transfers"
      />

      <FormFieldGroup
        fieldName="swift"
        label="SWIFT / BIC Code"
        placeholder="e.g., ICBKSGSG"
        value={data.swift}
        onChange={onFieldChange}
        error={errors.swift}
        touched={touched.swift}
        required
        helpText="Bank's SWIFT code for international transactions"
      />

      <FormFieldGroup
        fieldName="currency"
        label="Account Currency"
        value={data.currency || countryCurrency}
        onChange={onFieldChange}
        error={errors.currency}
        touched={touched.currency}
        type="select"
        options={currencyOptions}
        required
      />

      {/* Financial Information */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          Company Financial Information
        </h3>

        <FormFieldGroup
          fieldName="annualRevenue"
          label="Annual Revenue"
          placeholder="e.g., 500000.00"
          value={data.annualRevenue}
          onChange={onFieldChange}
          error={errors.annualRevenue}
          touched={touched.annualRevenue}
          type="number"
          required
          helpText="Enter in your account currency"
        />

        <FormFieldGroup
          fieldName="taxId"
          label="Tax Identification Number"
          placeholder="Enter your tax ID"
          value={data.taxId}
          onChange={onFieldChange}
          error={errors.taxId}
          touched={touched.taxId}
          required
          helpText="Used for tax compliance verification"
        />
      </div>
    </div>
  );
};

export default Step2FinancialDetails;
