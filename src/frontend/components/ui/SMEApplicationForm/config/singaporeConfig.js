/**
 * Singapore SME Onboarding Configuration
 * Version: v1
 */

//////////////////////////
//HELPER FIELD SETS //
//////////////////////////
import { COUNTRIES, NATIONALITIES } from "../utils/countries";
import { INDUSTRY_OPTIONS } from "../utils/industries";

const YES_NO_OPTIONS = ["Yes", "No"].map((opt) => ({
  label: opt,
  value: opt,
}));

function getBasicBusinessFields() {
  return {
    businessProfile: {
      type: "file",
      label: "Upload ACRA Business Profile (OCR autofill)",
      required: true,
      ocrTarget: "business_profile",
    },
    businessName: { type: "text", label: "Business Name", required: true },
    businessIndustry: {
      type: "select",
      label: "Business Industry",
      required: true,
      options: INDUSTRY_OPTIONS,
      placeholder: "Select your industry",
    },
    uen: { type: "text", label: "UEN / Registration Number", required: true },
    registrationDate: {
      type: "date",
      label: "Registration Date",
      required: true,
    },
    businessStatus: { type: "text", label: "Business Status", required: true },
    registeredAddress: {
      type: "textarea",
      label: "Registered Address",
      required: true,
    },
    email: { type: "email", label: "Email", required: true },
    phone: { type: "text", label: "Phone", required: true },
  };
}

function getIndividualFields() {
  return {
    fullName: { type: "text", label: "Full Name", required: true },
    idNumber: { type: "text", label: "NRIC / Passport Number", required: true },
    nationality: {
      type: "select",
      label: "Nationality",
      required: true,
      options: NATIONALITIES,
    },
    residentialAddress: {
      type: "textarea",
      label: "Residential Address",
      required: true,
    },
    dateOfBirth: { type: "date", label: "Date of Birth", required: true },
    idDocument: {
      type: "file",
      label: "National ID / Passport Document",
      required: true,
    },
  };
}

function getCoreFinancialFields() {
  return {
    bankAccountNumber: {
      type: "text",
      label: "Bank Account Number",
      required: true,
    },
    swiftBic: { type: "text", label: "SWIFT / BIC", required: true },
    accountCurrency: {
      type: "text",
      label: "Account Currency",
      required: true,
    },
    annualRevenue: { type: "number", label: "Annual Revenue", required: true },
    taxResidency: {
      country: {
        type: "select",
        label: "Country of Tax Residency",
        required: true,

        options: COUNTRIES(),
      },
      tin: { type: "text", label: "TIN", required: true },
    },
    expectedCountriesOfTransactionActivity: {
      type: "checkbox",
      label: "Expected Countries of Transaction Activity",
      required: true,
      placeholder:
        "Please select the countries where your business expects to send or receive payments.",
      options: COUNTRIES(),
    },
    expectedMonthlyTransactionVolume: {
      type: "number",
      label: "Expected Monthly Transaction Volume",
      required: true,
    },
    sourceOfFunds: {
      type: "textarea",
      label: "Source of Funds",
      required: true,
    },
  };
}

function getComplianceDeclarations() {
  return {
    pepDeclaration: {
      type: "select",
      label: "Politically Exposed Person (PEP)",
      required: true,
      options: YES_NO_OPTIONS,
      conditionalFields: {
        Yes: {
          country: {
            type: "select",
            label: "Country",
            options: COUNTRIES(),
            required: true,
          },
          position: { type: "text", label: "Position Held", required: true },
          relationship: {
            type: "text",
            label: "Relationship Type",
            required: true,
          },
          period: { type: "text", label: "Period", required: true },
        },
      },
    },
    sanctionsDeclaration: {
      type: "select",
      label: "Subject to Sanctions",
      required: true,

      options: YES_NO_OPTIONS,
      conditionalFields: {
        Yes: {
          details: {
            type: "textarea",
            label: "Provide Details",
            required: true,
          },
        },
      },
    },
    fatcaDeclaration: {
      type: "select",
      required: true,

      label: "U.S. Citizen / Tax Resident",
      options: YES_NO_OPTIONS,
    },
  };
}

///////////////////////////////
// SINGAPORE CONFIG
///////////////////////////////

const SINGAPORE_CONFIG = {
  country: {
    code: "SG",
    name: "Singapore",
    currency: "SGD",
    regulator: "MAS",
    uboThreshold: 25,
  },

  entities: {
    sole_proprietorship: {
      label: "Sole Proprietorship",
      steps: [
        {
          id: "step2",
          label: "Basic Information",
          fields: {
            ...getBasicBusinessFields(),
          },
          repeatableSections: {
            owners: {
              label: "Owner",
              storage: "individuals",
              min: 1,
              max: 1,
              fields: {
                role: {
                  type: "text",
                  label: "Role",
                  value: "Owner",
                  readonly: true,
                },
                sharePercentage: {
                  type: "number",
                  label: "Share Percentage (%)",
                  value: 100,
                  readonly: true,
                },
                ...getIndividualFields(),
                ...getComplianceDeclarations(),
              },
            },
          },
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: getCoreFinancialFields(),
        },
        {
          id: "step4",
          label: "Documents",
          fields: {
            proofOfBusinessAddress: {
              type: "file",
              label: "Proof of Business Address",
              required: true,
            },
            bankStatement: {
              type: "file",
              label: "Bank Statement (Last 3 months)",
              required: true,
            },
          },
        },
      ],
    },

    general_partnership: {
      label: "General Partnership",
      steps: [
        {
          id: "step2",
          label: "Basic Information",
          fields: getBasicBusinessFields(),
          repeatableSections: {
            partners: {
              label: "Partner",
              min: 2,
              fields: {
                role: {
                  type: "text",
                  label: "Role",
                  value: "Partner",
                  readonly: true,
                },
                sharePercentage: {
                  type: "number",
                  label: "Share Percentage (%)",
                  min: 0,
                  max: 100,
                  required: true,
                },
                ...getIndividualFields(),
                ...getComplianceDeclarations(),
              },
            },
          },
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: getCoreFinancialFields(),
          repeatableSections: {
            partnerFinancials: {
              label: "Partner Financial",
              storage: "individuals",
              min: 2,
              fields: {
                capitalContribution: {
                  type: "number",
                  label: "Capital Contribution ($)",
                  required: true,
                },
                profitSharingRatio: {
                  type: "number",
                  label: "Profit Sharing Ratio (%)",
                  required: true,
                },
              },
            },
          },
        },
        {
          id: "step4",
          label: "Documents",
          // Optional: additional files per partnership, if needed
          repeatableSections: {
            partnershipDocuments: {
              label: "Partnership Documents",
              storage: "individuals",
              min: 1,
              fields: {
                partnershipAgreement: {
                  type: "file",
                  label: "Partnership Agreement",
                  required: true,
                },
                proofOfBusinessAddress: {
                  type: "file",
                  label: "Proof of Business Address",
                  required: true,
                },
              },
            },
          },
        },
      ],
    },

    limited_partnership: {
      label: "Limited Partnership (LP)",
      steps: [
        {
          id: "step2",
          label: "Basic Information",
          fields: getBasicBusinessFields(),
          repeatableSections: {
            generalPartners: {
              label: "General Partner",
              storage: "individuals",
              min: 1,
              fields: {
                role: {
                  type: "text",
                  label: "Role",
                  value: "General Partner",
                  readonly: true,
                },
                sharePercentage: {
                  type: "number",
                  label: "Share Percentage (%)",
                  min: 0,
                  max: 100,
                  required: true,
                },
                ...getIndividualFields(),
                ...getComplianceDeclarations(),
              },
            },
            limitedPartners: {
              label: "Limited Partner",
              storage: "individuals",
              min: 0,
              fields: {
                role: {
                  type: "text",
                  label: "Role",
                  value: "Limited Partner",
                  readonly: true,
                },
                sharePercentage: {
                  type: "number",
                  label: "Share Percentage (%)",
                  min: 0,
                  max: 100,
                  required: true,
                },
                ...getIndividualFields(),
                ...getComplianceDeclarations(),
              },
            },
          },
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: {
            ...getCoreFinancialFields(),
            totalCapitalContribution: {
              type: "number",
              label: "Total Capital Contribution",
              required: true,
            },
            generalPartnerCapitalContribution: {
              type: "number",
              label: "General Partner Capital Contribution",
              required: true,
            },
          },
        },
        {
          id: "step4",
          label: "Documents",
          fields: {
            LPAgreement: {
              type: "file",
              label: "LP Agreement",
              required: true,
            },
            proofOfBusinessAddress: {
              type: "file",
              label: "Proof of Business Address",
              required: true,
            },
            bankStatement: {
              type: "file",
              label: "Bank Statement (Last 3 months)",
              required: true,
            },
          },
        },
      ],
    },

    llp: {
      label: "Limited Liability Partnership (LLP)",
      steps: [
        {
          id: "step2",
          label: "Basic Information",
          fields: {
            llpName: { type: "text", label: "LLP Name", required: true },
            businessIndustry: {
              type: "checkbox",
              label: "Business Industry",
              required: true,
              option: INDUSTRY_OPTIONS,
              placeholder: "Select your industry",
            },
            uen: { type: "text", label: "UEN", required: true },
            registrationDate: {
              type: "date",
              label: "Registration Date",
              required: true,
            },
            registeredAddress: {
              type: "textarea",
              label: "Registered Address",
              required: true,
            },
            email: { type: "email", label: "Email", required: true },
            phone: { type: "text", label: "Phone", required: true },
          },
          repeatableSections: {
            partners: {
              label: "Partner",
              storage: "individuals",
              min: 1,
              fields: {
                role: {
                  type: "text",
                  label: "Role",
                  value: "Partner",
                  readonly: true,
                },
                sharePercentage: {
                  type: "number",
                  label: "Share Percentage (%)",
                  min: 0,
                  max: 100,
                  required: true,
                },
                ...getIndividualFields(),
                ...getComplianceDeclarations(),
              },
            },
            managers: {
              label: "Manager",
              storage: "individuals",
              min: 1,
              fields: {
                role: {
                  type: "text",
                  label: "Role",
                  value: "Manager",
                  readonly: true,
                },
                sharePercentage: {
                  type: "number",
                  label: "Share Percentage (%)",
                  min: 0,
                  max: 100,
                  required: true,
                },
                ...getIndividualFields(),
                nationality: {
                  type: "text",
                  label: "Nationality",
                  required: true,
                  validation: { rule: "must_include", value: "Singapore" },
                },
                ...getComplianceDeclarations(),
              },
            },
          },
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: {
            ...getCoreFinancialFields(),
            existingLoans: {
              type: "select",
              label: "Existing Business Loans?",
              options: ["Yes", "No"],
              required: true,
            },
            outstandingLoanAmount: {
              type: "number",
              label: "Outstanding Loan Amount",
              visibility: { dependsOn: "existingLoans", equals: "Yes" },
            },
            lendingBank: {
              type: "text",
              label: "Lending Bank",
              visibility: { dependsOn: "existingLoans", equals: "Yes" },
            },
          },
        },
        {
          id: "step4",
          label: "Documents",
          fields: {
            ACRABusinessProfile: {
              type: "file",
              label: "ACRA Business Profile",
              required: true,
            },
            LLPResolution: {
              type: "file",
              label: "LLP Resolution",
              required: true,
            },
            proofOfAddress: {
              type: "file",
              label: "Proof of Business Address",
              required: true,
            },
            bankStatement: {
              type: "file",
              label: "Bank Statement (Last 3 months)",
              required: true,
            },
          },
        },
      ],
    },

    private_limited: {
      label: "Private Limited Company (Pte Ltd)",
      ubo: { threshold: 25, autoDetect: true, requireFullKYC: true },
      steps: [
        {
          id: "step2",
          label: "Basic Info & Shareholders",
          fields: {
            companyName: {
              type: "text",
              label: "Company Name",
              required: true,
            },
            uen: { type: "text", label: "UEN", required: true },
            incorporationDate: {
              type: "date",
              label: "Incorporation Date",
              required: true,
            },
            companyStatus: {
              type: "text",
              label: "Company Status",
              required: true,
            },
            registeredAddress: {
              type: "textarea",
              label: "Registered Address",
              required: true,
            },
            businessIndustry: {
              type: "checkbox",
              label: "Business Industry",
              required: true,
              option: INDUSTRY_OPTIONS,
              placeholder: "Select your industry",
            },
            email: { type: "email", label: "Email", required: true },
            phone: { type: "text", label: "Phone", required: true },
          },
          repeatableSections: {
            directors: {
              label: "Director",
              storage: "individuals",
              min: 1,
              fields: {
                role: {
                  type: "text",
                  label: "Role",
                  value: "Director",
                  readonly: true,
                },
                sharePercentage: {
                  type: "number",
                  label: "Share Percentage (%)",
                  min: 0,
                  max: 100,
                  required: true,
                },
                ...getIndividualFields(),
                ...getComplianceDeclarations(),
              },
            },
            shareholders: {
              label: "Shareholder",
              storage: "individuals",
              min: 1,
              fields: {
                shareholderType: {
                  type: "select",
                  label: "Shareholder Type",
                  options: ["Individual", "Corporate"],
                  required: true,
                },
                conditionalFields: {
                  Individual: {
                    name: { type: "text", label: "Name", required: true },
                    idNumber: {
                      type: "text",
                      label: "NRIC / Passport Number",
                      required: true,
                    },
                    idDocument: {
                      type: "file",
                      label: "National ID / Passport Document",
                      required: false,
                    },
                    sharePercentage: {
                      type: "number",
                      label: "Share Percentage (%)",
                      min: 0,
                      max: 100,
                      required: true,
                    },
                  },
                  Corporate: {
                    name: { type: "text", label: "Name", required: true },
                    idOrRegistrationNumber: {
                      type: "text",
                      label: "UEN / Registration Number",
                    },
                    idDocument: {
                      type: "file",
                      label: "UEN / Registration Number Document",
                      required: false,
                    },
                    sharePercentage: {
                      type: "number",
                      label: "Share Percentage (%)",
                      min: 0,
                      max: 100,
                      required: true,
                    },
                  },
                },
                ...getComplianceDeclarations(),
              },
            },
            // --- UBO conditional field ---
            ultimateBeneficialOwner: {
              type: "conditional",
              label: "Ultimate Beneficial Owner (UBO)",
              storage: "individuals",
              description:
                "Auto-detected if shareholding ≥25%. Requires full KYC. Manual add allowed for control through other means.",
              condition: (shareholder) => shareholder.sharePercentage >= 25,
              fields: {
                uboName: {
                  type: "text",
                  label: "UBO Full Name",
                  required: true,
                },
                uboIdDocument: {
                  type: "file",
                  label: "UBO ID / Passport",
                  required: true,
                },
                uboResidentialAddress: {
                  type: "textarea",
                  label: "UBO Residential Address",
                  required: true,
                },
                uboNationality: {
                  type: "text",
                  label: "UBO Nationality",
                  required: true,
                },
                uboDateOfBirth: {
                  type: "date",
                  label: "UBO Date of Birth",
                  required: true,
                },
                ...getComplianceDeclarations(),
              },
            },
          },
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: {
            ...getCoreFinancialFields(),
            expectedTransactionSize: {
              type: "number",
              label: "Expected Transaction Size",
            },
            countriesTransactingWith: {
              type: "checkbox",
              label: "Countries Transacting With",
              option: COUNTRIES(),
            },
          },
        },
        {
          id: "step4",
          label: "Documents",
          fields: {
            ACRABusinessProfile: {
              type: "file",
              label: "ACRA Business Profile",
              required: true,
            },
            boardResolution: {
              type: "file",
              label: "Board Resolution",
              required: true,
            },
            proofOfBusinessAddress: {
              type: "file",
              label: "Proof of Business Address",
              required: true,
            },
            bankStatement: {
              type: "file",
              label: "Bank Statement (Last 3 months)",
              required: true,
            },
          },
        },
      ],
    },
  },
};

export { SINGAPORE_CONFIG };
