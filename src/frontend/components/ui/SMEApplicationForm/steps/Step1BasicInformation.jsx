import React, { useMemo, useRef, useState } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import FileUploadField from "../components/FileUploadField";
import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";
// import { extractFieldsFromStep, resolveConditionalFields, isFieldVisible } from "../utils/extractFields";

const ACRA_WITH_TABLES_ENDPOINT =
  "http://127.0.0.1:8000/document-ai/extract-acra-bizprofile";

const Step1BasicInformation = ({ data, onFieldChange, disabled = false }) => {
  const fileRef = useRef(null);

  const [acraFile, setAcraFile] = useState(null);
  const [acraUploading, setAcraUploading] = useState(false);
  const [acraError, setAcraError] = useState("");
  const [acraSuccessMsg, setAcraSuccessMsg] = useState("");

  const CONFIG_MAP = {
    SG: SINGAPORE_CONFIG,
    ID: INDONESIA_CONFIG,
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

  // ---- ACRA Upload Handlers ----
  const handleChooseAcra = () => fileRef.current?.click();

  const handleAcraFileChange = (e) => {
    setAcraError("");
    setAcraSuccessMsg("");
    const file = e.target.files?.[0];
    if (file) setAcraFile(file);
    e.target.value = "";
  };

  const handleAutofillAcra = async () => {
    setAcraError("");
    setAcraSuccessMsg("");

    if (data?.country !== "SG") return;
    if (!acraFile) return setAcraError("Please upload your ACRA PDF first.");
    if (acraFile.type !== "application/pdf")
      return setAcraError("Only PDF is allowed.");

    setAcraUploading(true);

    try {
      const formDataApi = new FormData();
      formDataApi.append("file", acraFile);

      const res = await fetch(ACRA_WITH_TABLES_ENDPOINT, {
        method: "POST",
        body: formDataApi,
      });

      if (!res.ok) throw new Error("Autofill failed");

      const result = await res.json();
      console.log("FULL API RESPONSE:", result);
      const rawKv = result?.data?.data || {};
      const kv = {};
      Object.keys(rawKv).forEach((k) => {
        kv[k.toLowerCase().trim()] = rawKv[k];
      });

      // const ownerName = result?.data?.owner?.owner_name || "";
      // const ownerId = result?.data?.owner?.identification_number || "";
      const ownerName = result?.data?.data?.owners?.name || "";
      const ownerId = result?.data?.data?.owners?.id_number || "";

      // ---- helpers ----
      const setIfEmpty = (key, value) => {
        if (!(key in basicFieldsConfig)) return;
        if (!value) return;
        const next = String(value).trim();
        if (!next) return;
        const current = data?.[key] ?? "";
        if (!current || String(current).trim() === "") {
          onFieldChange?.(key, next); // direct Redux update
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

      // ---- map ACRA → Redux ----
      setIfEmpty(
        "businessName",
        // kv["name of business"] || kv["name of company"],
        kv["name"],
      );
      // setIfEmpty("registeredAddress", kv["principal place of business"]);
      setIfEmpty("registeredAddress", kv["address"]);

      const isoDate = ddMmmYyyyToISO(
        kv["registration_date"] || kv["commencement date"],
      );
      if (isoDate) setIfEmpty("registrationDate", isoDate);
      const mappedStatus = normalizeStatus(
        // kv["status of business"] || kv["status of company"],
        kv["status"],
      );
      if (mappedStatus) setIfEmpty("businessStatus", mappedStatus);
      setIfEmpty("uen", kv["uen"]);
      if (ownerName) setIfEmpty("fullName", ownerName);
      if (ownerId) setIfEmpty("idNumber", ownerId);

      setAcraSuccessMsg("Autofill completed. Please review before proceeding.");
    } catch (err) {
      setAcraError(err?.message || "Failed to autofill.");
    } finally {
      setAcraUploading(false);
    }
  };

  const handleFieldChange = (name, value) => {
    if (!name || typeof name !== "string") {
      console.error("Invalid field name:", name);
      return;
    }

    onFieldChange(name, value);
  };

  const getNestedValue = (obj, path) => {
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
  };

  const setNestedValue = (obj, path, value) => {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const newObj = { ...obj };
    let ref = newObj;

    keys.forEach((key) => {
      if (!ref[key]) ref[key] = {};
      ref[key] = { ...ref[key] };
      ref = ref[key];
    });

    ref[lastKey] = value;
    return newObj;
  };

  // const handleDocumentChange = (fieldPath, file) => {
  //   if (!fieldPath || !file) return;

  //   // Store metadata in Redux
  //   const fileMeta = {
  //     fileName: file.name,
  //     fileType: file.type,
  //     size: file.size,
  //     progress: 0,
  //   };

  //   const updatedData = setNestedValue(data, fieldPath, fileMeta);

  //   onFieldChange("", updatedData); // Redux update

  // };

  const handleDocumentChange = (fieldPath, file) => {
    if (!fieldPath) {
      console.error("Invalid document field:", fieldPath);
      return;
    }

    handleFieldChange(fieldPath, {
      file,
      progress: 0,
    });
  };

  //HELPER
  const getVisibleConditionalFields = (fieldCfg, value) => {
    if (!fieldCfg.conditionalFields) return {};
    return fieldCfg.conditionalFields[value] || {};
  };

  // ---- Generic field renderer (recursive for nested fields) ----
  const renderField = (fieldName, fieldCfg, parentKey = null) => {
    const fullKey = parentKey ? `${parentKey}.${fieldName}` : fieldName;
    const value = parentKey
      ? data?.[parentKey]?.[fieldName]
      : data?.[fieldName];

    // Nested object
    if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label) {
      return (
        <div key={fullKey} className="mb-6">
          <p className="font-semibold text-gray-900 mb-2">
            {fieldName.replace(/([A-Z])/g, " $1").trim()}
          </p>
          {Object.entries(fieldCfg).map(([subKey, subCfg]) =>
            renderField(subKey, subCfg, fullKey),
          )}
        </div>
      );
    }

    // File field
    if (fieldCfg.type === "file") {
      return (
        <FileUploadField
          key={fullKey}
          fieldName={fullKey}
          label={fieldCfg.label}
          // file={data?.[fullKey] || null} // <- must match your Redux structure
          file={getNestedValue(data, fullKey) || null}
          onChange={(file) => handleDocumentChange(fullKey, file)}
          required={fieldCfg.required || false}
          acceptTypes="application/pdf,image/jpeg,image/png"
          placeholder={fieldCfg.placeholder || ""}
          maxSize={5242880}
          disabled={disabled}
        />
      );
    }

    // // Regular field
    // return (
    //   <FormFieldGroup
    //     key={fullKey}
    //     fieldName={fullKey}
    //     label={fieldCfg.label}
    //     placeholder={fieldCfg.placeholder || ""}
    //     value={value || ""}
    //     onChange={onFieldChange}
    //     type={fieldCfg.type || "text"}
    //     options={fieldCfg.options || []}
    //     required={fieldCfg.required || false}
    //     disabled={disabled}
    //   />
    // );

    // Regular field (text/select/etc.)
    const fieldElement = (
      <FormFieldGroup
        key={fullKey}
        fieldName={fullKey}
        label={fieldCfg.label}
        placeholder={fieldCfg.placeholder || ""}
        value={value || ""}
        onChange={onFieldChange}
        type={fieldCfg.type || "text"}
        options={fieldCfg.options || []}
        required={fieldCfg.required || false}
        disabled={disabled}
      />
    );

    // Render conditional fields if any
    if (fieldCfg.conditionalFields && value != null) {
      const visibleFields = getVisibleConditionalFields(fieldCfg, value);
      const conditionalElements = Object.entries(visibleFields).map(
        ([condKey, condCfg]) => renderField(condKey, condCfg, parentKey),
      );
      return (
        <div key={fullKey}>
          {fieldElement}
          <div className="ml-4 mt-2">{conditionalElements}</div>
        </div>
      );
    }

    return fieldElement;
  };
  // ---- Helper to render a field or file field ----
  // const renderField = (fieldName, fieldConfig) => {
  //   if (fieldConfig.type === "file") {
  //     return (
  //       <FileUploadField
  //         key={fieldName}
  //         fieldName={fieldName}
  //         label={fieldConfig.label}
  //         file={data[fieldName]?.file || null}
  //         onChange={(file) => handleDocumentChange(fieldName, {file})}
  //         required={fieldConfig.required || false}
  //         acceptTypes="application/pdf,image/jpeg,image/png"
  //         placeholder={fieldConfig.placeholder || ""}
  //         maxSize={5242880}
  //         disabled={disabled}
  //       />
  //     );
  //   }

  //   return (
  //     <FormFieldGroup
  //       key={fieldName}
  //       fieldName={fieldName}
  //       label={fieldConfig.label}
  //       placeholder={fieldConfig.placeholder || ""}
  //       value={data[fieldName] || ""}
  //       onChange={onFieldChange}
  //       type={fieldConfig.type || "text"}
  //       options={fieldConfig.options || []}
  //       required={fieldConfig.required || false}
  //       disabled={disabled}
  //     />
  //   );
  // };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Basic Information
      </h2>

      {/* ACRA Autofill */}
      {data?.country === "SG" && (
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
      )}

      {/* Top-Level Fields */}
      {/* {Object.entries(basicFieldsConfig).map(([fieldName, fieldConfig]) => (
        <FormFieldGroup
          key={fieldName}
          fieldName={fieldName}
          label={fieldConfig.label}
          placeholder={fieldConfig.placeholder || ""}
          value={data[fieldName] || ""}
          onChange={onFieldChange} // Redux-only
          type={fieldConfig.type || "text"}
          options={fieldConfig.options || []}
          required={fieldConfig.required || false}
          disabled={disabled}
        />
      ))} */}

      {/* Repeatable Sections */}
      {/* {Object.entries(repeatableSectionsConfig).map(([sectionKey, section]) => (
        <div key={sectionKey} className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">
            {section.label}
          </h3>

          {Object.entries(section.fields).map(([fieldName, fieldConfig]) => (
            <FormFieldGroup
              key={fieldName}
              fieldName={fieldName}
              label={fieldConfig.label}
              placeholder={fieldConfig.placeholder || ""}
              value={data[fieldName] || ""}
              onChange={onFieldChange} // Redux-only
              type={fieldConfig.type || "text"}
              options={fieldConfig.options || []}
              required={fieldConfig.required || false}
              disabled={disabled}
            />
          ))}
        </div>
      ))} */}

      {/* Top-Level Fields */}
      {Object.entries(basicFieldsConfig).map(([fieldName, fieldConfig]) =>
        renderField(fieldName, fieldConfig),
      )}

      {/* Repeatable Sections */}
      {Object.entries(repeatableSectionsConfig).map(([sectionKey, section]) => (
        <div key={sectionKey} className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">
            {section.label}
          </h3>
          {Object.entries(section.fields).map(([fieldName, fieldConfig]) =>
            renderField(fieldName, fieldConfig),
          )}
        </div>
      ))}
    </div>
  );
};

export default Step1BasicInformation;
