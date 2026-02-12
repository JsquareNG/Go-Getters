/**
 * Business type configuration for SME applications
 * Defines required fields and validation rules per business type
 */

export const BUSINESS_TYPES = {
  SOLE_PROPRIETORSHIP: {
    id: "sole_proprietorship",
    label: "Sole Proprietorship",
    description: "Single owner business",
    fields: {
      ownerName: {
        label: "Owner Full Name",
        required: true,
        placeholder: "Enter full name",
        validation: (value) => value.trim().length >= 2,
        error: "Owner name must be at least 2 characters",
      },
      ownerIdNumber: {
        label: "Owner ID Number",
        required: true,
        placeholder: "National ID or Passport",
        validation: (value) => value.trim().length >= 5,
        error: "Invalid ID number",
      },
    },
  },
  PARTNERSHIP: {
    id: "partnership",
    label: "Partnership",
    description: "Multiple partners business",
    fields: {
      partnerCount: {
        label: "Number of Partners",
        required: true,
        placeholder: "e.g., 2",
        validation: (value) => /^\d+$/.test(value) && parseInt(value) >= 2,
        error: "Must have at least 2 partners",
      },
      partnerDetails: {
        label: "Partner Details (CSV: Name, ID)",
        required: true,
        placeholder: "Partner 1 Name, ID1\nPartner 2 Name, ID2",
        validation: (value) => value.trim().split("\n").length >= 2,
        error: "Please provide details for all partners",
      },
    },
  },
  PRIVATE_LIMITED: {
    id: "private_limited",
    label: "Private Limited Company",
    description: "Limited liability company",
    fields: {
      directorCount: {
        label: "Number of Directors",
        required: true,
        placeholder: "e.g., 1",
        validation: (value) => /^\d+$/.test(value) && parseInt(value) >= 1,
        error: "Must have at least 1 director",
      },
      directorDetails: {
        label: "Director Details (CSV: Name, ID)",
        required: true,
        placeholder: "Director 1 Name, ID1\nDirector 2 Name, ID2",
        validation: (value) => value.trim().split("\n").length >= 1,
        error: "Please provide details for all directors",
      },
      shareholderCount: {
        label: "Number of Shareholders",
        required: true,
        placeholder: "e.g., 1",
        validation: (value) => /^\d+$/.test(value) && parseInt(value) >= 1,
        error: "Must have at least 1 shareholder",
      },
      shareholderDetails: {
        label: "Shareholder Details (CSV: Name, Ownership %)",
        required: true,
        placeholder: "Shareholder 1 Name, 50%\nShareholder 2 Name, 50%",
        validation: (value) => value.trim().split("\n").length >= 1,
        error: "Please provide shareholder details",
      },
    },
  },
  PUBLIC_LIMITED: {
    id: "public_limited",
    label: "Public Limited Company",
    description: "Publicly traded company",
    fields: {
      stockExchange: {
        label: "Stock Exchange Listed On",
        required: true,
        placeholder: "e.g., SGX, HKEX",
        validation: (value) => value.trim().length >= 2,
        error: "Please specify the stock exchange",
      },
      tickerSymbol: {
        label: "Ticker Symbol",
        required: true,
        placeholder: "e.g., ABC",
        validation: (value) => /^[A-Z]{1,5}$/.test(value),
        error: "Invalid ticker symbol format",
      },
    },
  },
};

export const getBusinessTypeConfig = (businessTypeId) =>
  Object.values(BUSINESS_TYPES).find((type) => type.id === businessTypeId) ||
  null;
