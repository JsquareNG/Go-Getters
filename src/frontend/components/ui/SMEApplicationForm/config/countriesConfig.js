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

  ID: {
    name: "Indonesia",
    code: "ID",
    currency: "IDR",
    fields: {
      npwp: {
        label: "NPWP (Tax Identification Number)",
        required: true,
        placeholder: "e.g., 12.345.678.9-012.345",
        validation: (value) => /^\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}$/.test(value),
        error: "Invalid NPWP format (XX.XXX.XXX.X-XXX.XXX)",
      },
      companyRegistrationNumber: {
        label: "Company Registration Number (NIB)",
        required: true,
        placeholder: "e.g., 0123456789012345",
        validation: (value) => /^\d{16}$/.test(value),
        error: "Invalid NIB format (16 digits)",
      },
      siupNumber: {
        label: "SIUP Number",
        required: false,
        placeholder: "e.g., 123/XYZ/2024",
        validation: (value) => !value || /^\d{1,4}\/[A-Z]+\/\d{4}$/.test(value),
        error: "Invalid SIUP format (e.g., 123/XYZ/2024)",
      },
    },
  },
};

export const getCountryConfig = (countryCode) => COUNTRIES[countryCode] || null;
