/**
 * Singapore SME Onboarding Configuration
 * Version: v1
 */

//////////////////////////
//HELPER FIELD SETS //
//////////////////////////

function getBasicBusinessFields() {
  return {
    businessName: { type: "text", label: "Business Name", required: true },
    uen: { type: "text", label: "UEN / Registration Number", required: true },
    registrationDate: { type: "date", label: "Registration Date", required: true },
    businessStatus: { type: "text", label: "Business Status", required: true },
    registeredAddress: { type: "textarea", label: "Registered Address", required: true },
    email: { type: "email", label: "Email", required: true },
    phone: { type: "text", label: "Phone", required: true }
  };
}

function getIndividualFields() {
  return {
    fullName: { type: "text", label: "Full Name", required: true },
    idNumber: { type: "text", label: "NRIC / Passport Number", required: true },
    nationality: { type: "text", label: "Nationality", required: true },
    residentialAddress: { type: "textarea", label: "Residential Address", required: true },
    dateOfBirth: { type: "date", label: "Date of Birth", required: true }
  };
}

function getCoreFinancialFields() {
  return {
    bankAccountNumber: { type: "text", label: "Bank Account Number", required: true },
    swiftBic: { type: "text", label: "SWIFT / BIC", required: true },
    accountCurrency: { type: "text", label: "Account Currency", required: true },
    annualRevenue: { type: "number", label: "Annual Revenue", required: true },
    tin: { type: "text", label: "Tax Identification Number (TIN)", required: true },
    expectedMonthlyTransactionVolume: { type: "number", label: "Expected Monthly Transaction Volume", required: true },
    sourceOfFunds: { type: "textarea", label: "Source of Funds", required: true }
  };
}

function getComplianceDeclarations() {
  return {
    pepDeclaration: {
      type: "checkbox",
      label: "Politically Exposed Person (PEP)",
      options: ["Yes", "No"],
      conditionalFields: {
        Yes: {
          country: { type: "text", label: "Country" },
          position: { type: "text", label: "Position Held" },
          relationship: { type: "text", label: "Relationship Type" },
          period: { type: "text", label: "Period" }
        }
      }
    },
    sanctionsDeclaration: {
      type: "checkbox",
      label: "Subject to Sanctions",
      options: ["Yes", "No"],
      conditionalFields: {
        Yes: { details: { type: "textarea", label: "Provide Details" } }
      }
    },
    taxResidency: {
      country: { type: "text", label: "Country of Tax Residency" },
      tin: { type: "text", label: "TIN" }
    },
    fatcaDeclaration: {
      type: "checkbox",
      label: "U.S. Citizen / Tax Resident",
      options: ["Yes", "No"]
    }
  };
}

///////////////////////////////
// 🔹 SINGAPORE CONFIG
///////////////////////////////

const SINGAPORE_CONFIG = {
  country: {
    code: "SG",
    name: "Singapore",
    currency: "SGD",
    regulator: "MAS",
    uboThreshold: 25
  },

  entities: {
    sole_proprietorship: {
      label: "Sole Proprietorship",
      steps: [
        {
          id: "step2",
          label: "Basic Information",
          fields: {
            // acraProfileUpload: { type: "file", label: "Upload ACRA Business Profile (OCR Autofill)", required: true },
            ...getBasicBusinessFields()
          },
          repeatableSections: {
            owners: { label: "Owner", min: 1, max: 1, fields: { ...getIndividualFields()} }
          }
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: getCoreFinancialFields()
        },
        {
          id: "step4",
          label: "Compliance & Documents",
          fields: {...getComplianceDeclarations()},
          documents: ["Owner ID", "Proof of Business Address", "Bank Statement (Last 3 months)"]
        }
      ]
    },

    general_partnership: {
      label: "General Partnership",
      steps: [
        {
          id: "step2",
          label: "Basic Information",
          fields: getBasicBusinessFields(),
          repeatableSections: {
            partners: { label: "Partner", min: 2, fields: { ...getIndividualFields() } }
          }
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: getCoreFinancialFields(),
          repeatableSections: {
            partnerFinancials: {
              label: "Partner Financial",
              min: 2,
              fields: {
                capitalContribution: { type: "number", label: "Capital Contribution ($)", required: true },
                profitSharingRatio: { type: "number", label: "Profit Sharing Ratio (%)", required: true }
              }
            }
          }
        },
        {
          id: "step4",
          label: "Compliance & Documents",
          fields: {...getComplianceDeclarations()},
          documents: ["IDs of ALL partners", "Partnership Agreement", "Proof of Business Address", "Bank Statement"]
        }
      ]
    },

    limited_partnership: {
      label: "Limited Partnership (LP)",
      steps: [
        {
          id: "step2",
          label: "Basic Information",
          fields: getBasicBusinessFields(),
          repeatableSections: {
            generalPartners: { label: "General Partner", min: 1, fields: { ...getIndividualFields() } },
            limitedPartners: { label: "Limited Partner", min: 0, fields: { ...getIndividualFields() } }
          }
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: { ...getCoreFinancialFields(), totalCapitalContribution: { type: "number", label: "Total Capital Contribution", required: true }, generalPartnerCapitalContribution: { type: "number", label: "General Partner Capital Contribution", required: true } }
        },
        {
          id: "step4",
          label: "Compliance & Documents",
          fields: {...getComplianceDeclarations()},
          documents: ["IDs of GP and LP", "LP Agreement", "Proof of Address", "Bank Statement"]
        }
      ]
    },

    llp: {
      label: "Limited Liability Partnership (LLP)",
      steps: [
        {
          id: "step2",
          label: "Basic Information",
          fields: {
            llpName: { type: "text", label: "LLP Name", required: true },
            uen: { type: "text", label: "UEN", required: true },
            registrationDate: { type: "date", label: "Registration Date", required: true },
            registeredAddress: { type: "textarea", label: "Registered Address", required: true },
            email: { type: "email", label: "Email", required: true },
            phone: { type: "text", label: "Phone", required: true }
          },
          repeatableSections: {
            partners: { label: "Partner", min: 1, fields: { ...getIndividualFields() } },
            managers: { label: "Manager", min: 1, fields: { ...getIndividualFields(), nationality: { type: "text", label: "Nationality", required: true, validation: { rule: "must_include", value: "Singapore" } } } }
          }
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: { ...getCoreFinancialFields(), existingLoans: { type: "select", label: "Existing Business Loans?", options: ["Yes", "No"], required: true }, outstandingLoanAmount: { type: "number", label: "Outstanding Loan Amount", visibility: { dependsOn: "existingLoans", equals: "Yes" } }, lendingBank: { type: "text", label: "Lending Bank", visibility: { dependsOn: "existingLoans", equals: "Yes" } } }
        },
        {
          id: "step4",
          label: "Compliance & Documents",
          fields: {...getComplianceDeclarations()},
          documents: ["ACRA Business Profile", "IDs of Partners", "LLP Resolution", "Proof of Address", "Bank Statement"]
        }
      ]
    },

    private_limited: {
      label: "Private Limited Company (Pte Ltd)",
      ubo: { threshold: 25, autoDetect: true, requireFullKYC: true },
      steps: [
        {
          id: "step2",
          label: "Basic Info & Shareholders",
          fields: {
            companyName: { type: "text", label: "Company Name", required: true },
            uen: { type: "text", label: "UEN", required: true },
            incorporationDate: { type: "date", label: "Incorporation Date", required: true },
            companyStatus: { type: "text", label: "Company Status", required: true },
            registeredAddress: { type: "textarea", label: "Registered Address", required: true },
            email: { type: "email", label: "Email", required: true },
            phone: { type: "text", label: "Phone", required: true }
          },
          repeatableSections: {
            directors: { label: "Director", min: 1, fields: { ...getIndividualFields() } },
            shareholders: {
              label: "Shareholder",
              min: 1,
              fields: {
                shareholderType: { type: "select", label: "Type", options: ["Individual", "Corporate"], required: true },
                name: { type: "text", label: "Name", required: true },
                idOrRegistrationNumber: { type: "text", label: "ID / Registration Number" },
                sharePercentage: { type: "number", label: "Share Percentage", required: true }
              }
            }
          }
        },
        {
          id: "step3",
          label: "Financial Details",
          fields: { ...getCoreFinancialFields(), expectedTransactionSize: { type: "number", label: "Expected Transaction Size" }, countriesTransactingWith: { type: "textarea", label: "Countries Transacting With" } }
        },
        {
          id: "step4",
          label: "Compliance Documentation",
          fields: {...getComplianceDeclarations()},
          documents: ["ACRA Business Profile", "Board Resolution", "IDs of Directors", "IDs of UBOs (≥25%)", "Proof of Business Address", "Bank Statements (3 months)" ]
        }
      ]
    }
  }
};

export default SINGAPORE_CONFIG;