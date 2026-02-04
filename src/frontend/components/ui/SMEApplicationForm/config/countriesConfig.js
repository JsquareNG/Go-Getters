/**
 * Country-specific configuration for SME applications
 * Defines required fields, validation rules, and formats per country
 */

export const COUNTRIES = {
  SG: {
    name: "Singapore",
    code: "SG",
    currency: "SGD",
    fields: {
      gstNumber: {
        label: "GST Registration Number",
        required: true,
        placeholder: "e.g., 123456789D",
        validation: (value) => /^\d{8}[A-Z]$/.test(value),
        error: "Invalid GST format (8 digits + 1 letter)",
      },
      businessRegistrationNumber: {
        label: "Business Registration Number",
        required: true,
        placeholder: "e.g., 123456789L",
        validation: (value) => /^\d{8}[A-Z]$/.test(value),
        error: "Invalid BRN format",
      },
      acraUEN: {
        label: "ACRA UEN",
        required: true,
        placeholder: "e.g., 123456789D",
        validation: (value) => /^[\d\w]{9,}$/.test(value),
        error: "Invalid UEN format",
      },
    },
  },
  HK: {
    name: "Hong Kong",
    code: "HK",
    currency: "HKD",
    fields: {
      businessRegistrationNumber: {
        label: "Business Registration Certificate Number",
        required: true,
        placeholder: "e.g., 123456",
        validation: (value) => /^\d{6}$/.test(value),
        error: "Invalid BR Number (6 digits)",
      },
      companyRegistrationNumber: {
        label: "Company Registration Number",
        required: true,
        placeholder: "e.g., 1234567",
        validation: (value) => /^\d{7}$/.test(value),
        error: "Invalid CR Number (7 digits)",
      },
    },
  },
  US: {
    name: "United States",
    code: "US",
    currency: "USD",
    fields: {
      ein: {
        label: "Employer Identification Number (EIN)",
        required: true,
        placeholder: "e.g., 12-3456789",
        validation: (value) => /^\d{2}-\d{7}$/.test(value),
        error: "Invalid EIN format (XX-XXXXXXX)",
      },
      ssn: {
        label: "Social Security Number",
        required: false,
        placeholder: "e.g., 123-45-6789",
        validation: (value) => !value || /^\d{3}-\d{2}-\d{4}$/.test(value),
        error: "Invalid SSN format (XXX-XX-XXXX)",
      },
    },
  },
  MY: {
    name: "Malaysia",
    code: "MY",
    currency: "MYR",
    fields: {
      registrationNumber: {
        label: "SSM Registration Number",
        required: true,
        placeholder: "e.g., 123456-12-3456",
        validation: (value) => /^\d{6}-\d{2}-\d{4}$/.test(value),
        error: "Invalid Registration format (XXXXXX-XX-XXXX)",
      },
      taxIdentificationNumber: {
        label: "Tax Identification Number",
        required: true,
        placeholder: "e.g., 12-3456-78901-000",
        validation: (value) => /^\d{2}-\d{4}-\d{5}-\d{3}$/.test(value),
        error: "Invalid TIN format",
      },
    },
  },
};

export const getCountryConfig = (countryCode) => COUNTRIES[countryCode] || null;
