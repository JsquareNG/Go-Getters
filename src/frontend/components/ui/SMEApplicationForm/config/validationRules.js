/**
 * Validation configuration and helper functions
 * Centralizes all validation logic for form fields
 */

export const VALIDATION_RULES = {
  email: {
    validation: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    error: "Invalid email address",
  },
  phone: {
    validation: (value) =>
      /^[\d\s\-\+\(\)]{10,}$/.test(value.replace(/\s/g, "")),
    error: "Invalid phone number (at least 10 digits)",
  },
  bankAccount: {
    validation: (value) => /^[\w\d\-]{10,34}$/.test(value),
    error: "Invalid bank account number (10-34 characters)",
  },
  swift: {
    validation: (value) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value),
    error: "Invalid SWIFT/BIC code format",
  },
  currency: {
    validation: (value) => /^[A-Z]{3}$/.test(value),
    error: "Invalid currency code (3 letters)",
  },
  annualRevenue: {
    validation: (value) =>
      /^\d+(\.\d{1,2})?$/.test(value) && parseFloat(value) > 0,
    error: "Invalid revenue amount",
  },
  taxId: {
    validation: (value) => /^[\w\d\-\/]{5,}$/.test(value),
    error: "Invalid Tax ID format",
  },
  companyName: {
    validation: (value) => value.trim().length >= 3,
    error: "Company name must be at least 3 characters",
  },
  registrationNumber: {
    validation: (value) => value.trim().length >= 5,
    error: "Registration number must be at least 5 characters",
  },
};

/**
 * Validates a field based on predefined rules
 * @param {string} fieldName - Name of the field to validate
 * @param {string} value - Value to validate
 * @param {boolean} isRequired - Whether the field is required
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateField = (fieldName, value, isRequired = true) => {
  // Check if field is empty
  if (isRequired && (!value || value.toString().trim() === "")) {
    return { isValid: false, error: "This field is required" };
  }

  // Skip validation for empty optional fields
  if (!isRequired && (!value || value.toString().trim() === "")) {
    return { isValid: true, error: "" };
  }

  // Check if validation rule exists
  const rule = VALIDATION_RULES[fieldName];
  if (!rule) {
    return { isValid: true, error: "" };
  }

  // Apply validation rule
  if (!rule.validation(value.toString())) {
    return { isValid: false, error: rule.error };
  }

  return { isValid: true, error: "" };
};

/**
 * Validates a file based on type and size
 * @param {File} file - File to validate
 * @param {object} options - { maxSize, allowedTypes }
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024,
    allowedTypes = ["application/pdf", "image/jpeg", "image/png"],
  } = options;

  if (!file) {
    return { isValid: false, error: "File is required" };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSize / 1024 / 1024}MB`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type not allowed. Accepted: ${allowedTypes.join(", ")}`,
    };
  }

  return { isValid: true, error: "" };
};
