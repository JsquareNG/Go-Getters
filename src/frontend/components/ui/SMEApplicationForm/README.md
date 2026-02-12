# SME Application Form - Comprehensive Documentation

## Overview

The **SMEApplicationForm** is a highly dynamic, multi-step React component designed for SMEs to apply for cross-border payment capabilities. It features intelligent conditional rendering based on country and business type selections.

## Features

- ✅ **4-Step Form Process**: Basic Info → Financial → Compliance → Review
- ✅ **Dynamic Country-Specific Fields**: Automatically shows fields based on selected country
- ✅ **Dynamic Business-Type-Specific Fields**: Automatically shows fields based on business type
- ✅ **Intelligent Validation**: Rules adapt based on selections
- ✅ **File Upload with Validation**: Support for PDF and image formats with size limits
- ✅ **Form State Persistence**: Data retained when navigating between steps
- ✅ **Progress Tracking**: Visual stepper showing current step
- ✅ **Comprehensive Review**: Full review of entered data before submission
- ✅ **Toast Notifications**: User feedback on actions and errors
- ✅ **Responsive Design**: Works on mobile and desktop

## Installation

No additional dependencies required. Uses existing components from your app:

- `Button`, `Card`, `Input`, `Label` from `@/components/ui`
- `useToast()` hook from `@/hooks/use-toast`

## Quick Start

### Basic Usage

```jsx
import { SMEApplicationForm } from "@/components/ui/SMEApplicationForm";

function NewApplicationPage() {
  const handleSubmitSuccess = (result) => {
    console.log("Application submitted:", result);
    // Redirect to success page or show confirmation
  };

  return (
    <SMEApplicationForm
      onSubmitSuccess={handleSubmitSuccess}
      apiEndpoint="/api/sme/application"
    />
  );
}
```

### Props

| Prop              | Type     | Default                | Description                                        |
| ----------------- | -------- | ---------------------- | -------------------------------------------------- |
| `onSubmitSuccess` | Function | -                      | Callback fired when form is successfully submitted |
| `apiEndpoint`     | String   | `/api/sme/application` | API endpoint to POST the form data                 |

## Form Structure

### Step 1: Basic Information

**Standard Fields:**

- Company Name (required)
- Business Registration Number (required)
- Country of Operation (required)
- Business Type (required)
- Email Address (required)
- Phone Number (required)

**Dynamic Fields:**

- Country-specific fields (e.g., GST for Singapore, EIN for USA)
- Business-type-specific fields (e.g., Owner Name for Sole Proprietorship)

### Step 2: Financial Details

- Bank Account Number (required)
- SWIFT/BIC Code (required)
- Account Currency (required)
- Annual Revenue (required)
- Tax ID (required)

### Step 3: Compliance & Documentation

- KYC Document upload (government-issued ID)
- Business License upload
- Proof of Address upload

### Step 4: Review & Submit

- Complete review of all entered information
- Edit button to go back and modify data
- Final submission button

## Supported Countries

### Singapore (SG)

- GST Registration Number
- Business Registration Number
- ACRA UEN

### Hong Kong (HK)

- Business Registration Certificate Number
- Company Registration Number

### United States (US)

- Employer Identification Number (EIN)
- Social Security Number (optional)

### Malaysia (MY)

- SSM Registration Number
- Tax Identification Number

**Adding New Countries:**

Edit `config/countriesConfig.js`:

```javascript
export const COUNTRIES = {
  // ... existing countries
  IN: {
    name: "India",
    code: "IN",
    currency: "INR",
    fields: {
      gstNumber: {
        label: "GST Number",
        required: true,
        placeholder: "15-digit GST number",
        validation: (value) => /^\d{15}$/.test(value),
        error: "Invalid GST format",
      },
      // ... more fields
    },
  },
};
```

## Supported Business Types

### Sole Proprietorship

- Owner Full Name
- Owner ID Number

### Partnership

- Number of Partners
- Partner Details (CSV format)

### Private Limited Company

- Number of Directors
- Director Details (CSV format)
- Number of Shareholders
- Shareholder Details (CSV format)

### Public Limited Company

- Stock Exchange Listed On
- Ticker Symbol

**Adding New Business Types:**

Edit `config/businessTypesConfig.js`:

```javascript
export const BUSINESS_TYPES = {
  // ... existing types
  FRANCHISE: {
    id: "franchise",
    label: "Franchise",
    description: "Franchise business",
    fields: {
      franchiseName: {
        label: "Franchise Name",
        required: true,
        validation: (value) => value.trim().length >= 3,
        error: "Franchise name is required",
      },
      // ... more fields
    },
  },
};
```

## Validation System

### Predefined Validation Rules

Located in `config/validationRules.js`:

```javascript
- email: Standard email format
- phone: 10+ digits
- bankAccount: 10-34 characters
- swift: SWIFT/BIC format (XXXXXX2!2!3!)
- currency: 3-letter currency code
- annualRevenue: Positive number
- taxId: Alphanumeric with dashes/slashes
- companyName: Min 3 characters
- registrationNumber: Min 5 characters
```

### Custom Validation

Add custom validation to fields:

```javascript
const fieldConfig = {
  label: "Custom Field",
  validation: (value) => {
    // Your validation logic
    return isValid;
  },
  error: "Error message to display",
};
```

### File Validation

```javascript
const options = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
};

const { isValid, error } = validateFile(file, options);
```

## Advanced Usage

### Using the Hook Directly

```jsx
import { useSMEApplicationForm } from "@/components/ui/SMEApplicationForm";

function CustomForm() {
  const {
    state,
    setField,
    setCountrySpecificField,
    setBusinessTypeField,
    setDocument,
    setError,
    nextStep,
    prevStep,
    validateCurrentStep,
    countrySpecificFieldsConfig,
    businessTypeSpecificFieldsConfig,
  } = useSMEApplicationForm();

  // Access form state
  console.log(state.data);
  console.log(state.errors);
  console.log(state.currentStep);

  // Update fields
  setField("companyName", "Acme Corp");
  setCountrySpecificField("gstNumber", "123456789D");
  setBusinessTypeField("ownerName", "John Doe");

  // Validate
  const isValid = validateCurrentStep();
}
```

### Using Individual Steps

```jsx
import {
  Step1BasicInformation,
  Step2FinancialDetails,
} from "@/components/ui/SMEApplicationForm";

function CustomForm() {
  // Your state management
  return (
    <Step1BasicInformation
      data={formData}
      errors={errors}
      touched={touched}
      onFieldChange={handleFieldChange}
      // ... other props
    />
  );
}
```

## API Integration

### Expected Backend Endpoint

`POST /api/sme/application`

**Request Format:**

```javascript
{
  // Basic Information
  companyName: "Acme Corp",
  registrationNumber: "REG123456",
  country: "SG",
  businessType: "private_limited",
  email: "info@acme.com",
  phone: "+65 6123 4567",

  // Dynamic country-specific fields
  countrySpecificFields: {
    gstNumber: "123456789D",
    businessRegistrationNumber: "123456789L",
    acraUEN: "123456789D",
  },

  // Dynamic business-type-specific fields
  businessTypeSpecificFields: {
    directorCount: "2",
    directorDetails: "John Doe, ID123\nJane Smith, ID456",
  },

  // Financial Details
  bankAccountNumber: "1234567890",
  swift: "ICBKSGSG",
  currency: "SGD",
  annualRevenue: "500000",
  taxId: "12-3456789",

  // Documents (FormData)
  kycDocument: File,
  businessLicense: File,
  proofOfAddress: File,
}
```

**Expected Response:**

```javascript
{
  success: true,
  applicationId: "APP123456",
  status: "pending_review",
  message: "Application submitted successfully",
}
```

## State Management

### Form State Structure

```javascript
{
  currentStep: 1,
  data: {
    // Step 1
    companyName: "",
    registrationNumber: "",
    country: "",
    businessType: "",
    email: "",
    phone: "",

    // Step 2
    bankAccountNumber: "",
    swift: "",
    currency: "",
    annualRevenue: "",
    taxId: "",

    // Step 3
    documents: {
      kycDocument: null,
      businessLicense: null,
      proofOfAddress: null,
    },

    // Dynamic fields
    countrySpecificFields: {},
    businessTypeSpecificFields: {},
  },
  errors: {},
  touched: {},
}
```

## Styling & Customization

The form uses Tailwind CSS and is fully customizable:

- Edit button colors in component files
- Modify spacing and sizing in Tailwind classes
- Customize validation error colors in `FormFieldGroup.jsx`
- Adjust stepper colors in `FormStepper.jsx`

## Error Handling

### Validation Errors

- Displayed inline under each field
- Red border on invalid fields
- Clear error messages guide users

### Submission Errors

- Toast notification with error message
- Form remains filled for correction
- User can retry submission

## Accessibility

- All fields have associated labels
- Proper tab order for navigation
- Error messages linked to fields
- Keyboard-friendly navigation
- ARIA attributes included

## Performance Considerations

- Form state uses `useReducer` for predictable updates
- Memoized computations for dynamic fields config
- Efficient re-renders with useCallback
- Lazy validation on touched fields

## Troubleshooting

### Issue: Validation passes but fields are empty

**Solution:** Ensure `onFieldChange` is properly bound and updates state.

### Issue: Country-specific fields not appearing

**Solution:** Check that country code in `countriesConfig.js` matches dropdown value.

### Issue: File upload failing

**Solution:** Verify file size and type are within allowed limits. Check CORS headers.

### Issue: API not receiving FormData

**Solution:** Ensure backend endpoint accepts `multipart/form-data` content type.

## Future Enhancements

- [ ] Redux integration for global state
- [ ] Multi-language support (i18n)
- [ ] Drag-and-drop file upload
- [ ] Auto-save draft functionality
- [ ] Email verification step
- [ ] Rate limiting for submissions
- [ ] Document signing integration
- [ ] Real-time validation feedback

## Support

For issues or feature requests, contact: support@example.com

---

**Last Updated:** February 2026  
**Version:** 1.0.0
