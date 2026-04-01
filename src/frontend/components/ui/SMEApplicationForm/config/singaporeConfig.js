/**
 * Singapore SME Onboarding Configuration
 * Version: v1
 */

//////////////////////////
//HELPER FIELD SETS //
//////////////////////////
import { COUNTRIES } from "../utils/countries";
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
      placeholder: "Upload PDF, then wait for Autofill",
      ocrTarget: "business_profile",
      ocr: true,
    },
    businessName: {
      type: "text",
      label: "Business Name",
      required: true,
      placeholder: "Enter your registered business name",
    },
    businessIndustry: {
      type: "select",
      label: "Business Industry",
      required: true,
      options: INDUSTRY_OPTIONS,
      placeholder: "Select your business industry",
    },
    uen: {
      type: "text",
      label: "UEN / Registration Number",
      required: true,
      placeholder: "Enter your UEN / Registration Number",
    },
    registrationDate: {
      type: "date",
      label: "Registration Date",
      required: true,
      placeholder: "Enter your registration date",
    },
    businessStatus: {
      type: "select",
      label: "Business Status",
      required: true,
      options: [
        { label: "Active", value: "Active" },
        { label: "Dormant", value: "Dormant" },
        { label: "Struck Off", value: "Struck Off" },
      ],
      placeholder: "Select your business status",
    },
    registeredAddress: {
      type: "textarea",
      label: "Registered Address",
      required: true,
      placeholder: "Enter your registered address",
    },
    email: {
      type: "email",
      label: "Email",
      required: true,
      placeholder: "Enter your email",
    },
    phone: {
      type: "text",
      label: "Phone",
      required: true,
      placeholder: "Enter your phone number",
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
      label: "NRIC / Passport Number",
      required: true,
      placeholder: "For Singapore citizens, use your NRIC / Passport Number",
    },
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
    // idDocument: {
    //   type: "file",
    //   label: "National ID / Passport Document",
    //   required: true,
    // },
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
      placeholder: "Enter your account currency",
    },
    annualRevenue: {
      type: "number",
      label: "Annual Revenue ($)",
      required: true,
      placeholder: "Enter your annual revenue",
    },
    // taxResidency: {
    //   country: {
    //     type: "select",
    //     label: "Country of Tax Residency",
    //     required: true,

    //     options: COUNTRIES(),
    //   },
    //   tin: { type: "text", label: "TIN", required: true },
    // },
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
      placeholder: "Enter your expected monthly transaction volume",
    },
    sourceOfFunds: {
      type: "textarea",
      label: "Source of Funds",
      required: true,
      placeholder: "Enter your main source of funds",
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
      placeholder:
        "A PEP is someone who holds or has held a prominent public position (e.g. government official, senior politician, judge, military officer), or their close associates.",
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
            placeholder:
              "E.g., Minister, Member of Parliament, Judge, Senior Military Officer, State-Owned Enterprise Director",
          },
          relationship: {
            type: "text",
            label: "Relationship Type",
            required: false,
            placeholder: "Only required if your close associate is a PEP",
          },
          period: {
            type: "text",
            label: "Period",
            required: true,
            placeholder: "Enter period of service",
          },
        },
      },
    },
    sanctionsDeclaration: {
      type: "select",
      label: "Subject to Sanctions ",
      required: true,
      placeholder:
        "Select 'Yes' if you or your business is listed on any government or international sanctions list or subject to financial restrictions",
      options: YES_NO_OPTIONS,
      conditionalFields: {
        Yes: {
          details: {
            type: "textarea",
            label: "Provide Details",
            required: true,
            placeholder:
              "E.g., Listed on OFAC sanctions list, subject to UN sanctions, restricted by EU financial measures, or involved in a sanctioned entity.",
          },
        },
      },
    },
    fatcaDeclaration: {
      type: "select",
      required: true,
      placeholder:
        "Select 'Yes' if you are a U.S. citizen, U.S. tax resident, or required to file taxes in the United States",
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
    // currency: "SGD",
    // regulator: "MAS",
    // uboThreshold: 25,
  },

  entities: {
    // 1st business type
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
              rowTypeField: "role",
              rowTypeValue: "Owner",
              min: 1,
              max: 1,
              fields: {
                kyc: {
                  type: "kyc",
                  label: "Liveness Detection Test",
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
          fields: getCoreFinancialFields(),
        },
        {
          id: "step4",
          label: "Documents",
          fields: {
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
              rowTypeField: "role",
              rowTypeValue: "General Partner",
              min: 1,
              fields: {
                kyc: {
                  type: "kyc",
                  label: "Liveness Detection Test",
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
                // },
                ...getIndividualFields(),
                ...getComplianceDeclarations(),
              },
            },
            limitedPartners: {
              label: "Limited Partner",
              storage: "individuals",
              rowTypeField: "role",
              rowTypeValue: "Limited Partner",
              min: 0,
              fields: {
                role: {
                  type: "text",
                  label: "Role",
                  value: "Limited Partner (Of Ownership < 25%)",
                  readonly: true,
                },
                sharePercentage: {
                  type: "number",
                  label: "Share Percentage (%)",
                  min: 0,
                  max: 24,
                  required: true,
                },
                idDocument: {
                  type: "file",
                  label: "National ID / Passport Document",
                  required: true,
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
              min: 0,
              fields: {
                kyc: {
                  type: "kyc",
                  label: "Liveness Detection Test",
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
                  min: 25,
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
    llp: {
      label: "Limited Liability Partnership (LLP)",
      steps: [
        {
          id: "step2",
          label: "Basic Information",
          fields: {
            llpName: {
              type: "text",
              label: "LLP Name",
              required: true,
              placeholder: "Enter your LLP name",
            },
            businessIndustry: {
              type: "checkbox",
              label: "Business Industry",
              required: true,
              option: INDUSTRY_OPTIONS,
              placeholder: "Select your industry",
            },
            uen: {
              type: "text",
              label: "UEN",
              required: true,
              placeholder: "Enter your UEN / Registration Number",
            },
            registrationDate: {
              type: "date",
              label: "Registration Date",
              required: true,
              placeholder: "Enter your registration date",
            },
            registeredAddress: {
              type: "textarea",
              label: "Registered Address",
              required: true,
              placeholder: "Enter your registered address",
            },
            email: {
              type: "email",
              label: "Email",
              required: true,
              placeholder: "Enter your email",
            },
            phone: {
              type: "text",
              label: "Phone",
              required: true,
              placeholder: "Enter your phone number",
            },
          },
          repeatableSections: {
            partners: {
              label: "Partner",
              storage: "individuals",
              rowTypeField: "role",
              rowTypeValue: "Partner",
              min: 1,
              fields: {
                kyc: {
                  type: "kyc",
                  label: "Liveness Detection Test",
                },
                role: {
                  type: "text",
                  label: "Role",
                  value: "Partner",
                  readonly: true,
                },
                // sharePercentage: {
                //   type: "number",
                //   label: "Share Percentage (%)",
                //   min: 0,
                //   max: 100,
                //   required: true,
                // },
                ...getIndividualFields(),
                ...getComplianceDeclarations(),
              },
            },
            managers: {
              label: "Manager",
              storage: "individuals",
              rowTypeField: "role",
              rowTypeValue: "Manager",
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
                idDocument: {
                  type: "file",
                  label: "National ID / Passport Document",
                  required: true,
                },
                ...getIndividualFields(),
                // nationality: {
                //   type: "text",
                //   label: "Nationality",
                //   required: true,
                //   validation: { rule: "must_include", value: "Singapore" },
                // },
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
          },
        },
        {
          id: "step4",
          label: "Documents",
          fields: {
            LLPResolution: {
              type: "file",
              label: "LLP Resolution",
              required: true,
            },
            proofOfAddress: {
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
    // 4th business type
    private_limited: {
      label: "Private Limited Company (Pte Ltd)",
      // ubo: { threshold: 25, autoDetect: true, requireFullKYC: true },
      steps: [
        {
          id: "step2",
          label: "Basic Info & Shareholders",
          fields: {
            companyName: {
              type: "text",
              label: "Company Name",
              placeholder: "Enter your company name",
              required: true,
            },
            uen: {
              type: "text",
              label: "UEN",
              required: true,
              placeholder: "Enter your UEN / Registration Number",
            },
            incorporationDate: {
              type: "date",
              label: "Incorporation Date",
              required: true,
              placeholder: "Enter your incorporation date",
            },
            companyStatus: {
              type: "text",
              label: "Company Status",
              required: true,
              placeholder: "Enter your company status",
            },
            registeredAddress: {
              type: "textarea",
              label: "Registered Address",
              required: true,
              placeholder: "Enter your registered address",
            },
            businessIndustry: {
              type: "checkbox",
              label: "Business Industry",
              required: true,
              option: INDUSTRY_OPTIONS,
              placeholder: "Select your industry",
            },
            email: {
              type: "email",
              label: "Email",
              required: true,
              placeholder: "Enter your email",
            },
            phone: {
              type: "text",
              label: "Phone",
              required: true,
              placeholder: "Enter your phone number",
            },
          },
          repeatableSections: {
            directors: {
              label: "Director",
              storage: "individuals",
              rowTypeField: "role",
              rowTypeValue: "Director",
              min: 1,
              fields: {
                kyc: {
                  type: "kyc",
                  label: "Liveness Detection Test",
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
                // },
                ...getIndividualFields(),
                ...getComplianceDeclarations(),
              },
            },
            shareholders: {
              label: "Shareholder",
              storage: "individuals",
              rowTypeField: "role",
              rowTypeValue: "Shareholder",
              min: 1,
              fields: {
                shareholderType: {
                  type: "select",
                  label: "Shareholder Type",
                  options: [
                    { label: "Individual", value: "Individual" },
                    { label: "Corporate", value: "Corporate" },
                  ],
                  required: true,
                  placeholder: "Select your shareholder type",
                },
                conditionalFields: {
                  Individual: {
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
                    idDocument: {
                      type: "file",
                      label: "National ID / Passport Document",
                      required: true,
                    },
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
                    sharePercentage: {
                      type: "number",
                      label: "Share Percentage (%)",
                      min: 0,
                      max: 100,
                      required: true,
                      placeholder: "Enter your share percentage",
                    },
                  },
                  Corporate: {
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
                    idDocument: {
                      type: "file",
                      label: "UEN / Registration Number Document",
                      required: true,
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
              ...getComplianceDeclarations(),
            },
          },
          // --- UBO conditional field ---
          ubo: {
            // type: "conditional",
            label: "Ultimate Beneficial Owner (Of Ownership >= 25%)",
            storage: "individuals",
            rowTypeField: "role",
            rowTypeValue: "Ultimate Beneficial Owner",
            // description:
            //   "Auto-detected if shareholding ≥25%. Requires full KYC. Manual add allowed for control through other means.",
            // condition: (shareholder) => shareholder.sharePercentage >= 25,
            fields: {
              kyc: {
                type: "kyc",
                label: "Liveness Detection Test",
              },
              name: {
                type: "text",
                label: "Full Name",
                placeholder: "Enter your full legal name",
                required: true,
              },
              idDocument: {
                type: "file",
                label: "ID Document / Passport",
                required: true,
              },
              residentialAddress: {
                type: "textarea",
                label: "Residential Address",
                placeholder: "Enter your residential address",
                required: true,
              },
              nationality: {
                type: "select",
                options: COUNTRIES(),
                label: "Nationality",
                placeholder: "Select your nationality",
                required: true,
              },
              dateOfBirth: {
                type: "date",
                label: "Date of Birth",
                required: true,
              },
              basisOfControl: {
                type: "select",
                label: "Basis of Control",
                options: [
                  {
                    label: "Indirect ownership through another entity",
                    value: "Indirect ownership through another entity",
                  },
                  {
                    label: "Control through voting rights",
                    value: "Control through voting rights",
                  },
                  {
                    label: "Control through agreements or other arrangements",
                    value: "Control through agreements or other arrangements",
                  },
                  {
                    label: "Control through voting rights",
                    value: "Control through voting rights",
                  },
                ],
              },
              ...getComplianceDeclarations(),
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
            boardResolution: {
              type: "file",
              label: "Board Resolution",
              required: true,
            },
            uboDeclaration: {
              type: "file",
              label: "UBO/Ownership Declaration",
              placeholder:
                "* Mandatory if there is a Corporate stakeholder OR UBO added manually had no shareholder of >= 25% in shares",
              required: false,
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
  },
};

export { SINGAPORE_CONFIG };
