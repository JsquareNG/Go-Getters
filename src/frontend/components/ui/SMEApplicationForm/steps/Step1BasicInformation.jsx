import React, { useRef, useState, useMemo } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import SINGAPORE_CONFIG from "../config/singaporeConfig";

const ACRA_WITH_TABLES_ENDPOINT =
  "http://127.0.0.1:8000/document-ai/extract-acra-with-tables";

const Step1BasicInformation = ({
  data,
  errors = {},
  touched = {},
  onCountrySpecificFieldChange,
  onBusinessTypeFieldChange,
  disabled = false,
}) => {
  const fileRef = useRef(null);
  const [acraFile, setAcraFile] = useState(null);
  const [acraUploading, setAcraUploading] = useState(false);
  const [acraError, setAcraError] = useState("");
  const [acraSuccessMsg, setAcraSuccessMsg] = useState("");

  const fireField = (fn) => (fieldName, value) => {
    if (!fn) return;
    fn(fieldName, value);
  };

  const fireCountryField = fireField(onCountrySpecificFieldChange);
  const fireBusinessField = fireField(onBusinessTypeFieldChange);

  const setIfEmpty = (scope, key, setter, nextVal) => {
    if (!nextVal) return;
    const next = String(nextVal).trim();
    if (!next) return;

    let current = "";
    if (scope === "country") current = data?.countrySpecificFields?.[key] ?? "";
    if (scope === "business") current = data?.businessTypeSpecificFields?.[key] ?? "";

    if (!current || String(current).trim() === "") setter(key, next);
  };

  // --- ACRA helpers ---
  const ddMmmYyyyToISO = (s) => {
    if (!s) return "";
    const m = String(s).trim().match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/i);
    if (!m) return "";
    const day = m[1].padStart(2, "0");
    const mon = m[2].toUpperCase();
    const year = m[3];
    const months = {
      JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
      JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
    };
    const mm = months[mon];
    if (!mm) return "";
    return `${year}-${mm}-${day}`;
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

  const handleChooseAcra = () => fileRef.current?.click();
  const handleAcraFileChange = (e) => {
    setAcraError("");
    setAcraSuccessMsg("");
    const file = e.target.files?.[0];
    if (!file) return;
    setAcraFile(file);
    e.target.value = "";
  };

  const handleAutofillAcra = async () => {
    setAcraError("");
    setAcraSuccessMsg("");
    if (data?.country !== "SG") return;
    if (!acraFile) return setAcraError("Please upload your ACRA PDF first.");
    if (acraFile.type !== "application/pdf") return setAcraError("Only PDF is allowed.");

    setAcraUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", acraFile);
      const res = await fetch(ACRA_WITH_TABLES_ENDPOINT, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Autofill failed (${res.status})`);
      const payload = await res.json();
      const kv = payload?.data?.kv_page_1 || {};
      const ownerName = payload?.data?.owner?.owner_name || "";
      const ownerId = payload?.data?.owner?.identification_number || "";

      // Country-specific fields
      setIfEmpty("country", "businessName", fireCountryField, kv["name of business"] || kv["name of company"]);
      setIfEmpty("country", "registeredAddress", fireCountryField, kv["principal place of business"]);
      const isoDate = ddMmmYyyyToISO(kv["registration date"] || kv["commencement date"]);
      if (isoDate) setIfEmpty("country", "registrationDate", fireCountryField, isoDate);
      const mappedStatus = normalizeStatus(kv["status of business"] || kv["status of company"]);
      if (mappedStatus) setIfEmpty("country", "businessStatus", fireCountryField, mappedStatus);
      if (kv["uen"]) {
        setIfEmpty("country", "uen", fireCountryField, kv["uen"]);
      }

      // Business-type-specific owner/individual
      if (ownerName) setIfEmpty("business", "fullName", fireBusinessField, ownerName);
      if (ownerId) setIfEmpty("business", "idNumber", fireBusinessField, ownerId);

      setAcraSuccessMsg("Autofill completed. Please review before proceeding.");
    } catch (err) {
      setAcraError(err?.message || "Failed to autofill from ACRA.");
    } finally {
      setAcraUploading(false);
    }
  };

  // --- DYNAMIC FIELD CONFIG ---
  const { countryFields, businessFields } = useMemo(() => {
    const entity = SINGAPORE_CONFIG.entities[data?.businessType] || {};
    const step2 = entity.steps?.find((s) => s.id === "step2") || {};

    const countryFields = step2.fields || {};
    const businessFields = {};

    // flatten repeatable sections into business-specific fields
    if (step2.repeatableSections) {
      Object.values(step2.repeatableSections).forEach((section) => {
        Object.entries(section.fields).forEach(([key, val]) => {
          businessFields[key] = val;
        });
      });
    }

    return { countryFields, businessFields };
  }, [data?.businessType]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Basic Information</h2>

      {/* ACRA Upload */}
      {data?.country === "SG" && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Autofill with ACRA business profile</p>
              <p className="text-xs text-gray-500">Upload ACRA Business Profile (PDF), then click Autofill.</p>
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
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleAcraFileChange} />
            </div>
          </div>
          <div className="mt-3 text-xs">
            {acraFile?.name && <p className="text-gray-600">Selected: <span className="font-medium">{acraFile.name}</span></p>}
            {acraError && <p className="mt-1 text-red-600">{acraError}</p>}
            {acraSuccessMsg && <p className="mt-1 text-green-600">{acraSuccessMsg}</p>}
          </div>
        </div>
      )}

      {/* Country Fields */}
      {Object.entries(countryFields).map(([key, cfg]) => (
        <FormFieldGroup
          key={key}
          fieldName={key}
          label={cfg.label}
          placeholder={cfg.placeholder || ""}
          value={data.countrySpecificFields?.[key] || ""}
          onChange={onCountrySpecificFieldChange}
          error={errors.countrySpecificFields?.[key]}
          touched={touched.countrySpecificFields?.[key]}
          required={cfg.required}
          type={cfg.type || "text"}
          disabled={disabled}
        />
      ))}

      {/* Business Fields */}
      {Object.entries(businessFields).map(([key, cfg]) => (
        <FormFieldGroup
          key={key}
          fieldName={key}
          label={cfg.label}
          placeholder={cfg.placeholder || ""}
          value={data.businessTypeSpecificFields?.[key] || ""}
          onChange={onBusinessTypeFieldChange}
          error={errors.businessTypeSpecificFields?.[key]}
          touched={touched.businessTypeSpecificFields?.[key]}
          required={cfg.required}
          type={cfg.type || "text"}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default Step1BasicInformation;