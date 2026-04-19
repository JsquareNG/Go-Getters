import { VALIDATION_RULES } from "./validationRules";

const INDONESIA_VALIDATION_RULES = {
  ...VALIDATION_RULES,

  businessName: {
    validation: (value) => value.trim().length >= 3,
    error: "Business name must be at least 3 characters",
  },
  companyName: {
    validation: (value) => value.trim().length >= 3,
    error: "Company name must be at least 3 characters",
  },
  registrationNumber: {
    validation: (value) => /^[A-Z0-9\-]{5,}$/.test(value.trim()),
    error: "Registration number must be at least 5 characters and alphanumeric",
  },
  npwp: {
    validation: (value) => /^[0-9]{15}$/.test(value.replace(/\D/g, "")),
    error: "NPWP must be a 15-digit numeric ID",
  },
  kbliCode: {
    validation: (value) => /^\d{5}$/.test(value),
    error: "KBLI Code must be 5 digits",
  },
  description: {
    validation: (value) => value.trim().length >= 10,
    error: "Description must be at least 10 characters",
  },

  fullName: {
    validation: (value) => /^[A-Za-z\s\-]{3,}$/.test(value.trim()),
    error: "Full name must be at least 3 alphabetic characters",
  },
  idNumber: {
    validation: (value) =>
      /^[0-9]{16,}$/.test(value.replace(/\D/g, "")) ||
      /^[A-Z0-9]{5,}$/.test(value.trim()),
    error: "ID / Passport Number must be valid",
  },
  nationality: {
    validation: (value) => value.trim().length > 0,
    error: "Nationality is required",
  },
  residentialAddress: {
    validation: (value) => value.trim().length >= 5,
    error: "Residential address must be at least 5 characters",
  },
  dateOfBirth: {
    validation: (value) => !isNaN(new Date(value).getTime()),
    error: "Date of Birth must be valid",
  },
  ownershipPercentage: {
    validation: (value) => parseFloat(value) > 0 && parseFloat(value) <= 100,
    error: "Ownership percentage must be between 0 and 100",
  },
  capitalContribution: {
    validation: (value) => parseFloat(value) >= 0,
    error: "Capital Contribution must be a positive number",
  },
  profitSharingRatio: {
    validation: (value) => parseFloat(value) >= 0 && parseFloat(value) <= 100,
    error: "Profit Sharing Ratio must be between 0 and 100",
  },

  residencyPermit: {
    validation: (value) => value.trim().length >= 5,
    error: "Residency Permit must be provided",
  },
};

export { INDONESIA_VALIDATION_RULES };
