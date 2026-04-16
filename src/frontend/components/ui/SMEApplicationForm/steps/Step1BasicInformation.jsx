import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

import FieldRenderer from "../components/FieldRenderer";
import ConditionalFieldsRenderer from "../components/ConditionalFieldsRenderer";
import RepeatableSectionRenderer from "../components/RepeatableSectionRenderer";

import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";

import { allDocuments } from "@/api/documentApi";
import { classifyAndExtractApi } from "@/api/ocrApi";
import { getLivenessDetectionBySessionId } from "@/api/livenessDetectionApi";

import { mapIsoToNationalityOption } from "../utils/countries";

const Step1BasicInformation = ({
  data,
  onFieldChange,
  disabled = false,
  applicationId,
  onPersistKycResult,
  onBeforeStartKyc,
}) => {
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [ocrState, setOcrState] = useState({});
  const [verificationState, setVerificationState] = useState({});
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const processedOcrFilesRef = useRef({});
  const hydratedSessionsRef = useRef({});
  const hasHydratedRef = useRef(false);

  //FETCH EXISTING DOCUMENTS FOR THIS APPLICATION
  useEffect(() => {
    if (!applicationId || applicationId === "new") return;

    const fetchDocuments = async () => {
      try {
        setLoadingDocuments(true);
        const docs = await allDocuments(applicationId);
        setExistingDocuments(Array.isArray(docs) ? docs : []);
      } catch (err) {
        console.error("Failed to fetch existing documents:", err);
        setExistingDocuments([]);
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [applicationId]);

  const existingDocumentMap = useMemo(() => {
    return existingDocuments.reduce((acc, doc) => {
      acc[doc.document_type] = doc;
      return acc;
    }, {});
  }, [existingDocuments]);

  const CONFIG_MAP = {
    Singapore: SINGAPORE_CONFIG,
    Indonesia: INDONESIA_CONFIG,
  };

  const activeConfig = CONFIG_MAP[data?.country] || SINGAPORE_CONFIG;

  const { basicFieldsConfig, repeatableSectionsConfig } = useMemo(() => {
    const entity = activeConfig?.entities[data?.businessType] || {};
    const step2 = entity.steps?.find((s) => s.id === "step2") || {};

    return {
      basicFieldsConfig: step2.fields || {},
      repeatableSectionsConfig: step2.repeatableSections || {},
    };
  }, [activeConfig, data?.businessType]);

  const getFormDataRoot = () => {
    if (data?.formData && Object.keys(data.formData).length > 0) {
      return data.formData;
    }
    return data || {};
  };

  const buildRepeatableDocumentType = (fieldPath) => {
    const parts = String(fieldPath || "").split(".");
    if (parts.length < 3) return null;

    const [storageKey, rowIndexRaw, fieldKey] = parts;
    const rowIndex = Number(rowIndexRaw);

    if (storageKey !== "individuals" || Number.isNaN(rowIndex)) return null;

    const formRoot = getFormDataRoot();
    const row = formRoot?.individuals?.[rowIndex];
    if (!row) return null;

    const matchedSection = Object.entries(repeatableSectionsConfig || {}).find(
      ([, sectionConfig]) =>
        sectionConfig?.storage === "individuals" &&
        row?.[sectionConfig?.rowTypeField] === sectionConfig?.rowTypeValue,
    );

    if (!matchedSection) return null;

    const [, sectionConfig] = matchedSection;
    const roleValue = sectionConfig?.rowTypeValue || row?.role || "Individual";

    const sameRoleRows = (formRoot?.individuals || []).filter(
      (person) =>
        person?.[sectionConfig?.rowTypeField] === sectionConfig?.rowTypeValue,
    );

    const rolePosition = sameRoleRows.findIndex((person) => person === row) + 1;

    return `${roleValue}_${rolePosition}_${fieldKey}`;
  };

  // helps to find rooted documents - matches uploaded documents to the correct form field using document type normalization
  const findExistingDocumentForField = (fieldPath, fieldConfig = {}) => {
    if (!Array.isArray(existingDocuments) || !existingDocuments.length) {
      return null;
    }

    const normalizedFieldPath = normalizeDocumentType(fieldPath);
    const expectedType = normalizeDocumentType(
      fieldConfig?.ocrTarget ||
        inferExpectedDocumentType(fieldPath, fieldConfig),
    );

    // necessary for nested file fields within repeatable sections - e.g. individuals
    const repeatableDocType = buildRepeatableDocumentType(fieldPath);
    const normalizedRepeatableDocType =
      normalizeDocumentType(repeatableDocType);

    return (
      existingDocuments.find(
        (doc) =>
          normalizeDocumentType(doc.document_type) === normalizedFieldPath,
      ) ||
      existingDocuments.find(
        (doc) =>
          normalizedRepeatableDocType &&
          normalizeDocumentType(doc.document_type) ===
            normalizedRepeatableDocType,
      ) ||
      existingDocuments.find(
        (doc) => normalizeDocumentType(doc.document_type) === expectedType,
      ) ||
      null
    );
  };

  // finds the value from form_data to map it
  const getNestedValue = (objs, path) => {
    if (!path) return undefined;

    const sources = Array.isArray(objs) ? objs : [objs];

    for (const obj of sources) {
      const value = path.split(".").reduce((acc, key) => {
        if (acc == null) return undefined;
        const isIndex = !Number.isNaN(Number(key));
        return isIndex ? acc[Number(key)] : acc[key];
      }, obj);

      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }

    return undefined;
  };

  const indoDateToISO = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return "";

    const monthMap = {
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

    const parts = dateStr.toLowerCase().split(" ");

    if (parts.length !== 3) return "";

    const [day, monthText, year] = parts;

    const month = monthMap[monthText];

    if (!month) return "";

    const paddedDay = day.padStart(2, "0");

    return `${year}-${month}-${paddedDay}`;
  };

  const ddMmmYyyyToISO = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return "";

    const monthMap = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };

    const parts = dateStr.split(" ");

    if (parts.length !== 3) return "";

    const [day, monthText, year] = parts;

    // const month = monthMap[monthText];
    const month = monthMap[monthText.toLowerCase()];

    if (!month) return "";

    const paddedDay = day.padStart(2, "0");

    return `${year}-${month}-${paddedDay}`;
  };

  const ddMmYyyyToISO = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return "";

    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";

    const [day, month, year] = parts;

    if (!day || !month || !year) return "";

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  const normalizeDocumentType = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  // const hasUsableLocalFile = (value) =>
  //   !!value && (value instanceof File || value?.file instanceof File);
  const hasUsableLocalFile = (value) =>
    !!value &&
    (value instanceof File ||
      value?.file instanceof File ||
      value?.uploaded === true ||
      value?.document_id ||
      value?.original_filename ||
      value?.storage_path);

  // helper file function
  const inferExpectedDocumentType = (fieldKey, fieldConfig) => {
    // if (fieldConfig?.ocrTarget === "business_profile") {
    //   return "businessProfile";
    // }

    const key =
      String(fieldKey || "")
        .split(".")
        .pop()
        ?.toLowerCase() || "";

    if (key.includes("businessprofile")) return "acra";
    if (key.includes("acra")) return "acra";
    if (key.includes("npwp")) return "npwp_certificate";
    if (key.includes("proofofaddress")) return "proof_of_address";

    if (key.includes("passport")) return "id_document";
    if (key.includes("ktp")) return "ktp";
    if (key.includes("id")) return "id_document";

    if (key.includes("nib")) return "nib";
    if (key.includes("businessregistration")) return "nib";

    return key;
  };

  //show on ui
  // const getDisplayedFileValue = (fieldPath, fieldConfig = {}) => {
  // //   const formRoot = getFormDataRoot();

  // // const localFromFormData = getNestedValue(data?.formData || {}, fieldPath);
  // // const localFromData = getNestedValue(data, fieldPath);

  // // const localValue = localFromFormData ?? localFromData ?? null;
  // // const existingDoc = findExistingDocumentForField(fieldPath, fieldConfig);
  //   const localValue =
  //     getNestedValue(data?.formData || {}, fieldPath) ??
  //     getNestedValue(data, fieldPath) ??
  //     null;

  //   console.log("LOCAL", localValue);
  //   // if (
  //   //   localValue &&
  //   //   (localValue instanceof File || localValue?.file instanceof File)
  //   // ) {
  //   //   return localValue;
  //   // }
  //   if (
  //     localValue &&
  //     (localValue instanceof File ||
  //       localValue?.file instanceof File ||
  //       localValue?.verificationStatus ||
  //       localValue?.verified !== undefined ||
  //       localValue?.original_filename)
  //   ) {
  //     return localValue;
  //   }

  //   const existingDoc = findExistingDocumentForField(fieldPath, fieldConfig);
  //   // if (!existingDoc) return null;

  //   return {
  //     uploaded: true,
  //     verified: true,
  //     verificationStatus: "verified",
  //     verificationMessage: "Previously uploaded document found.",
  //     document_id: existingDoc.document_id,
  //     document_type: existingDoc.document_type,
  //     original_filename: existingDoc.original_filename,
  //     storage_path: existingDoc.storage_path,
  //     mime_type: existingDoc.mime_type,
  //     status: existingDoc.status,
  //     created_at: existingDoc.created_at,
  //   };
  // };

  //show on ui
  const getDisplayedFileValue = (fieldPath, fieldConfig = {}) => {
    const localValue =
      getNestedValue(data?.formData || {}, fieldPath) ??
      getNestedValue(data, fieldPath) ??
      null;
      console.log("step 1 get display", localValue)

    // if (
    //   localValue &&
    //   (localValue instanceof File || localValue?.file instanceof File)
    // ) {
    //   return localValue;
    // }
    if (
      localValue &&
      (localValue?.verificationStatus ||
        localValue?.verified !== undefined ||
        localValue?.original_filename ||
        localValue?.originalFilename ||
        localValue?.uploaded === true)
    ) {
      return {
        ...localValue,
        original_filename:
          localValue.original_filename ||
          localValue.originalFilename ||
          localValue.file?.name ||
          "",
        mime_type:
          localValue.mime_type ||
          localValue.mimeType ||
          "application/octet-stream",
        upload_status:
          localValue.upload_status || localValue.uploadStatus || "pending",
      };
    }

    const existingDoc = findExistingDocumentForField(fieldPath, fieldConfig);
    if (!existingDoc) return null;

    return {
      uploaded: true,
      verified: true,
      verificationStatus: "verified",
      verificationMessage: "Previously uploaded document found.",
      document_id: existingDoc.document_id,
      document_type: existingDoc.document_type,
      original_filename: existingDoc.original_filename,
      storage_path: existingDoc.storage_path,
      mime_type: existingDoc.mime_type,
      status: existingDoc.status,
      created_at: existingDoc.created_at,
    };
  };
  const getFieldVerificationMeta = (fieldPath) => {
    const localValue =
      getNestedValue(getFormDataRoot(), fieldPath) ??
      getNestedValue(data, fieldPath) ??
      null;

    if (verificationState[fieldPath]) return verificationState[fieldPath];

    if (localValue?.verificationStatus) {
      return {
        status: localValue.verificationStatus,
        message: localValue.verificationMessage || "",
        detectedType: localValue.detectedType || null,
        expectedType: localValue.expectedType || null,
      };
    }
    const existingDoc = findExistingDocumentForField(fieldPath);

    if (existingDoc) {
      return {
        status: "verified",
        message: "Previously uploaded document found.",
        detectedType: normalizeDocumentType(existingDoc?.document_type),
        expectedType: normalizeDocumentType(existingDoc?.document_type),
      };
    }

    return {
      status: "idle",
      message: "",
      detectedType: null,
      expectedType: null,
    };
  };

  const setFieldVerificationState = (fieldKey, nextState) => {
    setVerificationState((prev) => ({
      ...prev,
      [fieldKey]: {
        ...(prev[fieldKey] || {}),
        ...nextState,
      },
    }));
  };

  // --------------
  // ---HELPER ----
  // --------------
  //initialise min individuals row
  const buildDefaultRowFromFields = (fields = {}) => {
    const row = {};

    Object.entries(fields).forEach(([fieldKey, fieldConfig]) => {
      if (!fieldConfig || typeof fieldConfig !== "object") return;

      if (fieldConfig.type === "kyc") {
        row[fieldKey] = {
          status: "idle",
          loading: false,
          sessionId: null,
          overallStatus: null,
          idVerificationStatus: null,
          livenessStatus: null,
          faceMatchStatus: null,
          livenessScore: null,
          faceMatchScore: null,
        };
        return;
      }

      if (fieldConfig.type === "checkbox") {
        row[fieldKey] = [];
        return;
      }

      if (fieldConfig.value !== undefined) {
        row[fieldKey] = fieldConfig.value;
        return;
      }

      row[fieldKey] = "";
    });

    return row;
  };

  // create required number of rows for repeatable sections with minRows defined
  const buildMinRowsForSection = (sectionConfig, count) => {
    return Array.from({ length: count }, () => {
      const baseRow = buildDefaultRowFromFields(sectionConfig?.fields || {});

      if (sectionConfig?.rowTypeField && sectionConfig?.rowTypeValue) {
        baseRow[sectionConfig.rowTypeField] = sectionConfig.rowTypeValue;
      }
      // console.log("base", baseRow);
      return baseRow;
    });
  };

  const buildFileValidator = useCallback(
    (fieldPath, fieldConfig) => async (file) => {
      const expectedType = inferExpectedDocumentType(fieldPath, fieldConfig);

      setFieldVerificationState(fieldPath, {
        status: "verifying",
        message: "Verifying document...",
        expectedType,
        detectedType: null,
      });

      try {
        const result = await classifyAndExtractApi(file, expectedType);
        console.log("classify results:", result);

        const detectedType = normalizeDocumentType(
          result?.document_type ||
            result?.classified_as ||
            result?.doc_type ||
            result?.label,
        );

        // ----------------------
        // FILE VALIDATION
        // ----------------------
        const validation = result?.upload_validation;
        const validationStatus = validation?.status;
        const validationReasons = validation?.reasons || [];

        if (validationStatus === "FAIL") {
          const errorMessage =
            validationReasons[0] ||
            "Uploaded document does not match expected type OR its quality is too low. Please try again.";

          const failedValue = {
            file,
            original_filename: file?.name || "",
            mime_type: file?.type || "application/octet-stream",
            upload_status: "failed",
            // progress: 0,
            verified: false,
            verificationStatus: "failed",
            verificationMessage: errorMessage,
            detectedType,
            expectedType,
            extractedData: result,
          };

          setFieldVerificationState(fieldPath, {
            status: "failed",
            message: errorMessage,
            expectedType,
            detectedType,
          });

          // throw new Error(errorMessage);
          return failedValue;
        }

        const nextValue = {
          file,
          original_filename: file?.name || "",
          mime_type: file?.type || "application/octet-stream",
          upload_status: "pending",
          // progress: 0,
          verified: true,
          verificationStatus: "verified",
          verificationMessage: "Document verified successfully.",
          detectedType,
          expectedType,
          extractedData: result,
        };

        setFieldVerificationState(fieldPath, {
          status: "verified",
          message: "Document verified successfully.",
          expectedType,
          detectedType,
        });

        return nextValue;
      } catch (err) {
        // if (
        //   !verificationState[fieldPath]?.status ||
        //   verificationState[fieldPath]?.status === "verifying"
        // ) {

        const failedValue = {
          file,
          // progress: 0,
          original_filename: file?.name || "",
          mime_type: file?.type || "application/octet-stream",
          upload_status: "pending",
          verified: false,
          verificationStatus: "failed",
          verificationMessage: errorMessage,
          detectedType: null,
          expectedType,
          extractedData: null,
        };
        setFieldVerificationState(fieldPath, {
          status: "failed",
          message:
            err?.message ||
            "Verification failed. Please upload the file again.",
          expectedType,
          detectedType: null,
        });
        // }

        // throw err;
        return failedValue;
      }
    },
    [],
    // [verificationState],
  );

  const getSelectedVerifiedFileForField = (fieldKey) => {
    const formDataRoot = getFormDataRoot();
    const fileValue =
      getNestedValue(formDataRoot, fieldKey) ?? getNestedValue(data, fieldKey);

    const selectedFile = fileValue?.file || fileValue;
    const isVerified =
      fileValue?.verificationStatus === "verified" ||
      fileValue?.verified === true;

    if (!(selectedFile instanceof File)) return null;
    if (!isVerified) return null;

    return selectedFile;
  };

  const getFileSignature = (file) => {
    if (!(file instanceof File)) return null;
    return `${file.name}__${file.size}__${file.lastModified}`;
  };

  const handleFieldChange = (name, value) => {
    //    console.log("[Step1 handleFieldChange]", {
    //   name,
    //   value,
    //   original_filename: value?.original_filename,
    //   fileName: value?.file?.name,
    //   verificationStatus: value?.verificationStatus,
    // });
    if (!name) return;

    delete processedOcrFilesRef.current[name];

    if (!value) {
      setOcrState((prev) => ({
        ...prev,
        [name]: {
          loading: false,
          status: "",
          message: "",
        },
      }));
    }

    onFieldChange(name, value);
  };

  // helper to map from ocr to actual fields
  const pickFirstNonEmpty = (...values) => {
    for (const value of values) {
      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }
    return "";
  };

  // -----------------------
  // OCR Mapping
  // -----------------------
  const mapBusinessProfilePayloadToForm = (payload, country) => {
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error("No structured OCR data returned.");
    }

    const updates = {};

    if (country === "Indonesia") {
      // support both old and new payload shapes
      const issuedDate = pickFirstNonEmpty(
        payload.date_of_registration,
        payload.issued_date,
        payload.additional_data?.issuance_information?.issued_date,
        payload.registrationDate,
      );
      const phone = pickFirstNonEmpty(
        payload.phone,
        payload.phone_number,
        payload.additional_data?.contact_information?.phone_number,
      );
      const email = pickFirstNonEmpty(
        payload.email,
        payload.additional_data?.contact_information?.email,
      );
      const businessName = pickFirstNonEmpty(
        payload.business_name,
        payload.company_name,
        payload.businessName,
      );
      const registrationNumber = pickFirstNonEmpty(
        payload.business_registration_number,
        payload.nib_number,
        // payload.businessName
        payload.registrationNumber,
        payload.incorporationDate,
      );
      const address = pickFirstNonEmpty(
        payload.registered_address,
        payload.address,
        payload.registeredAddress,
      );
      const businessStatus = pickFirstNonEmpty(
        payload.business_status,
        payload.company_status,
        payload.businessStatus,
      );

      if (businessName) {
        updates.businessName = businessName;
      }

      if (registrationNumber) {
        updates.registrationNumber = registrationNumber;
      }

      if (address) {
        updates.registeredAddress = address;
      }

      if (issuedDate) {
        let normalizedDate = "";

        if (issuedDate.includes("-")) {
          // handles 19-01-2022
          normalizedDate = ddMmYyyyToISO(issuedDate);
        } else {
          // handles "19 Januari 2022"
          normalizedDate = indoDateToISO(issuedDate);
        }

        updates.registrationDate = normalizedDate;
      }

      if (payload.npwp) {
        updates.npwp = payload.npwp;
      }

      if (phone) {
        updates.phone = phone;
      }

      if (email) {
        updates.email = email;
      }

      if (businessStatus) {
        updates.businessStatus = businessStatus;
      }

      if (
        Array.isArray(payload.business_activities) &&
        payload.business_activities.length
      ) {
        updates.businessActivities = payload.business_activities;
      }

      return updates;
    }

    if (country === "Singapore") {
      // console.log("payload singapore", payload);
      const businessName = pickFirstNonEmpty(
        payload.business_name,
        payload.company_name,
        payload.businessName,
      );
      const uen = pickFirstNonEmpty(
        payload.business_registration_number,
        payload.uen,
        payload.registrationNumber,
      );
      const address = pickFirstNonEmpty(
        payload.registered_address,
        payload.address,
        payload.registeredAddress,
      );
      const registrationDate = pickFirstNonEmpty(
        payload.date_of_registration,
        payload.registration_date,
        payload.business_start_date,
        payload.registrationDate,
      );
      const phone = pickFirstNonEmpty(
        payload.phone,
        payload.phone_number,
        payload.additional_data?.contact_information?.phone_number,
      );
      const email = pickFirstNonEmpty(
        payload.email,
        payload.additional_data?.contact_information?.email,
      );

      if (businessName) {
        updates.businessName = businessName;
      }

      if (uen) {
        updates.uen = uen;
      }

      if (address) {
        updates.registeredAddress = address;
      }

      if (registrationDate) {
        let normalizedDate = "";

        // Case 1: already ISO
        if (/^\d{4}-\d{2}-\d{2}$/.test(registrationDate)) {
          normalizedDate = registrationDate;
        }

        // Case 2: DD-MM-YYYY
        else if (registrationDate.includes("-")) {
          normalizedDate = ddMmYyyyToISO(registrationDate);
        }

        // Case 3: "08 AUG 2016"
        else {
          normalizedDate = ddMmmYyyyToISO(registrationDate);
        }

        updates.registrationDate = normalizedDate;
        // updates.registrationDate = ddMmmYyyyToISO(registrationDate);
      }

      if (phone) {
        updates.phone = phone;
      }

      if (email) {
        updates.email = email;
      }

      return updates;
    }

    return updates;
  };

  // to map the extracted OCR data to the form fields, but only apply values to fields that are currently empty to avoid overwriting any existing data that user may have already filled in or edited after OCR autofill
  const applyMappedFieldsToFormData = (updates) => {
    Object.entries(updates).forEach(([fieldKey, nextValue]) => {
      // console.log(`Applying OCR update for ${fieldKey}:`, nextValue);

      if (
        // isEmpty &&
        nextValue !== undefined &&
        nextValue !== null &&
        nextValue !== ""
      ) {
        handleFieldChange(fieldKey, nextValue);
      }
    });
  };

  const handleOcrAutofill = async (fieldKey, fieldConfig) => {
    const formDataRoot = getFormDataRoot();
    const fileValue =
      getNestedValue(formDataRoot, fieldKey) ?? getNestedValue(data, fieldKey);

    const selectedFile = fileValue?.file || fileValue;
    const isVerified =
      fileValue?.verificationStatus === "verified" ||
      fileValue?.verified === true;

    if (!(selectedFile instanceof File) || !isVerified) {
      return;
    }

    setOcrState((prev) => ({
      ...prev,
      [fieldKey]: {
        loading: true,
        status: "processing",
        message: "",
      },
    }));

    try {
      let payload = fileValue?.extractedData?.data || null;

      if (!payload) {
        const result = await classifyAndExtractApi(selectedFile);
        payload = result?.data || {};
      }

      if (fieldConfig.ocrTarget === "business_profile") {
        const mappedFields = mapBusinessProfilePayloadToForm(
          payload,
          data?.country,
        );
        console.log("[MAPPED FIELDS]", mappedFields);

        applyMappedFieldsToFormData(mappedFields);
      }

      setOcrState((prev) => ({
        ...prev,
        [fieldKey]: {
          loading: false,
          status: "completed",
          message: "Autofill completed. Please review.",
        },
      }));
    } catch (err) {
      console.error(`OCR failed for ${fieldKey}`, err);

      setOcrState((prev) => ({
        ...prev,
        [fieldKey]: {
          loading: false,
          status: "failed",
          message: err?.message || "Failed to autofill.",
        },
      }));

      delete processedOcrFilesRef.current[fieldKey];
    }
  };

  //helper to determine if KYC result is successful
  const isSuccessfulKycResult = (kyc) => {
    if (!kyc || typeof kyc !== "object") return false;

    const overall = String(kyc?.overallStatus || "")
      .trim()
      .toLowerCase();
    const idv = String(kyc?.idVerificationStatus || "")
      .trim()
      .toLowerCase();
    const liveness = String(kyc?.livenessStatus || "")
      .trim()
      .toLowerCase();
    const face = String(kyc?.faceMatchStatus || "")
      .trim()
      .toLowerCase();

    return (
      overall === "approved" &&
      idv === "approved" &&
      liveness === "approved" &&
      face === "approved"
    );
  };

  const mapDetectionToKyc = (detection) => ({
    status:
      detection?.overall_status || detection?.id_verification_status
        ? "completed"
        : "idle",
    loading: false,
    sessionId: detection?.provider_session_id || "",
    overallStatus: detection?.overall_status || "",
    idVerificationStatus: detection?.id_verification_status || "",
    livenessStatus: detection?.liveness_status || "",
    livenessScore: detection?.liveness_score ?? null,
    faceMatchStatus: detection?.face_match_status || "",
    faceMatchScore: detection?.face_match_score ?? null,
  });

  const mapDetectionToIndividualFields = (detection) => ({
    fullName: detection?.full_name || "",
    idNumber: detection?.document_number || "",
    dateOfBirth: detection?.date_of_birth || "",
    // nationality: detection?.issuing_state_code || "",
    nationality: mapIsoToNationalityOption(detection?.issuing_state_code),
    residentialAddress: detection?.formatted_address || "",
  });

  const hydrateIndividualsFromSessions = async () => {
    const formRoot = getFormDataRoot();
    const individuals = Array.isArray(formRoot?.individuals)
      ? formRoot.individuals
      : [];

    if (!individuals.length) return;

    let nextFormRoot = formRoot;
    let hasChanges = false;

    for (let index = 0; index < individuals.length; index++) {
      const person = individuals[index];
      const sessionId = person?.provider_session_id;

      if (!sessionId) continue;

      const hydrationKey = `${index}:${sessionId}`;
      if (hydratedSessionsRef.current[hydrationKey]) continue;

      try {
        const detection = await getLivenessDetectionBySessionId(sessionId);
        console.log("detection for hydration", detection);
        if (!detection) {
          hydratedSessionsRef.current[hydrationKey] = true;
          continue; // STOP HERE
        }

        const nextKyc = mapDetectionToKyc(detection);
        const mappedFields = mapDetectionToIndividualFields(detection);
        console.log("[MAP fields]", mappedFields);

        //stops old declined hydration results from overwriting the new retry session
        const currentPerson = nextFormRoot.individuals[index];
        const currentSessionId =
          currentPerson?.provider_session_id ||
          currentPerson?.kyc?.sessionId ||
          "";

        if (currentSessionId !== sessionId) {
          // user already retried or switched session; ignore stale result
          continue;
        }

        const shouldMapIdentityFields = isSuccessfulKycResult(nextKyc);

        const nextPerson = {
          ...currentPerson,
          provider_session_id: currentSessionId,
          kyc: nextKyc,
          fullName: shouldMapIdentityFields
            ? mappedFields.fullName || currentPerson?.fullName
            : currentPerson?.fullName,
          idNumber: shouldMapIdentityFields
            ? mappedFields.idNumber || currentPerson?.idNumber
            : currentPerson?.idNumber,
          dateOfBirth: shouldMapIdentityFields
            ? mappedFields.dateOfBirth || currentPerson?.dateOfBirth
            : currentPerson?.dateOfBirth,
          nationality: shouldMapIdentityFields
            ? mappedFields.nationality || currentPerson?.nationality
            : currentPerson?.nationality,
          residentialAddress: shouldMapIdentityFields
            ? mappedFields.residentialAddress ||
              currentPerson?.residentialAddress
            : currentPerson?.residentialAddress,
        };

        // const changed =
        //   JSON.stringify(currentPerson) !== JSON.stringify(nextPerson);
        const changed =
          currentPerson.kyc?.overallStatus !== nextPerson.kyc?.overallStatus ||
          currentPerson.provider_session_id !== nextPerson.provider_session_id;

        if (changed) {
          nextFormRoot = {
            ...nextFormRoot,
            individuals: nextFormRoot.individuals.map((p, idx) =>
              idx === index ? nextPerson : p,
            ),
          };
          hasChanges = true;
        }

        hydratedSessionsRef.current[hydrationKey] = true;
      } catch (err) {
        console.error(`[HYDRATE] Failed for row ${index}`, err);
        hydratedSessionsRef.current[hydrationKey] = true;
        continue;
      }
    }

    if (hasChanges) {
      // onFieldChange("formData", nextFormRoot);
      onFieldChange("individuals", nextFormRoot.individuals);
    }
  };

  //clear only when the session signature changes significantly.
  //This helps prevent old hydration bookkeeping from interfering after retry
  useEffect(() => {
    if (!applicationId || applicationId === "new") return;
    if (hasHydratedRef.current) return;

    hydrateIndividualsFromSessions();
    hasHydratedRef.current = true;
  }, [applicationId]);

  const ocrEligibleSignature = JSON.stringify(
    Object.entries(basicFieldsConfig)
      .filter(
        ([, fieldConfig]) =>
          fieldConfig?.type === "file" && fieldConfig?.ocr === true,
      )
      .map(([fieldKey]) => {
        const selectedFile = getSelectedVerifiedFileForField(fieldKey);
        return selectedFile instanceof File
          ? getFileSignature(selectedFile)
          : null;
      }),
  );

  useEffect(() => {
    console.log("[Step1 mounted/current data]", {
      data,
      formData: data?.formData,
    });
  }, [data]);

  useEffect(() => {
    Object.entries(basicFieldsConfig).forEach(([fieldKey, fieldConfig]) => {
      if (fieldConfig?.type !== "file" || fieldConfig?.ocr !== true) return;

      const selectedFile = getSelectedVerifiedFileForField(fieldKey);
      if (!(selectedFile instanceof File)) return;

      const signature = getFileSignature(selectedFile);
      const alreadyProcessed =
        processedOcrFilesRef.current[fieldKey] === signature;
      const isCurrentlyLoading = ocrState?.[fieldKey]?.loading;

      if (!alreadyProcessed && !isCurrentlyLoading) {
        processedOcrFilesRef.current[fieldKey] = signature;
        handleOcrAutofill(fieldKey, fieldConfig);
      }
    });
  }, [basicFieldsConfig, ocrEligibleSignature]);

  // ensure minimum rows for repeatable sections with minRows defined on initial load
  const initializedMinRowsRef = useRef({});
  const initKey = useMemo(
    () =>
      `${applicationId || "new"}::${data?.country || ""}::${data?.businessType || ""}`,
    [applicationId, data?.country, data?.businessType],
  );
  useEffect(() => {
    console.log("[MIN INIT] effect run", {
      initKey,
      formRoot: getFormDataRoot(),
      repeatableSectionsConfig,
    });
    if (
      !repeatableSectionsConfig ||
      Object.keys(repeatableSectionsConfig).length === 0
    ) {
      return;
    }

    // if (initializedMinRowsRef.current[initKey]) {
    //   return;
    // }

    const formRoot = getFormDataRoot();

    let nextFormRoot = formRoot; //should overwrite
    let hasChanges = false;

    Object.entries(repeatableSectionsConfig).forEach(
      ([sectionKey, sectionConfig]) => {
        const minRows = Number(sectionConfig?.min || 0);
        if (minRows <= 0) return;

        const storageKey = sectionConfig?.storage || sectionKey;
        const existingRows = Array.isArray(nextFormRoot?.[storageKey])
          ? nextFormRoot[storageKey]
          : [];

        if (storageKey === "individuals") {
          const roleField = sectionConfig?.rowTypeField;
          const roleValue = sectionConfig?.rowTypeValue;

          // find the type of individual
          const matchingRows = existingRows.filter(
            (row) => row?.[roleField] === roleValue,
          );

          if (matchingRows.length >= minRows) return;

          const rowsToAdd = buildMinRowsForSection(
            sectionConfig,
            minRows - matchingRows.length,
          );

          nextFormRoot = {
            ...nextFormRoot,
            individuals: [...existingRows, ...rowsToAdd],
          };
          hasChanges = true;
          return;
        }

        // normal repeatablesections - businessActivities
        if (existingRows.length >= minRows) return;

        const rowsToAdd = buildMinRowsForSection(
          sectionConfig,
          minRows - existingRows.length,
        );
        console.log("[MIN INIT] writing nextFormRoot", nextFormRoot);
        nextFormRoot = {
          ...nextFormRoot,
          [storageKey]: [...existingRows, ...rowsToAdd],
        };
        hasChanges = true;
      },
    );

    initializedMinRowsRef.current[initKey] = true;

    if (hasChanges) {
      onFieldChange("formData", nextFormRoot);
    }
  }, [
    initKey,
    // applicationId,
    // data?.country,
    // data?.businessType,
    repeatableSectionsConfig,
    // repeatableRowCountsSignature
    data?.formData,
  ]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Basic Information
      </h2>

      {loadingDocuments && (
        <p className="mb-4 text-sm text-gray-500">
          Loading uploaded documents...
        </p>
      )}

      {Object.entries(basicFieldsConfig).map(([fieldKey, fieldConfig]) => {
        const value =
          getNestedValue(getFormDataRoot(), fieldKey) ??
          getNestedValue(data, fieldKey);

        if (fieldConfig?.conditionalFields) {
          return (
            <ConditionalFieldsRenderer
              key={fieldKey}
              fieldKey={fieldKey}
              fieldConfig={fieldConfig}
              value={value}
              rowData={getFormDataRoot()}
              onChange={(name, val) => handleFieldChange(name, val)}
              disabled={disabled}
              context={{
                data,
                applicationId,
                ocrState,
                verificationState,
                existingDocumentMap,
                beforeAcceptFile: buildFileValidator,
                onPersistKycResult,
                onBeforeStartKyc,
                getDisplayedFileValue,
                getFieldVerificationMeta,
              }}
            />
          );
        }

        return (
          <FieldRenderer
            key={fieldKey}
            fieldKey={fieldKey}
            fieldConfig={fieldConfig}
            value={value}
            onChange={(name, val) => handleFieldChange(name, val)}
            disabled={disabled}
            context={{
              data,
              applicationId,
              ocrState,
              verificationState,
              existingDocumentMap,
              beforeAcceptFile: buildFileValidator,
              onPersistKycResult,
              onBeforeStartKyc,
              getDisplayedFileValue,
              getFieldVerificationMeta,
            }}
          />
        );
      })}

      {Object.entries(repeatableSectionsConfig).map(
        ([sectionKey, sectionConfig]) => (
          <RepeatableSectionRenderer
            key={sectionKey}
            sectionKey={sectionKey}
            sectionConfig={sectionConfig}
            formData={getFormDataRoot()}
            onFormDataChange={(next) => onFieldChange("formData", next)}
            disabled={disabled}
            context={{
              data,
              applicationId,
              ocrState,
              verificationState,
              existingDocumentMap,
              beforeAcceptFile: buildFileValidator,
              onPersistKycResult,
              onBeforeStartKyc,
              getDisplayedFileValue,
              getFieldVerificationMeta,
            }}
          />
        ),
      )}
    </div>
  );
};

export default Step1BasicInformation;
