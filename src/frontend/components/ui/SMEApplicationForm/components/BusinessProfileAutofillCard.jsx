import React, { useMemo, useRef, useState } from "react";

const BUSINESS_PROFILE_EXTRACTORS = {
  Singapore: {
    title: "Autofill with Business Profile",
    helperText: "Upload the business profile / ACRA PDF, then click Autofill.",
  },
  Indonesia: {
    title: "Autofill with Business Profile",
    helperText:
      "Upload the registration / deed / incorporation PDF, then click Autofill.",
  },
};

const BusinessProfileAutofillCard = ({
  country,
  basicFieldsConfig,
  getNestedValue,
  getFormDataRoot,
  data,
  onFieldChange,
  extractProfileApi,
  existingDocumentMap,
  disabled = false
}) => {
  const fileRef = useRef(null);

  const [businessProfileFile, setBusinessProfileFile] = useState(null);
  const [businessProfileUploading, setBusinessProfileUploading] =
    useState(false);
  const [businessProfileError, setBusinessProfileError] = useState("");
  const [businessProfileSuccessMsg, setBusinessProfileSuccessMsg] =
    useState("");

  const extractorConfig = BUSINESS_PROFILE_EXTRACTORS[country] || null;

  const businessProfileFieldKey = useMemo(() => {
    const entry = Object.entries(basicFieldsConfig || {}).find(
      ([, fieldCfg]) =>
        fieldCfg?.type === "file" && fieldCfg?.ocrTarget === "business_profile",
    );

    return entry?.[0] || null;
  }, [basicFieldsConfig]);

  const businessProfileFieldConfig = useMemo(() => {
    if (!businessProfileFieldKey) return null;
    return basicFieldsConfig[businessProfileFieldKey];
  }, [basicFieldsConfig, businessProfileFieldKey]);

  const setIfEmpty = (key, value) => {
    if (!(key in basicFieldsConfig)) return;
    if (!value) return;

    const next = String(value).trim();
    if (!next) return;

    const current =
      getNestedValue(getFormDataRoot(), key) ?? getNestedValue(data, key) ?? "";

    if (!current || String(current).trim() === "") {
      onFieldChange(key, next);
    }
  };

  const indoDateToISO = (value) => {
    if (!value) return "";

    const months = {
      januari: "01",
      februari: "02",
      maret: "03",
      april: "04",
      mei: "05",
      juni: "06",
      juli: "07",
      agustus: "08",
      september: "09",
      oktober: "10",
      november: "11",
      desember: "12",
    };

    const match = String(value)
      .trim()
      .match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i);
    if (!match) return value;

    const [, day, monthName, year] = match;
    const month = months[monthName.toLowerCase()];
    if (!month) return value;

    return `${year}-${month}-${day.padStart(2, "0")}`;
  };

  const ddMmmYyyyToISO = (s) => {
    if (!s) return "";

    const m = String(s)
      .trim()
      .match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/i);

    if (!m) return "";

    const months = {
      JAN: "01",
      FEB: "02",
      MAR: "03",
      APR: "04",
      MAY: "05",
      JUN: "06",
      JUL: "07",
      AUG: "08",
      SEP: "09",
      OCT: "10",
      NOV: "11",
      DEC: "12",
    };

    const [, day, mon, year] = m;
    const mm = months[mon.toUpperCase()];
    return mm ? `${year}-${mm}-${day.padStart(2, "0")}` : "";
  };

  const getOcrPayload = (result) => {
    if (!result || typeof result !== "object") return {};
    return result.data || {};
  };

  const mapBusinessProfilePayloadToForm = (payload) => {
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error("No structured OCR data returned.");
    }

    if (country === "Indonesia") {
      setIfEmpty("businessName", payload.business_name);
      setIfEmpty("registrationNumber", payload.business_registration_number);
      setIfEmpty("registeredAddress", payload.registered_address);
      setIfEmpty("registrationDate", indoDateToISO(payload.date_of_registration));
      setIfEmpty("npwp", payload.npwp);
      setIfEmpty("phone", payload.phone);
      setIfEmpty("email", payload.email);
      setIfEmpty("businessStatus", payload.business_status);
      return;
    }

    if (country === "Singapore") {
      setIfEmpty("businessName", payload.business_name);
      setIfEmpty("uen", payload.business_registration_number);
      setIfEmpty("registeredAddress", payload.registered_address);
      setIfEmpty("registrationDate", ddMmmYyyyToISO(payload.date_of_registration));
      setIfEmpty("phone", payload.phone);
      setIfEmpty("email", payload.email);
      setIfEmpty("businessStatus", payload.business_status);
    }
  };

  const resolveTopLevelDocumentType = (fieldName, fieldCfg) => {
    return fieldCfg?.documentType || fieldCfg?.ocrTarget || fieldName;
  };

  const getBusinessProfileLocalValue = () => {
    if (!businessProfileFieldKey) return null;

    return (
      getNestedValue(getFormDataRoot(), businessProfileFieldKey) ??
      getNestedValue(data, businessProfileFieldKey) ??
      null
    );
  };

  const getDisplayedBusinessProfileFile = () => {
    if (!businessProfileFieldKey || !businessProfileFieldConfig) return null;

    if (businessProfileFile instanceof File) {
      return {
        originalFilename: businessProfileFile.name,
        mimeType: businessProfileFile.type,
        size: businessProfileFile.size,
        uploaded: false,
        extracted: false,
        extractionStatus: "idle",
        extractionMessage: "",
      };
    }

    const localValue = getBusinessProfileLocalValue();

    if (localValue && !localValue.uploaded) {
      return localValue;
    }

    const resolvedDocType = resolveTopLevelDocumentType(
      businessProfileFieldKey,
      businessProfileFieldConfig,
    );

    const existingDoc =
      existingDocumentMap[resolvedDocType] ||
      existingDocumentMap[businessProfileFieldKey];

    if (!existingDoc) return null;

    return {
      uploaded: true,
      document_id: existingDoc.document_id,
      document_type: existingDoc.document_type,
      originalFilename: existingDoc.original_filename,
      storage_path: existingDoc.storage_path,
      mimeType: existingDoc.mime_type,
      status: existingDoc.status,
      created_at: existingDoc.created_at,
      extracted: true,
      extractionStatus: "completed",
      extractionMessage: "Previously uploaded OCR document found.",
    };
  };

  const handleBusinessProfileFileChange = (e) => {
    setBusinessProfileError("");
    setBusinessProfileSuccessMsg("");

    if (!businessProfileFieldKey) return;

    const file = e?.target?.files?.[0] || null;

    if (!file) {
      onFieldChange(businessProfileFieldKey, null);
      setBusinessProfileFile(null);
      return;
    }

    const resolvedDocType = resolveTopLevelDocumentType(
      businessProfileFieldKey,
      businessProfileFieldConfig,
    );

    onFieldChange(businessProfileFieldKey, {
      originalFilename: file.name,
      mimeType: file.type,
      size: file.size,
      documentType: resolvedDocType,
      source: "ocr_autofill",
      extracted: false,
      extractionStatus: "idle",
      extractionMessage: "",
      extractedData: null,
    });

    setBusinessProfileFile(file);
    e.target.value = "";
  };

  const handleAutofillBusinessProfile = async () => {
    setBusinessProfileError("");
    setBusinessProfileSuccessMsg("");

    const storedValue = getBusinessProfileLocalValue() || {};
    const selectedFile = businessProfileFile;

    if (!selectedFile) {
      setBusinessProfileError(
        "Please upload the business profile document first.",
      );
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setBusinessProfileError("Only PDF is allowed.");
      return;
    }

    setBusinessProfileUploading(true);

    try {
      const result = await extractProfileApi(selectedFile);

      if (!result?.document_type || result.document_type === "UNKNOWN") {
        throw new Error(
          "This uploaded document is not supported for autofill.",
        );
      }

      const payload = getOcrPayload(result);
      mapBusinessProfilePayloadToForm(payload);

      onFieldChange(businessProfileFieldKey, {
        ...storedValue,
        originalFilename: selectedFile.name,
        mimeType: selectedFile.type,
        size: selectedFile.size,
        documentType:
          storedValue?.documentType ||
          resolveTopLevelDocumentType(
            businessProfileFieldKey,
            businessProfileFieldConfig,
          ),
        extracted: true,
        extractionStatus: "completed",
        extractionMessage:
          "Autofill completed. Please review before proceeding.",
        extractedData: payload,
      });

      setBusinessProfileSuccessMsg(
        "Autofill completed. Please review before proceeding.",
      );
    } catch (err) {
      onFieldChange(businessProfileFieldKey, {
        ...storedValue,
        originalFilename: selectedFile?.name || storedValue?.originalFilename,
        mimeType: selectedFile?.type || storedValue?.mimeType,
        size: selectedFile?.size || storedValue?.size,
        documentType:
          storedValue?.documentType ||
          resolveTopLevelDocumentType(
            businessProfileFieldKey,
            businessProfileFieldConfig,
          ),
        extracted: false,
        extractionStatus: "failed",
        extractionMessage: err?.message || "Failed to autofill.",
        extractedData: storedValue?.extractedData || null,
      });

      setBusinessProfileError(err?.message || "Failed to autofill.");
    } finally {
      setBusinessProfileUploading(false);
    }
  };

  if (!extractorConfig || !businessProfileFieldKey) return null;

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {businessProfileFieldConfig?.label || extractorConfig.title}
          </p>
          <p className="text-xs text-gray-500">{extractorConfig.helperText}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            disabled={businessProfileUploading || disabled}
          >
            Upload PDF
          </button>

          <button
            type="button"
            onClick={handleAutofillBusinessProfile}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              businessProfileUploading
                ? "bg-gray-400"
                : "bg-red-600 hover:bg-red-700"
            }`}
            disabled={businessProfileUploading || disabled}
          >
            {businessProfileUploading ? "Autofilling..." : "Autofill"}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleBusinessProfileFileChange}
          />
        </div>
      </div>

      <div className="mt-3 text-xs">
        {(businessProfileFile?.name ||
          getDisplayedBusinessProfileFile()?.originalFilename) && (
          <p className="text-gray-600">
            Selected:{" "}
            <span className="font-medium">
              {businessProfileFile?.name ||
                getDisplayedBusinessProfileFile()?.originalFilename}
            </span>
          </p>
        )}
        {businessProfileError && (
          <p className="mt-1 text-red-600">{businessProfileError}</p>
        )}
        {businessProfileSuccessMsg && (
          <p className="mt-1 text-green-600">{businessProfileSuccessMsg}</p>
        )}
      </div>
    </div>
  );
};

export default BusinessProfileAutofillCard;