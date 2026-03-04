import React, { useRef, useState, useMemo } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import SINGAPORE_CONFIG from "../config/singaporeConfig";
import { COUNTRIES } from "../config/countriesConfig";

// TODO: move this to API later
const ACRA_WITH_TABLES_ENDPOINT =
  "http://127.0.0.1:8000/document-ai/extract-acra-with-tables";

const Step1BasicInformation = ({
  data,
  errors,
  touched,
  onFieldChange,
  onCountrySpecificFieldChange,
  onBusinessTypeFieldChange,
  disabled = false,
}) => {
  const fileRef = useRef(null);
  const [acraFile, setAcraFile] = useState(null);
  const [acraUploading, setAcraUploading] = useState(false);
  const [acraError, setAcraError] = useState("");
  const [acraSuccessMsg, setAcraSuccessMsg] = useState("");

  // ---- helpers ----
  const callChange = (fn, name, value) => {
    if (!fn) return;
    if (fn.length >= 2) {
      fn(name, value);
      return;
    }
    fn({ target: { name, value } });
  };

  const fireField = (name, value) => callChange(onFieldChange, name, value);
  const fireCountryField = (name, value) =>
    callChange(onCountrySpecificFieldChange, name, value);
  const fireBusinessField = (name, value) =>
    callChange(onBusinessTypeFieldChange, name, value);

  const setIfEmpty = (scope, key, setter, nextVal) => {
    if (nextVal === undefined || nextVal === null) return;
    const next = String(nextVal).trim();
    if (!next) return;

    let current = "";
    if (scope === "root") current = data?.[key] ?? "";
    if (scope === "country") current = data?.countrySpecificFields?.[key] ?? "";
    if (scope === "business")
      current = data?.businessTypeSpecificFields?.[key] ?? "";

    const empty =
      current === null ||
      current === undefined ||
      String(current).trim() === "";
    if (empty) setter(next);
  };

  // ---- ACRA helpers ----
  const ddMmmYyyyToISO = (s) => {
    if (!s) return "";
    const m = String(s)
      .trim()
      .match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/i);
    if (!m) return "";
    const day = m[1].padStart(2, "0");
    const mon = m[2].toUpperCase();
    const year = m[3];
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
    if (acraFile.type !== "application/pdf")
      return setAcraError("Only PDF is allowed.");

    setAcraUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", acraFile);
      const res = await fetch(ACRA_WITH_TABLES_ENDPOINT, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Autofill failed (${res.status})`);
      }
      const payload = await res.json();
      const kv = payload?.data?.kv_page_1 || {};
      const ownerName = payload?.data?.owner?.owner_name || "";
      const ownerId = payload?.data?.owner?.identification_number || "";

      // map values into the dynamically generated fields.  country-specific
      // fields are used for both actual country data and the basic business
      // fields defined in the Singapore config, therefore we treat them
      // uniformly here.
      setIfEmpty(
        "country",
        "businessName",
        (v) => fireCountryField("businessName", v),
        kv["name of business"] || kv["name of company"],
      );

      setIfEmpty(
        "country",
        "registeredAddress",
        (v) => fireCountryField("registeredAddress", v),
        kv["principal place of business"],
      );

      const isoDate = ddMmmYyyyToISO(
        kv["registration date"] || kv["commencement date"],
      );
      if (isoDate)
        setIfEmpty(
          "country",
          "registrationDate",
          (v) => fireCountryField("registrationDate", v),
          isoDate,
        );

      const mappedStatus = normalizeStatus(
        kv["status of business"] || kv["status of company"],
      );
      if (mappedStatus)
        setIfEmpty(
          "country",
          "businessStatus",
          (v) => fireCountryField("businessStatus", v),
          mappedStatus,
        );

      if (kv["uen"]) {
        setIfEmpty(
          "country",
          "uen",
          (v) => fireCountryField("uen", v),
          kv["uen"],
        );
        // populate acraUEN as well regardless of current value
        setIfEmpty(
          "country",
          "acraUEN",
          (v) => fireCountryField("acraUEN", v),
          kv["uen"],
        );
      }

      // first owner details (flattened by current form design)
      if (ownerName && data?.businessTypeSpecificFields?.fullName) {
        setIfEmpty(
          "business",
          "fullName",
          (v) => fireBusinessField("fullName", v),
          ownerName,
        );
      }
      if (ownerId && data?.businessTypeSpecificFields?.idNumber) {
        setIfEmpty(
          "business",
          "idNumber",
          (v) => fireBusinessField("idNumber", v),
          ownerId,
        );
      }

      setAcraSuccessMsg("Autofill completed. Please review before proceeding.");
    } catch (err) {
      setAcraError(err?.message || "Failed to autofill from ACRA.");
    } finally {
      setAcraUploading(false);
    }
  };

  // ---- DYNAMIC FIELD CONFIG MAPPING ----
  const { countrySpecificFieldsConfig, businessTypeSpecificFieldsConfig } =
    useMemo(() => {
      // gather configuration for the current country and selected business type
      const entity = SINGAPORE_CONFIG.entities[data?.businessType] || {};
      const step2 = entity.steps?.find((s) => s.id === "step2") || {};

      const countryFields = {};
      const businessFields = {};

      // start with generic country fields (GST, acraUEN, etc.)
      // if (data?.country) {
      //   const ccfg = COUNTRIES[data.country]?.fields || {};
      //   Object.entries(ccfg).forEach(([key, val]) => {
      //     countryFields[key] = {
      //       type: val.type || "text",
      //       label: val.label,
      //       placeholder: val.placeholder || "",
      //       required: val.required || false,
      //     };
      //   });
      // }

      // overlay the Singapore entity's own step2 fields
      if (step2.fields) {
        Object.entries(step2.fields).forEach(([key, val]) => {
          countryFields[key] = {
            type: val.type,
            label: val.label,
            placeholder: val.placeholder || "",
            required: val.required || false,
          };
        });
      }

      // flatten any repeatable-section fields into business-specific list
      if (step2.repeatableSections) {
        Object.values(step2.repeatableSections).forEach((section) => {
          Object.entries(section.fields).forEach(([key, val]) => {
            businessFields[key] = {
              type: val.type,
              label: val.label,
              placeholder: val.placeholder || "",
              required: val.required || false,
            };
          });
        });
      }

      return {
        countrySpecificFieldsConfig: countryFields,
        businessTypeSpecificFieldsConfig: businessFields,
      };
    }, [data?.businessType, data?.country]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Basic Information
      </h2>

      {/* SG ACRA Autofill */}
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

      {/* Country-Specific Fields */}
      {Object.entries(countrySpecificFieldsConfig).map(
        ([fieldName, fieldConfig]) => (
          <FormFieldGroup
            key={fieldName}
            fieldName={fieldName}
            label={fieldConfig.label}
            placeholder={fieldConfig.placeholder}
            value={data.countrySpecificFields?.[fieldName] || ""}
            onChange={onCountrySpecificFieldChange}
            error={errors[fieldName]}
            touched={touched[fieldName]}
            required={fieldConfig.required}
            disabled={disabled}
          />
        ),
      )}

      {/* Business-Type-Specific Fields */}
      {Object.entries(businessTypeSpecificFieldsConfig).map(
        ([fieldName, fieldConfig]) => (
          <FormFieldGroup
            key={fieldName}
            fieldName={fieldName}
            label={fieldConfig.label}
            placeholder={fieldConfig.placeholder}
            value={data.businessTypeSpecificFields?.[fieldName] || ""}
            onChange={onBusinessTypeFieldChange}
            error={errors[fieldName]}
            touched={touched[fieldName]}
            required={fieldConfig.required}
            type={fieldName.includes("Details") ? "textarea" : "text"}
            disabled={disabled}
          />
        ),
      )}
    </div>
  );
};

export default Step1BasicInformation;
