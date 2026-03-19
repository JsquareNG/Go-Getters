import React, { useMemo, useRef, useState, useEffect } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import FileUploadField from "../components/FileUploadField";
import { Button } from "@/components/ui";
import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";
import { allDocuments, ocrDocumentApi } from "@/api/documentApi";

// const ACRA_WITH_TABLES_ENDPOINT =
//   "http://127.0.0.1:8000/document-ai/extract-acra-bizprofile";
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

const Step1BasicInformation = ({
  data,
  onFieldChange,
  disabled = false,
  applicationId,
}) => {
  const fileRef = useRef(null);

  const [existingDocuments, setExistingDocuments] = useState([]);

  useEffect(() => {
    if (!applicationId || applicationId === "new") return;

    const fetchDocs = async () => {
      try {
        const docs = await allDocuments(applicationId);
        console.log("STEP1 existing docs:", docs);
        setExistingDocuments(Array.isArray(docs) ? docs : []);
      } catch (err) {
        console.error("Failed to fetch documents", err);
        setExistingDocuments([]);
      }
    };

    fetchDocs();
  }, [applicationId]);

  const existingDocumentMap = useMemo(() => {
    return existingDocuments.reduce((acc, doc) => {
      acc[doc.document_type] = doc;
      return acc;
    }, {});
  }, [existingDocuments]);

  const hasUsableLocalFile = (value) => {
    return value instanceof File || value?.file instanceof File;
  };

  const [businessProfileFile, setBusinessProfileFile] = useState(null);
  const [businessProfileUploading, setBusinessProfileUploading] =
    useState(false);
  const [businessProfileError, setBusinessProfileError] = useState("");
  const [businessProfileSuccessMsg, setBusinessProfileSuccessMsg] =
    useState("");


  const CONFIG_MAP = {
    Singapore: SINGAPORE_CONFIG,
    Indonesia: INDONESIA_CONFIG,
  };

  const activeConfig = CONFIG_MAP[data?.country] || SINGAPORE_CONFIG;

  // ---- dynamic config from singaporeConfig ----
  const { basicFieldsConfig, repeatableSectionsConfig } = useMemo(() => {
    const entity = activeConfig?.entities[data?.businessType] || {};
    const step2 = entity.steps?.find((s) => s.id === "step2") || {};

    const basicFields = {};
    const repeatableSections = {};

    if (step2.fields) {
      Object.entries(step2.fields).forEach(([key, val]) => {
        basicFields[key] = { ...val };
      });
    }

    if (step2.repeatableSections) {
      Object.entries(step2.repeatableSections).forEach(
        ([sectionKey, section]) => {
          repeatableSections[sectionKey] = {
            label: section.label,
            storage: section.storage,
            min: section.min,
            max: section.max,
            fields: { ...section.fields },
          };
        },
      );
    }

    return {
      basicFieldsConfig: basicFields,
      repeatableSectionsConfig: repeatableSections,
    };
  }, [data?.businessType, data?.country]);

  // --- OCR ---
  const extractorConfig = BUSINESS_PROFILE_EXTRACTORS[data?.country] || null;

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


  const getFormDataRoot = () => {
    if (data?.formData && Object.keys(data.formData).length > 0) {
      return data.formData;
    }
    return data || {};
  };
  const getIndividuals = () => getFormDataRoot()?.individuals || [];
  const isIndividualsStorage = (sectionConfig) =>
    sectionConfig?.storage === "individuals";

  const getRoleValue = (sectionConfig, fallbackKey) => {
    return sectionConfig?.fields?.role?.value || fallbackKey;
  };

  const getNestedValue = (obj, path) => {
    if (!path) return undefined;
    return path.split(".").reduce((acc, key) => {
      if (acc == null) return undefined;
      const isIndex = !Number.isNaN(Number(key));
      return isIndex ? acc[Number(key)] : acc[key];
    }, obj);
  };

  const setNestedValue = (obj, path, value) => {
    const keys = path.split(".");
    const result = Array.isArray(obj) ? [...obj] : { ...obj };

    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const nextKey = keys[i + 1];
      const isNextIndex = !Number.isNaN(Number(nextKey));

      current[key] =
        current[key] != null
          ? Array.isArray(current[key])
            ? [...current[key]]
            : { ...current[key] }
          : isNextIndex
            ? []
            : {};

      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return result;
  };

  // --- OCR ---
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

    const day = m[1].padStart(2, "0");
    const mm = months[m[2].toUpperCase()];
    return `${m[3]}-${mm}-${day}`;
  };

  const normalizeStatus = (s) => {
    if (!s) return "";
    const v = String(s).trim().toUpperCase();

    if (v === "LIVE" || v === "ACTIVE") return "Active";
    if (v === "INACTIVE") return "Inactive";
    if (v === "DISSOLVED") return "Dissolved";
    if (v === "LIQUIDATED") return "Liquidated";
    if (v === "IN RECEIVERSHIP") return "InReceivership";
    if (v === "STRUCK OFF") return "StruckOff";

    return "";
  };

  const mapBusinessProfileResultToForm = (result) => {
    const rawKv = result?.data?.data || {};
    const kv = {};

    Object.keys(rawKv).forEach((k) => {
      kv[k.toLowerCase().trim()] = rawKv[k];
    });

    const ownerName =
      result?.data?.data?.owners?.name || result?.data?.owner?.owner_name || "";

    const ownerId =
      result?.data?.data?.owners?.id_number ||
      result?.data?.owner?.identification_number ||
      "";

    setIfEmpty("businessName", kv["name"] || kv["business name"]);
    setIfEmpty(
      "registeredAddress",
      kv["address"] ||
        kv["registered address"] ||
        kv["principal place of business"],
    );

    const isoDate = ddMmmYyyyToISO(
      kv["registration_date"] ||
        kv["commencement date"] ||
        kv["date of registration"],
    );
    if (isoDate) setIfEmpty("registrationDate", isoDate);

    const mappedStatus = normalizeStatus(
      kv["status"] || kv["business status"] || kv["status of business"],
    );
    if (mappedStatus) setIfEmpty("businessStatus", mappedStatus);

    setIfEmpty("uen", kv["uen"]);
    setIfEmpty("nib", kv["nib"]);
    setIfEmpty(
      "businessRegistrationNumber",
      kv["uen"] || kv["nib"] || kv["registration number"],
    );
    setIfEmpty("npwp", kv["npwp"]);

    if (ownerName) setIfEmpty("fullName", ownerName);
    if (ownerId) setIfEmpty("idNumber", ownerId);
  };

  const handleChooseBusinessProfile = () => fileRef.current?.click();

  const handleBusinessProfileFileChange = (e) => {
    setBusinessProfileError("");
    setBusinessProfileSuccessMsg("");

    const file = e.target.files?.[0];
    if (file) {
      setBusinessProfileFile(file);

      if (businessProfileFieldKey) {
        onFieldChange(businessProfileFieldKey, { file, progress: 0 });
      }
    }

    e.target.value = "";
  };

  const handleAutofillBusinessProfile = async () => {
    setBusinessProfileError("");
    setBusinessProfileSuccessMsg("");

    if (!businessProfileFile) {
      setBusinessProfileError(
        "Please upload the business profile document first.",
      );
      return;
    }

    if (businessProfileFile.type !== "application/pdf") {
      setBusinessProfileError("Only PDF is allowed.");
      return;
    }

    setBusinessProfileUploading(true);

    try {
      const result = await ocrDocumentApi(businessProfileFile);
      console.log("BUSINESS PROFILE OCR RESPONSE:", result);

      mapBusinessProfileResultToForm(result);

      setBusinessProfileSuccessMsg(
        "Autofill completed. Please review before proceeding.",
      );
    } catch (err) {
      setBusinessProfileError(err?.message || "Failed to autofill.");
    } finally {
      setBusinessProfileUploading(false);
    }
  };

  // --- SPECIFICALLY FOR INDIVIDUAL'S NESTING ---
  const buildIndividualDocumentType = (
    sectionKey,
    sectionConfig,
    rowIndex,
    fieldName,
  ) => {
    const roleValue = getRoleValue(sectionConfig, sectionKey);
    return `${roleValue}_${rowIndex + 1}_${fieldName}`;
  };

  const buildEmptyRow = (fieldsConfig = {}) => {
    const row = {};

    Object.entries(fieldsConfig).forEach(([fieldKey, fieldCfg]) => {
      if (fieldKey === "conditionalFields") return;

      if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label) {
        row[fieldKey] = buildEmptyRow(fieldCfg);
        return;
      }

      if (fieldCfg?.value !== undefined) {
        row[fieldKey] = fieldCfg.value;
        return;
      }

      row[fieldKey] = null;
    });

    return row;
  };

  const getSectionRows = (sectionKey, sectionConfig) => {
    if (isIndividualsStorage(sectionConfig)) {
      const roleValue = getRoleValue(sectionConfig, sectionKey);
      return getIndividuals().filter((row) => row?.role === roleValue);
    }

    return Array.isArray(getFormDataRoot()?.[sectionKey])
      ? getFormDataRoot()[sectionKey]
      : [];
  };

  const handleFieldChange = (name, value) => {
    if (!name || typeof name !== "string") return;
    onFieldChange(name, value);
  };

  const handleSectionChange = (sectionKey, nextRows) => {
    onFieldChange(`formData.${sectionKey}`, nextRows);
  };

  const handleAddRepeatableRow = (sectionKey, sectionConfig) => {
    const currentRows = getSectionRows(sectionKey, sectionConfig);
    const max = sectionConfig?.max ?? Infinity;
    if (currentRows.length >= max) return;

    const nextRows = [...currentRows, buildEmptyRow(sectionConfig.fields)];
    handleSectionChange(sectionKey, nextRows);
  };

  const handleRemoveRepeatableRow = (sectionKey, index, sectionConfig) => {
    const currentRows = getSectionRows(sectionKey, sectionConfig);
    const min = sectionConfig?.min ?? 0;
    if (currentRows.length <= min) return;

    const nextRows = currentRows.filter((_, i) => i !== index);
    handleSectionChange(sectionKey, nextRows);
  };

  const handleIndividualFieldChange = (
    sectionKey,
    sectionConfig,
    rowIndex,
    fieldPath,
    value,
  ) => {
    const individuals = [...getIndividuals()];
    const roleValue = getRoleValue(sectionConfig, sectionKey);

    const matchingRows = individuals
      .map((person, originalIndex) => ({ person, originalIndex }))
      .filter(({ person }) => person?.role === roleValue);

    const target = matchingRows[rowIndex];
    if (!target) return;

    const originalRow = updatedClone(individuals[target.originalIndex]);
    const updatedRow = setNestedValue(originalRow, fieldPath, value);

    const updatedIndividuals = [...individuals];
    updatedIndividuals[target.originalIndex] = updatedRow;

    onFieldChange("formData.individuals", updatedIndividuals);
  };

  const updatedClone = (obj) => {
    if (Array.isArray(obj)) return [...obj];
    if (obj && typeof obj === "object") return { ...obj };
    return obj;
  };

  const handleAddIndividualRow = (sectionKey, sectionConfig) => {
    const individuals = [...getIndividuals()];
    const roleValue = getRoleValue(sectionConfig, sectionKey);
    const currentCount = individuals.filter(
      (x) => x?.role === roleValue,
    ).length;
    const max = sectionConfig?.max ?? Infinity;

    if (currentCount >= max) return;

    const newRow = buildEmptyRow(sectionConfig.fields);
    onFieldChange("formData.individuals", [...individuals, newRow]);
  };

  const handleRemoveIndividualRow = (sectionKey, sectionConfig, rowIndex) => {
    const individuals = [...getIndividuals()];
    const roleValue = getRoleValue(sectionConfig, sectionKey);

    const matchingRows = individuals
      .map((person, originalIndex) => ({ person, originalIndex }))
      .filter(({ person }) => person?.role === roleValue);

    const min = sectionConfig?.min ?? 0;
    if (matchingRows.length <= min) return;

    const target = matchingRows[rowIndex];
    if (!target) return;

    const updatedIndividuals = individuals.filter(
      (_, idx) => idx !== target.originalIndex,
    );

    onFieldChange("formData.individuals", updatedIndividuals);
  };

  const handleDocumentChange = (fieldPath, file) => {
    handleFieldChange(fieldPath, { file, progress: 0 });
  };

  const getVisibleConditionalFields = (fieldCfg, value) => {
    if (!fieldCfg.conditionalFields) return {};
    return fieldCfg.conditionalFields[value] || {};
  };

  const getDisplayedIndividualFile = (
    sectionKey,
    sectionConfig,
    rowIndex,
    fieldName,
    rowData,
  ) => {
    const localValue = rowData?.[fieldName];

    // Prefer local unsaved file first
    if (hasUsableLocalFile(localValue)) {
      return localValue;
    }

    // Otherwise fallback to uploaded backend doc
    const documentType = buildIndividualDocumentType(
      sectionKey,
      sectionConfig,
      rowIndex,
      fieldName,
    );

    const existingDoc = existingDocumentMap[documentType];
    if (!existingDoc) return null;

    return {
      uploaded: true,
      document_id: existingDoc.document_id,
      document_type: existingDoc.document_type,
      original_filename: existingDoc.original_filename,
      storage_path: existingDoc.storage_path,
      mime_type: existingDoc.mime_type,
      status: existingDoc.status,
      created_at: existingDoc.created_at,
    };
  };

  const getDisplayedTopLevelFile = (fieldName, localValue) => {
    if (hasUsableLocalFile(localValue)) {
      return localValue;
    }

    const existingDoc = existingDocumentMap[fieldName];
    if (!existingDoc) return null;

    return {
      uploaded: true,
      document_id: existingDoc.document_id,
      document_type: existingDoc.document_type,
      original_filename: existingDoc.original_filename,
      storage_path: existingDoc.storage_path,
      mime_type: existingDoc.mime_type,
      status: existingDoc.status,
      created_at: existingDoc.created_at,
    };
  };

  const renderField = (fullKey, fieldCfg) => {
    const fieldName = fullKey.split(".").slice(-1)[0];

    const value =
      getNestedValue(getFormDataRoot(), fullKey) ??
      getNestedValue(data, fullKey);

    if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label) {
      return (
        <div key={fullKey} className="mb-6">
          <p className="font-semibold text-gray-900 mb-2">
            {fullKey
              .split(".")
              .slice(-1)[0]
              .replace(/([A-Z])/g, " $1")
              .trim()}
          </p>
          {Object.entries(fieldCfg).map(([subKey, subCfg]) =>
            renderField(`${fullKey}.${subKey}`, subCfg),
          )}
        </div>
      );
    }

    // if (fieldCfg.type === "file") {
    //   return (
    //     <FileUploadField
    //       key={fullKey}
    //       fieldName={fullKey}
    //       label={fieldCfg.label}
    //       // file={value || null}
    //                 file={getDisplayedTopLevelFile(fieldName, value)}

    //       onChange={(file) => handleDocumentChange(fullKey, file)}
    //       required={fieldCfg.required || false}
    //       acceptTypes="application/pdf,image/jpeg,image/png"
    //       placeholder={fieldCfg.placeholder || ""}
    //       maxSize={5242880}
    //       disabled={disabled}
    //     />
    //   );
    // }
    if (fieldCfg.type === "file") {
      const displayedFile = getDisplayedTopLevelFile(fieldName, value);
      const isBusinessProfileOCRField =
        fieldName === businessProfileFieldKey &&
        fieldCfg?.ocrTarget === "business_profile";

      return (
        <div key={fullKey} className="mb-6">
          <FileUploadField
            fieldName={fullKey}
            label={fieldCfg.label}
            file={displayedFile}
            onChange={(file) => handleDocumentChange(fullKey, file)}
            required={fieldCfg.required || false}
            acceptTypes="application/pdf,image/jpeg,image/png"
            placeholder={fieldCfg.placeholder || ""}
            maxSize={5242880}
            disabled={disabled}
          />

          {isBusinessProfileOCRField && (
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleAutofillBusinessProfile(fieldName)}
                disabled={businessProfileUploading || disabled}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  businessProfileUploading
                    ? "bg-gray-400"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {businessProfileUploading ? "Autofilling..." : "Autofill"}
              </button>

              {businessProfileError && (
                <p className="text-sm text-red-600">{businessProfileError}</p>
              )}

              {businessProfileSuccessMsg && (
                <p className="text-sm text-green-600">
                  {businessProfileSuccessMsg}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    const fieldElement = (
      <FormFieldGroup
        key={fullKey}
        fieldName={fullKey}
        label={fieldCfg.label}
        placeholder={fieldCfg.placeholder || ""}
        value={value ?? ""}
        onChange={onFieldChange}
        // onChange={(_, nextValue) => handleFieldChange(fullKey, nextValue)}
        type={fieldCfg.type || "text"}
        options={fieldCfg.options || []}
        required={fieldCfg.required || false}
        disabled={disabled || fieldCfg.readonly}
      />
    );

    if (fieldCfg.conditionalFields && value != null) {
      const visibleFields = getVisibleConditionalFields(fieldCfg, value);
      return (
        <div key={fullKey}>
          {fieldElement}
          <div className="ml-4 mt-2">
            {Object.entries(visibleFields).map(([condKey, condCfg]) =>
              renderField(
                `${fullKey.split(".").slice(0, -1).join(".")}.${condKey}`,
                condCfg,
              ),
            )}
          </div>
        </div>
      );
    }

    return fieldElement;
  };

  const renderIndividualRowField = (
    sectionKey,
    sectionConfig,
    rowIndex,
    rowData,
    fieldName,
    fieldCfg,
    parentPath = "",
  ) => {
    const fullPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;
    const value = getNestedValue(rowData, fullPath);

    if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label) {
      return (
        <div key={`${sectionKey}.${rowIndex}.${fullPath}`} className="mb-6">
          <p className="font-semibold text-gray-900 mb-2">
            {fieldName.replace(/([A-Z])/g, " $1").trim()}
          </p>

          {Object.entries(fieldCfg).map(([subKey, subCfg]) =>
            renderIndividualRowField(
              sectionKey,
              sectionConfig,
              rowIndex,
              rowData,
              subKey,
              subCfg,
              fullPath,
            ),
          )}
        </div>
      );
    }

    if (fieldCfg.type === "file") {
      return (
        <FileUploadField
          key={`${sectionKey}.${rowIndex}.${fullPath}`}
          fieldName={`${sectionKey}.${rowIndex}.${fullPath}`}
          label={fieldCfg.label}
          // file={value || null}
          file={getDisplayedIndividualFile(
            sectionKey,
            sectionConfig,
            rowIndex,
            fieldName,
            rowData,
          )}
          onChange={(file) =>
            handleIndividualFieldChange(
              sectionKey,
              sectionConfig,
              rowIndex,
              fullPath,
              file ? { file, progress: 0 } : null,
            )
          }
          required={fieldCfg.required || false}
          acceptTypes="application/pdf,image/jpeg,image/png"
          placeholder={fieldCfg.placeholder || ""}
          maxSize={5242880}
          disabled={disabled || fieldCfg.readonly}
        />
      );
    }

    const fieldElement = (
      <FormFieldGroup
        key={`${sectionKey}.${rowIndex}.${fullPath}`}
        fieldName={`${sectionKey}.${rowIndex}.${fullPath}`}
        label={fieldCfg.label}
        placeholder={fieldCfg.placeholder || ""}
        value={value ?? ""}
        onChange={(_, nextValue) =>
          handleIndividualFieldChange(
            sectionKey,
            sectionConfig,
            rowIndex,
            fullPath,
            nextValue,
          )
        }
        type={fieldCfg.type || "text"}
        options={fieldCfg.options || []}
        required={fieldCfg.required || false}
        disabled={disabled || fieldCfg.readonly}
      />
    );

    if (fieldCfg.conditionalFields && value != null) {
      const visibleFields = fieldCfg.conditionalFields[value] || {};
      return (
        <div key={`${sectionKey}.${rowIndex}.${fullPath}`}>
          {fieldElement}
          <div className="ml-4 mt-2">
            {Object.entries(visibleFields).map(([condKey, condCfg]) =>
              renderIndividualRowField(
                sectionKey,
                sectionConfig,
                rowIndex,
                rowData,
                condKey,
                condCfg,
                parentPath,
              ),
            )}
          </div>
        </div>
      );
    }

    return fieldElement;
  };

  useEffect(() => {
    Object.entries(repeatableSectionsConfig).forEach(
      ([sectionKey, section]) => {
        const minRows = section.min ?? 0;

        if (isIndividualsStorage(section)) {
          const individuals = getIndividuals();
          const roleValue = getRoleValue(section, sectionKey);

          const sectionRows = individuals.filter((p) => p?.role === roleValue);

          if (sectionRows.length < minRows) {
            const missingCount = minRows - sectionRows.length;
            const additionalRows = Array.from({ length: missingCount }, () =>
              buildEmptyRow(section.fields, sectionKey),
            );

            onFieldChange("formData.individuals", [
              ...individuals,
              ...additionalRows,
            ]);
          }
        } else {
          const currentRows = getSectionRows(sectionKey, section);

          if (currentRows.length < minRows) {
            const missingCount = minRows - currentRows.length;
            const additionalRows = Array.from({ length: missingCount }, () =>
              buildEmptyRow(section.fields),
            );

            onFieldChange(`formData.${sectionKey}`, [
              ...currentRows,
              ...additionalRows,
            ]);
          }
        }
      },
    );
  }, [repeatableSectionsConfig]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Basic Information
      </h2>

      {extractorConfig && businessProfileFieldKey && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {businessProfileFieldConfig?.label || extractorConfig.title}
              </p>
              <p className="text-xs text-gray-500">
                {extractorConfig.helperText}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleChooseBusinessProfile}
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
            {businessProfileFile?.name && (
              <p className="text-gray-600">
                Selected:{" "}
                <span className="font-medium">{businessProfileFile.name}</span>
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
      )}

      {/* ACRA Autofill */}
      {/* {data?.country === "SG" && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Autofill with ACRA business profile
              </p>
              <p className="text-xs text-gray-500">
                Upload ACRA Business Profile (PDF), then click Autofill.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleChooseAcra}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                disabled={acraUploading}
              >
                Upload PDF
              </button>

              <button
                type="button"
                onClick={handleAutofillAcra}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  acraUploading ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={acraUploading}
              >
                {acraUploading ? "Autofilling..." : "Autofill"}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleAcraFileChange}
              />
            </div>
          </div>

          <div className="mt-3 text-xs">
            {acraFile?.name && (
              <p className="text-gray-600">
                Selected: <span className="font-medium">{acraFile.name}</span>
              </p>
            )}
            {acraError && <p className="mt-1 text-red-600">{acraError}</p>}
            {acraSuccessMsg && (
              <p className="mt-1 text-green-600">{acraSuccessMsg}</p>
            )}
          </div>
        </div>
      )} */}

      {/* Top-Level Fields */}
      {Object.entries(basicFieldsConfig).map(([fieldName, fieldConfig]) =>
        renderField(fieldName, fieldConfig),
      )}

      {Object.entries(repeatableSectionsConfig).map(([sectionKey, section]) => {
        const rows = getSectionRows(sectionKey, section);
        const minRows = section.min ?? 0;
        const maxRows = section.max ?? Infinity;
        const useIndividuals = isIndividualsStorage(section);

        const effectiveRows =
          rows.length > 0
            ? rows
            : Array.from({ length: minRows }, () =>
                buildEmptyRow(
                  section.fields,
                  useIndividuals ? sectionKey : null,
                ),
              );

        return (
          <div key={sectionKey} className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {section.label}
              </h3>

              {!disabled && rows.length < maxRows && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    useIndividuals
                      ? handleAddIndividualRow(sectionKey, section)
                      : handleAddRepeatableRow(sectionKey, section)
                  }
                >
                  Add {section.label}
                </Button>
              )}
            </div>

            {effectiveRows.map((row, index) => (
              <div
                key={`${sectionKey}-${index}`}
                className="mb-6 rounded-xl border border-gray-200 p-4 bg-white"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="font-medium text-gray-800">
                    {section.label} {index + 1}
                  </p>

                  {!disabled && rows.length > minRows && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        useIndividuals
                          ? handleRemoveIndividualRow(
                              sectionKey,
                              section,
                              index,
                            )
                          : handleRemoveRepeatableRow(
                              sectionKey,
                              index,
                              section,
                            )
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>

                {Object.entries(section.fields).map(
                  ([fieldName, fieldConfig]) =>
                    useIndividuals
                      ? renderIndividualRowField(
                          sectionKey,
                          section,
                          index,
                          row,
                          fieldName,
                          fieldConfig,
                        )
                      : renderField(
                          `formData.${sectionKey}.${index}.${fieldName}`,
                          fieldConfig,
                        ),
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default Step1BasicInformation;
