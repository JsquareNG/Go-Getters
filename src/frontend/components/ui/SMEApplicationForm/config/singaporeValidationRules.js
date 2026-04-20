import { VALIDATION_RULES } from "./validationRules";

const SINGAPORE_VALIDATION_RULES = {
  ...VALIDATION_RULES,


  businessName: {
    validation: (v) => v.trim().length >= 3,
    error: "Business Name must be at least 3 characters",
  },
  uen: {
    validation: (v) => /^[A-Z0-9]{9,12}$/.test(v.trim()),
    error: "UEN must be alphanumeric, 9–12 characters",
  },
  registrationDate: {
    validation: (v) => !isNaN(new Date(v).getTime()),
    error: "Registration Date must be valid",
  },
  registeredAddress: {
    validation: (v) => v.trim().length >= 5,
    error: "Registered Address must be at least 5 characters",
  },


  fullName: {
    validation: (v) => /^[A-Za-z\s\-]{3,}$/.test(v.trim()),
    error: "Full Name must be at least 3 alphabetic characters",
  },
  idNumber: {
    validation: (v) =>
      /^[STFG]\d{7}[A-Z]$/.test(v) || /^[A-Z0-9]{5,20}$/.test(v),
    error: "NRIC / Passport Number must be valid",
  },
  nationality: {
    validation: (v) => v.trim().length > 0,
    error: "Nationality is required",
  },
  residentialAddress: {
    validation: (v) => v.trim().length >= 5,
    error: "Residential Address must be at least 5 characters",
  },
  dateOfBirth: {
    validation: (v) => !isNaN(new Date(v).getTime()),
    error: "Date of Birth must be valid",
  },

 
  bankAccountNumber: {
    validation: (v) => /^[\d\-]{10,34}$/.test(v),
    error: "Bank Account Number must be 10–34 digits",
  },
  swiftBic: {
    validation: (v) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v),
    error: "Invalid SWIFT / BIC code",
  },
  accountCurrency: {
    validation: (v) => /^[A-Z]{3}$/.test(v),
    error: "Currency code must be 3 letters",
  },
  annualRevenue: {
    validation: (v) => /^\d+(\.\d{1,2})?$/.test(v) && parseFloat(v) > 0,
    error: "Annual Revenue must be a positive number",
  },
  expectedMonthlyTransactionVolume: {
    validation: (v) => parseFloat(v) >= 0,
    error: "Expected Monthly Transaction Volume must be a number",
  },
  sourceOfFunds: {
    validation: (v) => v.trim().length >= 3,
    error: "Source of Funds is required",
  },

  sharePercentage: {
    validation: (v) => parseFloat(v) > 0 && parseFloat(v) <= 100,
    error: "Share Percentage must be 0–100",
  },
  capitalContribution: {
    validation: (v) => parseFloat(v) >= 0,
    error: "Capital Contribution must be a positive number",
  },
  profitSharingRatio: {
    validation: (v) => parseFloat(v) >= 0 && parseFloat(v) <= 100,
    error: "Profit Sharing Ratio must be 0–100",
  },
  uboName: {
    validation: (v) => v.trim().length >= 3,
    error: "UBO Name must be at least 3 characters",
  },
  uboResidentialAddress: {
    validation: (v) => v.trim().length >= 5,
    error: "UBO Residential Address is required",
  },
  uboNationality: {
    validation: (v) => v.trim().length > 0,
    error: "UBO Nationality is required",
  },
  uboDateOfBirth: {
    validation: (v) => !isNaN(new Date(v).getTime()),
    error: "UBO Date of Birth must be valid",
  },

  file: {
    validation: (file) =>
      file &&
      file.size <= 5 * 1024 * 1024 &&
      ["application/pdf", "image/jpeg", "image/png"].includes(file.type),
    error: "Invalid file type or size (max 5MB, PDF/JPG/PNG)",
  },
};

export { SINGAPORE_VALIDATION_RULES };
