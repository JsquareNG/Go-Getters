/**
 * Indonesia SME Onboarding Configuration
 * Version: v1
 */

//////////////////////////
// HELPER FIELD SETS //
//////////////////////////
import { COUNTRIES } from "../utils/countries";

const YES_NO_OPTIONS = ["Yes", "No"].map((opt) => ({
  label: opt,
  value: opt,
}));

const KBLI_OPTIONS = [
  { label: "Retail sale via internet (47911)", value: "47911" },
  { label: "Retail store / minimarket (47111)", value: "47111" },
  { label: "Wholesale food & beverages (46339)", value: "46339" },
  { label: "Restaurant activities (56101)", value: "56101" },
  { label: "Cafe / beverage service (56301)", value: "56301" },
  { label: "Software development (62011)", value: "62011" },
  { label: "IT consulting (62021)", value: "62021" },
  { label: "Business management consulting (70209)", value: "70209" },
  { label: "Real estate buying / selling (68110)", value: "68110" },
  { label: "Property rental and leasing (68200)", value: "68200" },
  { label: "Freight forwarding / logistics (52291)", value: "52291" },
  { label: "Wholesale computers & electronics (46491)", value: "46491" },
];

function getBasicBusinessFields() {
  return {
    businessName: { type: "text", label: "Business Name", required: true },
    registrationNumber: {
      type: "text",
      label: "Business Registration Number / NIB",
      required: true,
    },
    npwp: { type: "text", label: "NPWP (Tax ID)", required: true },
    registrationDate: {
      type: "date",
      label: "Date of Registration",
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
    primaryBusinessActivity: {
      type: "select",
      label: "Primary Business Activity (KBLI Code)",
      options: KBLI_OPTIONS,
      required: true,
      placeholder: "Select primary business activity",
    },
    activityDescription: {
      type: "textarea",
      label: "Description",
      placeholder: "E.g., Online sale of cosmetics through Shopee marketplace",
      required: true,
    },
    additionalBusinessActivities: {
      type: "repeatable",
      label: "Additional Business Activities",
      fields: {
        kbliCode: {
          type: "select",
          label: "KBLI Code",
          options: KBLI_OPTIONS,
        },
        description: { type: "text", label: "Description" },
      },
    },
  };
}

function getIndividualFields() {
  return {
    fullName: { type: "text", label: "Full Name", required: true },
    idNumber: { type: "text", label: "KTP / Passport Number", required: true },
    idDocument: {
      type: "file",
      label: "KTP / Passport Document",
      required: true,
    },
    nationality: { type: "text", label: "Nationality", required: true },
    residentialAddress: {
      type: "textarea",
      label: "Residential Address",
      required: true,
    },
    dateOfBirth: { type: "date", label: "Date of Birth", required: true },
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
    npwp: {
      type: "text",
      label: "Tax Identification Number (NPWP)",
      required: true,
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
    expectedCountriesOfTransactionActivity: {
      type: "select",
      label: "Expected Countries of Transactions",
      options: COUNTRIES(),
      required: true,
      multiple: true,
    },
  };
}

///////////////////////////////
// INDONESIA CONFIG
///////////////////////////////

const INDONESIA_CONFIG = {
  country: {
    code: "ID",
    name: "Indonesia",
    currency: "IDR",
  },

  entities: {
    usaha_dagang: {
      label: "Usaha Dagang (UD) – Sole Proprietorship",
      steps: [
        {
          id: "step1",
          label: "To Get Started",
          fields: {
            countryOfOperation: {
              type: "text",
              label: "Country of Operation",
              value: "Indonesia",
              readonly: true,
            },
            businessType: {
              type: "text",
              label: "Business Type",
              value: "Usaha Dagang (UD)",
              readonly: true,
            },
            businessRegistrationUpload: {
              type: "file",
              label: "Upload Business Registration / NIB (OCR autofill)",
              required: true,
            },
          },
        },
        {
          id: "step2",
          label: "Basic Information",
          fields: { ...getBasicBusinessFields() },
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
              },
            },
          },
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: { ...getCoreFinancialFields() },
        },
        {
          id: "step4",
          label: "Required Documents",
          fields: {
            businessLicense: {
              type: "file",
              label: "Business License (NIB)",
              required: true,
            },
            npwpCertificate: {
              type: "file",
              label: "NPWP Certificate",
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

    commanditaire_vennootschap: {
      label: "Commanditaire Vennootschap (CV) – Limited Partnership",
      steps: [
        {
          id: "step1",
          label: "To Get Started",
          fields: {
            countryOfOperation: {
              type: "text",
              label: "Country of Operation",
              value: "Indonesia",
              readonly: true,
            },
            businessType: {
              type: "text",
              label: "Business Type",
              value: "Commanditaire Vennootschap (CV)",
              readonly: true,
            },
            businessRegistrationUpload: {
              type: "file",
              label: "Upload Deed of Establishment (OCR autofill)",
              required: true,
            },
          },
        },
        {
          id: "step2",
          label: "Basic Information",
          fields: { ...getBasicBusinessFields() },
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
                  value: "Limitied Partner",
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
              },
            },
          },
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: { ...getCoreFinancialFields() },
          repeatableSections: {
            partnerFinancials: {
              label: "Partner Financials",
              min: 1,
              fields: {
                capitalContribution: {
                  type: "number",
                  label: "Capital Contribution (%)",
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
          label: "Required Documents",
          fields: {
            partnerIdDocuments: {
              type: "file",
              label: "IDs of All Partners (KTP / Passport)",
              required: true,
            },
            partnershipAgreement: {
              type: "file",
              label: "Partnership Deed / CV Agreement",
              required: true,
            },
            businessLicense: {
              type: "file",
              label: "Business License (NIB)",
              required: true,
            },
            npwpCertificate: {
              type: "file",
              label: "NPWP Certificate",
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

    perseroan_terbatas: {
      label: "Perseroan Terbatas (PT) – Limited Liability Company",
      steps: [
        {
          id: "step1",
          label: "To Get Started",
          fields: {
            countryOfOperation: {
              type: "text",
              label: "Country of Operation",
              value: "Indonesia",
              readonly: true,
            },
            businessType: {
              type: "text",
              label: "Business Type",
              value: "Perseroan Terbatas (PT)",
              readonly: true,
            },
            incorporationUpload: {
              type: "file",
              label:
                "Upload Certificate of Incorporation / Company Deed (OCR autofill)",
              required: true,
            },
          },
        },
        {
          id: "step2",
          label: "Basic Information",
          fields: { ...getBasicBusinessFields() },
          repeatableSections: {
            shareholders: {
              label: "Shareholder",
              storage: "individuals",
              min: 1,
              fields: {
                role: {
                  type: "text",
                  label: "Role",
                  value: "Shareholder",
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
              },
            },
            directors: {
              label: "Director / Authorized Signatory",
              storage: "individuals",
              min: 1,
              fields: {
                role: {
                  type: "text",
                  label: "Role",
                  value: "Directory",
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
                position: { type: "text", label: "Position", required: true },
                authorizedSignatory: {
                  type: "select",
                  label: "Authorized Signatory",
                  options: YES_NO_OPTIONS,
                  required: true,
                },
              },
            },
          },
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: { ...getCoreFinancialFields() },
        },
        {
          id: "step4",
          label: "Required Documents",
          fields: {
            certificateOfIncorporation: {
              type: "file",
              label: "Certificate of Incorporation",
              required: true,
            },
            articlesOfAssociation: {
              type: "file",
              label: "Articles of Association",
              required: true,
            },
            businessLicense: {
              type: "file",
              label: "Business License (NIB)",
              required: true,
            },
            npwpCertificate: {
              type: "file",
              label: "NPWP Certificate",
              required: true,
            },
            directorShareholderIds: {
              type: "file",
              label: "IDs of Directors & Shareholders",
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

    foreign_company_branch: {
      label: "Foreign Company / Branch",
      steps: [
        {
          id: "step1",
          label: "To Get Started",
          fields: {
            countryOfOperation: {
              type: "text",
              label: "Country of Operation",
              value: "Indonesia",
              readonly: true,
            },
            businessType: {
              type: "text",
              label: "Business Type",
              value: "Foreign Company / Branch",
              readonly: true,
            },
            incorporationUpload: {
              type: "file",
              label:
                "Upload Parent Company Incorporation Document (OCR autofill)",
              required: true,
            },
          },
        },
        {
          id: "step2",
          label: "Basic Information",
          fields: {
            parentCompanyName: {
              type: "text",
              label: "Parent Company Name",
              required: true,
            },
            countryOfIncorporation: {
              type: "text",
              label: "Country of Incorporation",
              required: true,
            },
            companyRegistrationNumber: {
              type: "text",
              label: "Company Registration Number",
              required: true,
            },
            registeredAddress: {
              type: "textarea",
              label: "Registered Address",
              required: true,
            },
            indonesianBranchNumber: {
              type: "text",
              label: "Indonesian Branch Registration Number",
              required: true,
            },
            npwp: { type: "text", label: "NPWP", required: true },
            email: { type: "email", label: "Email", required: true },
            phone: { type: "text", label: "Phone", required: true },
            primaryBusinessActivity: {
              type: "select",
              label: "Primary Business Activity (KBLI Code)",
              options: KBLI_OPTIONS,
              required: true,
            },
            activityDescription: {
              type: "textarea",
              label: "Description",
              required: true,
            },
          },
          repeatableSections: {
            parentCompanyDirectors: {
              label: "Parent Company Director",
              storage: "individuals",
              min: 1,
              fields: {
                ...getIndividualFields(),
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
              },
            },
            localRepresentatives: {
              label: "Indonesian Branch Representative",
              storage: "individuals",
              min: 1,
              fields: {
                ...getIndividualFields(),
                residencyPermit: {
                  type: "text",
                  label: "Residency Permit (KITAS)",
                },
                role: {
                  type: "text",
                  label: "Role",
                  value: "Local Representative",
                  readonly: true,
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
          },
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: { ...getCoreFinancialFields() },
        },
        {
          id: "step4",
          label: "Required Documents",
          fields: {
            parentCompanyIncorporation: {
              type: "file",
              label: "Parent Company Certificate of Incorporation",
              required: true,
            },
            foreignBusinessRegistrationExtract: {
              type: "file",
              label: "Foreign Business Registration Extract",
              required: true,
            },
            branchRegistration: {
              type: "file",
              label: "Indonesian Branch Registration",
              required: true,
            },
            businessLicense: {
              type: "file",
              label: "Business License (NIB)",
              required: true,
            },
            directorsPassport: {
              type: "file",
              label: "Passport of Directors",
              required: true,
            },
            kitas: { type: "file", label: "KITAS (if applicable)" },
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

export { INDONESIA_CONFIG };
