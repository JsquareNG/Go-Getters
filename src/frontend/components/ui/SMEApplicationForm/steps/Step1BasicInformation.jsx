import React, { useRef, useState } from "react";
import FormFieldGroup from "../components/FormFieldGroup";

const ACRA_WITH_TABLES_ENDPOINT =
  "http://127.0.0.1:8000/document-ai/extract-acra-with-tables";

const Step1BasicInformation = ({
  data,
  errors,
  touched,
  onFieldChange,
  onCountrySpecificFieldChange,
  onBusinessTypeFieldChange,
  countrySpecificFieldsConfig,
  businessTypeSpecificFieldsConfig,
  disabled = false,
}) => {
  const fileRef = useRef(null);

  const [acraFile, setAcraFile] = useState(null);
  const [acraUploading, setAcraUploading] = useState(false);
  const [acraError, setAcraError] = useState("");
  const [acraSuccessMsg, setAcraSuccessMsg] = useState("");

  // ---- helpers to support both setter styles (event vs (name,value)) ----
  const callChange = (fn, name, value) => {
    if (!fn) return;

    // If the function expects 2 args, it's (fieldName, value)
    if (fn.length >= 2) {
      fn(name, value);
      return;
    }

    // Otherwise treat as event handler
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
    if (v === "LIVE") return "Active";
    if (v === "ACTIVE") return "Active";
    if (v === "INACTIVE") return "Inactive";
    if (v === "DISSOLVED") return "Dissolved";
    if (v === "LIQUIDATED") return "Liquidated";
    if (v === "IN RECEIVERSHIP") return "InReceivership";
    if (v === "STRUCK OFF") return "StruckOff";
    return "";
  };

  // ---- file select ----
  const handleChooseAcra = () => fileRef.current?.click();

  const handleAcraFileChange = (e) => {
    setAcraError("");
    setAcraSuccessMsg("");
    const file = e.target.files?.[0];
    if (!file) return;
    setAcraFile(file);
    e.target.value = "";
  };

  // ---- autofill ----
  const handleAutofillAcra = async () => {
    setAcraError("");
    setAcraSuccessMsg("");

    if (data?.country !== "SG") return; // SG-only

    if (!acraFile) {
      setAcraError("Please upload your ACRA business profile PDF first.");
      return;
    }

    if (acraFile.type !== "application/pdf") {
      setAcraError("Only PDF is allowed.");
      return;
    }

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
      const d = payload?.data ?? payload;

      const kv = d?.kv_page_1 || {};
      const entityType = d?.entity_type || "";

      const ownerName = d?.owner?.owner_name || "";
      const ownerId = d?.owner?.identification_number || "";

      // ---- Root fields ----
      setIfEmpty(
        "root",
        "companyName",
        (v) => fireField("companyName", v),
        kv["name of business"] || kv["name of company"],
      );

      setIfEmpty(
        "root",
        "registeredOfficeAddress",
        (v) => fireField("registeredOfficeAddress", v),
        kv["principal place of business"],
      );

      const isoDate = ddMmmYyyyToISO(
        kv["registration date"] || kv["commencement date"],
      );
      if (isoDate) {
        setIfEmpty(
          "root",
          "incorporationDate",
          (v) => fireField("incorporationDate", v),
          isoDate,
        );
      }

      const mappedStatus = normalizeStatus(
        kv["status of business"] || kv["status of company"],
      );
      if (mappedStatus) {
        setIfEmpty(
          "root",
          "status",
          (v) => fireField("status", v),
          mappedStatus,
        );
      }

      // ---- Country-specific (SG) ----
      if (countrySpecificFieldsConfig?.acraUEN) {
        setIfEmpty(
          "country",
          "acraUEN",
          (v) => fireCountryField("acraUEN", v),
          kv["uen"],
        );
      }

      // ---- Business-type-specific fields (dynamic) ----
      // Only fill if those fields are present for the selected business type
      const bizFields = businessTypeSpecificFieldsConfig || {};

      // Sole Proprietorship
      if ("ownerName" in bizFields && ownerName) {
        setIfEmpty(
          "business",
          "ownerName",
          (v) => fireBusinessField("ownerName", v),
          ownerName,
        );
      }
      if ("ownerIdNumber" in bizFields && ownerId) {
        setIfEmpty(
          "business",
          "ownerIdNumber",
          (v) => fireBusinessField("ownerIdNumber", v),
          ownerId,
        );
      }

      // Partnership: if you want to prefill partnerDetails with owner as first line (optional)
      // Only if your form is currently a partnership and field exists.
      if ("partnerDetails" in bizFields && (ownerName || ownerId)) {
        const line = [ownerName, ownerId].filter(Boolean).join(", ");
        if (line) {
          // if empty, set; if not empty, append (avoid duplicates)
          const current =
            data?.businessTypeSpecificFields?.partnerDetails?.trim() || "";
          if (!current) {
            fireBusinessField("partnerDetails", line);
          } else if (!current.includes(line)) {
            fireBusinessField("partnerDetails", `${current}\n${line}`);
          }
        }
      }

      setAcraSuccessMsg(
        "Autofill completed. Please review the details before proceeding.",
      );
    } catch (err) {
      setAcraError(err?.message || "Failed to autofill from ACRA.");
    } finally {
      setAcraUploading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Basic Information
      </h2>

      {/* SG-only ACRA Autofill Block */}
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

      {/* Standard Fields */}
      <FormFieldGroup
        fieldName="companyName"
        label="Company Name"
        placeholder="Enter company legal name"
        value={data.companyName}
        onChange={onFieldChange}
        error={errors.companyName}
        touched={touched.companyName}
        required
        disabled={disabled}
      />

      {/* Dynamic Country-Specific Fields */}
      {data.country &&
        Object.entries(countrySpecificFieldsConfig).map(
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
              helpText={`Format: ${fieldConfig.placeholder}`}
              disabled={disabled}
            />
          ),
        )}

      {/* Dynamic Business-Type-Specific Fields */}
      {data.businessType &&
        Object.entries(businessTypeSpecificFieldsConfig).map(
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

      {/* INCORPORATION DATE */}
      <FormFieldGroup
        fieldName="incorporationDate"
        label="Incorporation Date"
        placeholder="Select date"
        value={data.incorporationDate}
        onChange={onFieldChange}
        error={errors.incorporationDate}
        touched={touched.incorporationDate}
        type="date"
        required
        disabled={disabled}
      />

      {/* STATUS OF COMPANY */}
      <FormFieldGroup
        fieldName="status"
        label="Status of Company"
        placeholder="Select status"
        value={data.status}
        onChange={onFieldChange}
        error={errors.status}
        touched={touched.status}
        type="select"
        options={[
          { value: "Active", label: "Active" },
          { value: "Inactive", label: "Inactive" },
          { value: "Dissolved", label: "Dissolved" },
          { value: "Liquidated", label: "Liquidated" },
          { value: "InReceivership", label: "In Receivership" },
          { value: "StruckOff", label: "Struck Off" },
        ]}
        required
        disabled={disabled}
      />

      {/* REGISTERED OFFICE ADDRESS */}
      <FormFieldGroup
        fieldName="registeredOfficeAddress"
        label="Registered Office Address"
        placeholder="Enter registered office address"
        value={data.registeredOfficeAddress}
        onChange={onFieldChange}
        error={errors.registeredOfficeAddress}
        touched={touched.registeredOfficeAddress}
        type="textarea"
        required
        disabled={disabled}
      />

      {/* Contact Information */}
      <FormFieldGroup
        fieldName="email"
        label="Email Address"
        placeholder="company@example.com"
        value={data.email}
        onChange={onFieldChange}
        error={errors.email}
        touched={touched.email}
        type="email"
        required
        disabled={disabled}
      />

      <FormFieldGroup
        fieldName="phone"
        label="Phone Number"
        placeholder="+1 (555) 000-0000"
        value={data.phone}
        onChange={onFieldChange}
        error={errors.phone}
        touched={touched.phone}
        type="tel"
        required
        disabled={disabled}
      />
    </div>
  );
};

export default Step1BasicInformation;
