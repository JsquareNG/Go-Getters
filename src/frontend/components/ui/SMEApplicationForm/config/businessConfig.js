// config/singaporeConfig.js
export const SINGAPORE_CONFIG = {
  country: {
    code: "SG",
    name: "Singapore",
  },
  entityTypes: {
    "Sole Proprietorship": {
      id: "soleProprietorship",
      label: "Sole Proprietorship",
      steps: {
        step1: {
          // Basic Information & dynamic fields for Step 1
          fields: {
            companyName: { label: "Business Name", type: "text", required: true },
            acraUEN: { label: "UEN", type: "text", required: true },
            incorporationDate: { label: "Date of Registration", type: "date", required: true },
            status: {
              label: "Business Status",
              type: "select",
              options: ["Active", "Inactive", "Dissolved", "Liquidated", "InReceivership", "StruckOff"],
              required: true,
            },
            registeredOfficeAddress: { label: "Registered Address", type: "textarea", required: true },
            email: { label: "Email", type: "email", required: true },
            phone: { label: "Phone", type: "tel", required: true },
            // Owner Section
            ownerName: { label: "Owner Full Name", type: "text", required: true },
            ownerIdNumber: { label: "NRIC / Passport", type: "text", required: true },
            ownerNationality: { label: "Nationality", type: "text", required: true },
            ownerResidentialAddress: { label: "Residential Address", type: "textarea", required: true },
            ownerDOB: { label: "Date of Birth", type: "date", required: true },
          },
          repeatableSections: {}, // Sole Proprietorship has only one owner, so no repeatable
        },
        step2: {
          // Financial Details
          fields: {
            bankAccountNumber: { label: "Bank Account Number", type: "text", required: true },
            swiftBic: { label: "SWIFT/BIC", type: "text", required: true },
            accountCurrency: { label: "Account Currency", type: "text", required: true },
            annualRevenue: { label: "Annual Revenue", type: "number", required: true },
            tin: { label: "Tax Identification Number (TIN)", type: "text", required: true },
            expectedMonthlyTransactionVolume: {
              label: "Expected Monthly Transaction Volume",
              type: "number",
              required: true,
            },
            sourceOfFunds: { label: "Source of Funds", type: "text", required: true },
          },
          repeatableSections: {},
        },
        step3: {
          // Required Documents
          fields: {
            ownerID: { label: "Owner ID", type: "file", required: true },
            proofOfBusinessAddress: { label: "Proof of Business Address", type: "file", required: true },
            bankStatement: { label: "Bank Statement (Last 3 months)", type: "file", required: true },
          },
          repeatableSections: {},
        },
      },
    },

    "General Partnership": {
      id: "generalPartnership",
      label: "General Partnership",
      steps: {
        step1: {
          fields: {
            companyName: { label: "Business Name", type: "text", required: true },
            acraUEN: { label: "UEN", type: "text", required: true },
            incorporationDate: { label: "Date of Registration", type: "date", required: true },
            status: {
              label: "Business Status",
              type: "select",
              options: ["Active", "Inactive", "Dissolved", "Liquidated", "InReceivership", "StruckOff"],
              required: true,
            },
            registeredOfficeAddress: { label: "Registered Address", type: "textarea", required: true },
            email: { label: "Email", type: "email", required: true },
            phone: { label: "Phone", type: "tel", required: true },
          },
          repeatableSections: {
            partners: {
              label: "Partners",
              minItems: 2,
              fields: {
                fullName: { label: "Full Name", type: "text", required: true },
                idNumber: { label: "NRIC / Passport", type: "text", required: true },
                nationality: { label: "Nationality", type: "text", required: true },
                residentialAddress: { label: "Residential Address", type: "textarea", required: true },
                dob: { label: "Date of Birth", type: "date", required: true },
                capitalContribution: { label: "Capital Contribution ($)", type: "number", required: true },
                profitSharingRatio: { label: "Profit Sharing Ratio (%)", type: "number", required: true },
              },
            },
          },
        },
        step2: {
          fields: {
            bankAccountNumber: { label: "Bank Account Number", type: "text", required: true },
            swiftBic: { label: "SWIFT/BIC", type: "text", required: true },
            accountCurrency: { label: "Account Currency", type: "text", required: true },
            annualRevenue: { label: "Annual Revenue", type: "number", required: true },
            tin: { label: "Tax Identification Number (TIN)", type: "text", required: true },
            expectedMonthlyTransactionVolume: {
              label: "Expected Monthly Transaction Volume",
              type: "number",
              required: true,
            },
            sourceOfFunds: { label: "Source of Funds", type: "text", required: true },
          },
          repeatableSections: {},
        },
        step3: {
          fields: {
            partnershipAgreement: { label: "Partnership Agreement", type: "file", required: true },
            proofOfBusinessAddress: { label: "Proof of Business Address", type: "file", required: true },
            bankStatement: { label: "Bank Statement", type: "file", required: true },
            partnerIDs: { label: "IDs of All Partners", type: "file", required: true },
          },
          repeatableSections: {},
        },
      },
    },

    // LP, LLP, Pte Ltd can follow same pattern as above with their steps, fields, and repeatableSections
  },
};