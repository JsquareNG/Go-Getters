import React from "react";
import FileUploadField from "../components/FileUploadField";

/**
 * Step3ComplianceDocumentation component
 * Handles document uploads for KYC compliance
 */
const Step3ComplianceDocumentation = ({
  documents,
  errors,
  touched,
  onDocumentChange,
  documentsProgress = {},
}) => {
  const handleFileChange = (fieldName, file, error = "") => {
    onDocumentChange(fieldName, file, error);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Compliance & Documentation
      </h2>

      {/* Information Box */}
      <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800 mb-2">
          <strong>Required Documents:</strong>
        </p>
        <ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
          <li>Know Your Customer (KYC) document - Government-issued ID</li>
          <li>Business License or Certificate of Incorporation</li>
          <li>
            Proof of Address - Utility bill or official letter (not older than 3
            months)
          </li>
        </ul>
      </div>

      {/* KYC Document Upload */}
      <FileUploadField
        fieldName="kycDocument"
        label="KYC Document (Government-Issued ID)"
        file={documents.kycDocument}
        onChange={handleFileChange}
        error={errors.kycDocument}
        touched={touched.kycDocument}
        required
        acceptTypes="application/pdf,image/jpeg,image/png"
        maxSize={5242880}
        helpText="Accepted: PDF, JPG, PNG (Max 5MB). Upload a clear copy of your passport, national ID, or driver's license."
        uploadProgress={documentsProgress.kycDocument}
      />

      {/* Business License Upload */}
      <FileUploadField
        fieldName="businessLicense"
        label="Business License or Certificate of Incorporation"
        file={documents.businessLicense}
        onChange={handleFileChange}
        error={errors.businessLicense}
        touched={touched.businessLicense}
        required
        acceptTypes="application/pdf,image/jpeg,image/png"
        maxSize={5242880}
        helpText="Accepted: PDF, JPG, PNG (Max 5MB). Upload your business registration certificate or certificate of incorporation."
        uploadProgress={documentsProgress.businessLicense}
      />

      {/* Proof of Address Upload */}
      <FileUploadField
        fieldName="proofOfAddress"
        label="Proof of Address"
        file={documents.proofOfAddress}
        onChange={handleFileChange}
        error={errors.proofOfAddress}
        touched={touched.proofOfAddress}
        required
        acceptTypes="application/pdf,image/jpeg,image/png"
        maxSize={5242880}
        helpText="Accepted: PDF, JPG, PNG (Max 5MB). Upload a recent utility bill, lease agreement, or official letter not older than 3 months."
        uploadProgress={documentsProgress.proofOfAddress}
      />

      {/* Compliance Note */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          ✓ All documents will be reviewed by our compliance team within 2-3
          business days.
        </p>
        <p className="text-sm text-blue-800 mt-2">
          ✓ We may request additional documents if needed. You'll be notified
          via email.
        </p>
      </div>
    </div>
  );
};

export default Step3ComplianceDocumentation;
