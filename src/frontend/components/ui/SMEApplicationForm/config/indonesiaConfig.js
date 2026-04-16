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
  {
    label: "Retail sale via internet (47911)",
    value: "Retail sale via internet (47911)",
  },
  {
    label: "Retail store / minimarket (47111)",
    value: "Retail store / minimarket (47111)",
  },
  {
    label: "Wholesale food & beverages (46339)",
    value: "Wholesale food & beverages (46339)",
  },
  {
    label: "Restaurant activities (56101)",
    value: "Restaurant activities (56101)",
  },
  {
    label: "Cafe / beverage service (56301)",
    value: "Cafe / beverage service (56301)",
  },
  {
    label: "Software development (62011)",
    value: "Software development (62011)",
  },
  { label: "IT consulting (62021)", value: "IT consulting (62021)" },
  {
    label: "Business management consulting (70209)",
    value: "Business management consulting (70209)",
  },
  {
    label: "Real estate buying / selling (68110)",
    value: "Real estate buying / selling (68110)",
  },
  {
    label: "Property rental and leasing (68200)",
    value: "Property rental and leasing (68200)",
  },
  {
    label: "Freight forwarding / logistics (52291)",
    value: "Freight forwarding / logistics (52291)",
  },
  {
    label: "Wholesale computers & electronics (46491)",
    value: "Wholesale computers & electronics (46491)",
  },
];

function getBasicBusinessFields() {
  return {
    businessRegistrationUpload: {
      type: "file",
      label: "Upload Business Registration / NIB",
      required: true,
      ocr: true,
      ocrTarget: "business_profile",
      placeholder: "Upload PDF, then wait for Autofill",
    },
    businessName: {
      type: "text",
      label: "Business Name",
      required: true,
      placeholder: "Enter your registered business name",
      validate: {
        minLength: 2,
        maxLength: 120,
      },
    },
    registrationNumber: {
      type: "text",
      label: "Business Registration Number / NIB",
      required: true,
      placeholder: "Enter NIB / Registration Number",
      validate: {
        pattern: /^[0-9]{8,20}$/,
        message: "Registration number must be 8 to 20 digits.",
      },
    },
    npwp: {
      type: "text",
      label: "NPWP (Tax ID)",
      required: true,
      placeholder:
        "NPWP/TIN may appear in 15-digit or 16-digit format. Enter digits only.",
      validate: {
        pattern: /^[0-9]{15,16}$/,
        message: "NPWP must be 15 or 16 digits.",
      },
    },
    registrationDate: {
      type: "date",
      label: "Date of Registration",
      required: true,
    },
    registeredAddress: {
      type: "textarea",
      label: "Registered Address",
      required: true,
      placeholder: "Enter your business's registered address",
    },
    email: {
      type: "email",
      label: "Email",
      required: true,
      placeholder: "Enter your email",
      validate: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Enter a valid email address.",
      },
    },
    phone: {
      type: "text",
      label: "Phone",
      required: true,
      placeholder: "Enter your phone number",
      validate: {
        pattern: /^[0-9+\-()\s]{8,20}$/,
        message: "Enter a valid phone number.",
      },
    },
  };
}
function getRepeatableBusinessActivityFields() {
  return {
    primaryBusinessActivity: {
      label: "Business Actvitiy",
      storage: "businessActivities",
      rowTypeField: "activityType",
      rowTypeValue: "Primary",
      min: 1,
      fields: {
        activityType: {
          type: "text",
          label: "Activity Type",
          value: "Primary",
          readonly: true,
        },
        businessActivity: {
          type: "select",
          label: "Primary Business Activity (KBLI Code)",
          options: KBLI_OPTIONS,
          required: true,
          placeholder: "Select primary business activity",
        },
        activityDescription: {
          type: "textarea",
          label: "Description",
          placeholder:
            "E.g., Online sale of cosmetics through Shopee marketplace",
          required: true,
          validate: {
            minLength: 10,
            maxLength: 300,
          },
        },
      },
    },
  };
}

function getIndividualFields() {
  return {
    fullName: {
      type: "text",
      label: "Full Name",
      required: true,
      placeholder: "Enter your full legal name",
    },
    idNumber: {
      type: "text",
      label: "KTP / Passport Number",
      required: true,
      placeholder: "For Indonesian citizens, use the 16-digit NIK from the KTP",
    },
    // idDocument: {
    //   type: "file",
    //   label: "KTP / Passport Document",
    //   required: true,
    // },
    nationality: {
      type: "select",
      label: "Nationality",
      required: true,
      options: COUNTRIES(),
      placeholder: "Select your nationality",
    },
    residentialAddress: {
      type: "textarea",
      label: "Residential Address",
      required: true,
      placeholder: "Enter your residential address",
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
      placeholder: "Enter your bank account number",
    },
    swiftBic: {
      type: "text",
      label: "SWIFT / BIC",
      required: true,
      placeholder:
        "Enter the SWIFT/BIC code if applicable for international banking, e.g., BMRIIDJA",
    },
    accountCurrency: {
      type: "text",
      label: "Account Currency",
      required: true,
      placeholder: "Enter the currency of the bank account, e.g., IDR, SGD",
    },
    annualRevenue: {
      type: "number",
      label: "Annual Revenue",
      required: true,
      placeholder: "Enter your annual revenue",
    },
    // npwp: {
    //   type: "text",
    //   label: "Tax Identification Number (NPWP)",
    //   required: true,
    //   placeholder: "NPWP/TIN may appear in 15-digit or 16-digit format",
    // },
    expectedMonthlyTransactionVolume: {
      type: "number",
      label: "Expected Monthly Transaction Volume",
      required: true,
      placeholder: "Enter your expected monthly transaction volume",
    },
    sourceOfFunds: {
      type: "textarea",
      label: "Source of Funds",
      required: true,
      placeholder: "Enter your main source of funds",
    },
    expectedCountriesOfTransactionActivity: {
      type: "checkbox",
      label: "Expected Countries of Transactions",
      options: COUNTRIES(),
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
          position: {
            type: "text",
            label: "Position Held",
            required: true,
            placeholder: "E.g., President, Minister of Finance, etc.",
          },
          relationship: {
            type: "text",
            label: "Relationship Type",
            required: true,
            placeholder: "E.g., Family member, Political associate, etc.",
          },
          period: {
            type: "text",
            label: "Period",
            required: true,
            placeholder: "E.g., 2020 - 2023",
          },
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
// INDONESIA CONFIG
///////////////////////////////

const INDONESIA_CONFIG = {
  country: {
    code: "ID",
    name: "Indonesia",
    currency: "IDR",
  },

  entities: {
    // 1st business type
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
          },
        },
        {
          id: "step2",
          label: "Basic Information",
          fields: {
            businessRegistrationUpload: {
              type: "file",
              label: "Upload Business Registration / NIB (OCR autofill)",
              required: true,
              ocrTarget: "business_profile",
            },
            ...getBasicBusinessFields(),
          },
          repeatableSections: {
            ...getRepeatableBusinessActivityFields(),
            owners: {
              label: "Owner",
              storage: "individuals",
              rowTypeField: "role",
              rowTypeValue: "Owner",
              min: 1,
              max: 1,
              fields: {
                kyc: {
                  type: "kyc",
                  label: "Liveness Detection Test",
                  required: true,
                },
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
          fields: { ...getCoreFinancialFields() },
        },
        {
          id: "step4",
          label: "Required Documents",
          fields: {
            npwpCertificate: {
              type: "file",
              label: "NPWP Certificate",
              required: true,
            },
            proofOfBusinessAddress: {
              type: "file",
              label: "Proof of Business Address",
              placeholder:
                "* Mandatory if operating address differs from registered address",
              required: false,
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
    // 2nd business type
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
          },
        },
        {
          id: "step2",
          label: "Basic Information",
          fields: {
            businessRegistrationUpload: {
              type: "file",
              label: "Upload Deed of Establishment (OCR autofill)",
              required: true,
              ocrTarget: "business_profile",
            },
            ...getBasicBusinessFields(),
          },
          repeatableSections: {
            ...getRepeatableBusinessActivityFields(),
            generalPartners: {
              label: "General Partner",
              storage: "individuals",
              rowTypeField: "role",
              rowTypeValue: "General Partner",
              min: 1,
              fields: {
                kyc: {
                  type: "kyc",
                  label: "Liveness Detection Test",
                  required: true,
                },
                role: {
                  type: "text",
                  label: "Role",
                  value: "General Partner",
                  readonly: true,
                },
                // sharePercentage: {
                //   type: "number",
                //   label: "Share Percentage (%)",
                //   min: 0,
                //   max: 100,
                //   required: true,
                //   placeholder: "Enter the percentage of shares owned",
                // },
                ...getIndividualFields(),
                ...getComplianceDeclarations(),
              },
            },
            limitedPartners: {
              label: "Limited Partner (Of Ownership < 25%)",
              storage: "individuals",
              rowTypeField: "role",
              rowTypeValue: "Limited Partner",
              min: 0,
              fields: {
                kyc: {
                  type: "kyc",
                  label: "Liveness Detection Test",
                  required: true,
                },
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
                  placeholder: "Enter the percentage of shares owned",
                },
                ...getIndividualFields(),
                ...getComplianceDeclarations(),
              },
            },
            ubo: {
              label: "Ultimate Beneficial Owner (Of Ownership >= 25%)",
              storage: "individuals",
              rowTypeField: "role",
              rowTypeValue: "Ultimate Beneficial Owner",
              min: 1,
              fields: {
                kyc: {
                  type: "kyc",
                  label: "Liveness Detection Test",
                  required: true,
                },
                role: {
                  type: "text",
                  label: "Role",
                  value: "Ultimate Beneficial Owner",
                  readonly: true,
                },
                sharePercentage: {
                  type: "number",
                  label: "Share Percentage (%)",
                  min: 0,
                  max: 100,
                  required: true,
                  placeholder: "Enter the percentage of shares owned",
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
          fields: { ...getCoreFinancialFields() },
        },
        {
          id: "step4",
          label: "Required Documents",
          fields: {
            npwpCertificate: {
              type: "file",
              label: "NPWP Certificate",
              required: true,
            },
            proofOfBusinessAddress: {
              type: "file",
              label: "Proof of Business Address",
              placeholder:
                "* Mandatory if operating address differs from registered address",
              required: false,
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
    // 3rd business type
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
          },
        },
        {
          id: "step2",
          label: "Basic Information",
          fields: {
            // incorporationUpload: {
            //   type: "file",
            //   label:
            //     "Upload Certificate of Incorporation / Company Deed (OCR autofill)",
            //   required: true,
            //   ocrTarget: "business_profile",
            // },
            ...getBasicBusinessFields(),
          },
          repeatableSections: {
            ...getRepeatableBusinessActivityFields(),
            directors: {
              label: "Director / Authorized Signatory",
              storage: "individuals",
              rowTypeField: "role",
              rowTypeValue: "Director",
              min: 1,
              fields: {
                kyc: {
                  type: "kyc",
                  label: "Liveness Detection Test",
                  required: true,
                },
                role: {
                  type: "text",
                  label: "Role",
                  value: "Director",
                  readonly: true,
                },
                // sharePercentage: {
                //   type: "number",
                //   label: "Share Percentage (%)",
                //   min: 0,
                //   max: 100,
                //   required: true,
                //   placeholder:
                //     "Enter the percentage of shares owned, if applicable",
                // },
                ...getIndividualFields(),
                ...getComplianceDeclarations(),
                // position: { type: "text", label: "Position", required: true },
                authorizedSignatory: {
                  type: "select",
                  label: "Authorized Signatory",
                  options: YES_NO_OPTIONS,
                  required: true,
                },
              },
            },
            shareholders: {
              label: "Shareholder",
              storage: "individuals",
              rowTypeField: "role",
              rowTypeValue: "Shareholder",
              min: 2,
              fields: {
                role: {
                  type: "text",
                  label: "Role",
                  value: "Shareholder",
                  readonly: true,
                },
                shareholderType: {
                  type: "select",
                  label: "Shareholder Type",
                  // value: "Shareholder",
                  options: [
                    { label: "Individual", value: "Individual" },
                    { label: "Corporate", value: "Corporate" },
                  ],
                  placeholder: "Select your shareholder type",
                  required: true,
                  conditionalFields: {
                    Individual: {
                      sharePercentage: {
                        type: "number",
                        label: "Share Percentage (%)",
                        min: 0,
                        max: 100,
                        required: true,
                        placeholder: "Enter your share percentage",
                      },
                      name: {
                        type: "text",
                        label: "Name",
                        required: true,
                        placeholder: "Enter your full legal name",
                      },
                      idNumber: {
                        type: "text",
                        label: "NRIC / Passport Number",
                        required: true,
                        placeholder:
                          "For Singapore citizens, use the NRIC / Passport Number",
                      },
                      // idDocument: {
                      //   type: "file",
                      //   label: "National ID / Passport Document",
                      //   required: true,
                      // },
                      nationality: {
                        type: "select",
                        label: "Nationality",
                        required: true,
                        options: COUNTRIES(),
                        placeholder: "Select your nationality",
                      },
                      residentialAddress: {
                        type: "textarea",
                        label: "Residential Address",
                        required: true,
                        placeholder: "Enter your residential address",
                      },
                    },
                    Corporate: {
                      sharePercentage: {
                        type: "number",
                        label: "Share Percentage (%)",
                        min: 0,
                        max: 100,
                        required: true,
                        placeholder: "Enter your share percentage",
                      },
                      name: {
                        type: "text",
                        label: "Name",
                        required: true,
                        placeholder: "Enter your entity name",
                      },
                      registrationNumber: {
                        type: "text",
                        label: "UEN / Registration Number",
                        required: true,
                        placeholder: "Enter your UEN / Registration Number",
                      },
                      country: {
                        type: "select",
                        label: "Country of Incorporation",
                        options: COUNTRIES(),
                        required: true,
                        placeholder: "Select your country of incorporation",
                      },
                      registeredAddress: {
                        type: "textarea",
                        label: "Registered Address",
                        required: true,
                        placeholder: "Enter your registered address",
                      },
                    },
                  },
                  // readonly: true,
                },
                // sharePercentage: {
                //   type: "number",
                //   label: "Share Percentage (%)",
                //   min: 0,
                //   max: 100,
                //   required: true,
                //   placeholder: "Enter the percentage of shares owned",
                // },
                // idDocument: {
                //   type: "file",
                //   label: "KTP / Passport Document",
                //   required: true,
                // },
                // ...getIndividualFields(),
                // ...getComplianceDeclarations(),
              },
            },
            ubo: {
              label: "Ultimate Beneficial Owner (Of Ownership >= 25%)",
              // helpText:
              //   "(Owns 25% or more of the company OR Exercises control through other means)",
              storage: "individuals",
              rowTypeField: "role",
              rowTypeValue: "Ultimate Beneficial Owner",
              min: 1,
              fields: {
                kyc: {
                  type: "kyc",
                  label: "Liveness Detection Test",
                  required: true,
                },
                role: {
                  type: "text",
                  label: "Role",
                  value: "Ultimate Beneficial Owner",
                  readonly: true,
                },
                sharePercentage: {
                  type: "number",
                  label: "Share Percentage (%)",
                  min: 0,
                  max: 100,
                  required: true,
                  placeholder: "Enter the percentage of shares owned",
                },
                basisOfControl: {
                  type: "select",
                  label: "Basis of Control",
                  options: [
                    {
                      label: "Direct ownership (≥25%)",
                      value: "Direct ownership (≥25%)",
                    },
                    {
                      label: "Indirect ownership through another entity",
                      value: "Indirect ownership through another entity",
                    },
                    {
                      label: "Control through voting rights",
                      value: "Control through voting rights",
                    },
                    {
                      label: "Control through agreements",
                      value: "Control through agreements",
                    },
                    {
                      label: "Senior managing official (fallback)",
                      value: "Senior managing official (fallback)",
                    },
                  ],
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
          fields: { ...getCoreFinancialFields() },
        },
        {
          id: "step4",
          label: "Required Documents",
          fields: {
            npwpCertificate: {
              type: "file",
              label: "NPWP Certificate",
              required: true,
            },
            deedOfEstablishment: {
              type: "file",
              label: "Deed of Establishment (Akta Pendirian Perusahaan)",
              required: true,
            },
            uboDeclaration: {
              type: "file",
              label: "UBO Declaration",
              required: true,
            },
            proofOfBusinessAddress: {
              type: "file",
              label: "Proof of Business Address",
              placeholder:
                "*Mandatory if operating address differs from registered address",
              required: false,
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
