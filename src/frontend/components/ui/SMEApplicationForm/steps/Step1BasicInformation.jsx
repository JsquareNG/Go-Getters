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
}) => {
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [ocrState, setOcrState] = useState({});
  const [verificationState, setVerificationState] = useState({});
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const processedOcrFilesRef = useRef({});
  const hydratedSessionsRef = useRef({});

  // useEffect(() => {
  //   if (!applicationId || applicationId === "new") return;

  //   const fetchDocs = async () => {
  //     try {
  //       const docs = await allDocuments(applicationId);
  //       setExistingDocuments(Array.isArray(docs) ? docs : []);
  //     } catch (err) {
  //       console.error("Failed to fetch documents", err);
  //       setExistingDocuments([]);
  //     }
  //   };

  //   fetchDocs();
  // }, [applicationId]);

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

  // helps to find rooted documents - matches uploaded documents to the correct form field using document type normalization
  const findExistingDocumentForField = (fieldPath, fieldConfig = {}) => {
    if (!Array.isArray(existingDocuments) || !existingDocuments.length)
      return null;

    const normalizedFieldPath = normalizeDocumentType(fieldPath);
    const expectedType = normalizeDocumentType(
      fieldConfig?.ocrTarget ||
        inferExpectedDocumentType(fieldPath, fieldConfig),
    );

    return (
      existingDocuments.find(
        (doc) =>
          normalizeDocumentType(doc.document_type) === normalizedFieldPath,
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

    const month = monthMap[monthText];

    if (!month) return "";

    const paddedDay = day.padStart(2, "0");

    return `${year}-${month}-${paddedDay}`;
  };

  const normalizeDocumentType = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const hasUsableLocalFile = (value) =>
    !!value && (value instanceof File || value?.file instanceof File);

  // helper file function
  const inferExpectedDocumentType = (fieldKey, fieldConfig) => {
    if (fieldConfig?.ocrTarget === "business_profile") {
      return "business_profile";
    }

    const key = String(fieldKey || "").toLowerCase();

    if (key.includes("businessprofile")) return "business_profile";
    if (key.includes("npwp")) return "npwp_certificate";
    if (key.includes("proofofaddress")) return "proof_of_address";

    return key;
  };

  //show on ui
  const getDisplayedFileValue = (fieldPath, fieldConfig = {}) => {
    const localValue =
      getNestedValue(getFormDataRoot(), fieldPath) ??
      getNestedValue(data, fieldPath) ??
      null;

    if (hasUsableLocalFile(localValue)) return localValue;

    const existingDoc = findExistingDocumentForField(fieldPath, fieldConfig);

    // const existingDoc = existingDocumentMap[fieldPath];
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
        // rawResult: localValue.classificationResult || null,
        // isSupported: localValue.isSupported ?? null,
      };
    }

    if (existingDocumentMap[fieldPath]) {
      return {
        status: "verified",
        message: "Previously uploaded document found.",
        detectedType: normalizeDocumentType(
          existingDocumentMap[fieldPath]?.document_type,
        ),
        expectedType: normalizeDocumentType(
          existingDocumentMap[fieldPath]?.document_type,
        ),
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
        const result = await classifyAndExtractApi(file);
        console.log("classify results:", result);

        const detectedType = normalizeDocumentType(
          result?.document_type ||
            result?.classified_as ||
            result?.doc_type ||
            result?.label,
        );

        // FILE VALIDATION
        const validation = result?.upload_validation;
        const isNotSupported = validation?.status === "FAIL";
        if (isNotSupported) {
          const errorMessage = validation?.reasons[0]
            ? "Uploaded document does not match expected type OR its quality is too low. Please try again."
            : "Document is not supported.";

          setFieldVerificationState(fieldPath, {
            status: "failed",
            message: errorMessage,
            expectedType,
            detectedType,
          });

          throw new Error(errorMessage);
        }

        const nextValue = {
          file,
          progress: 0,
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
        if (
          !verificationState[fieldPath]?.status ||
          verificationState[fieldPath]?.status === "verifying"
        ) {
          setFieldVerificationState(fieldPath, {
            status: "failed",
            message:
              err?.message ||
              "Verification failed. Please upload the file again.",
            expectedType,
            detectedType: null,
          });
        }

        throw err;
      }
    },
    [verificationState],
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
      );
      const registrationNumber = pickFirstNonEmpty(
        payload.business_registration_number,
        payload.nib_number,
      );
      const address = pickFirstNonEmpty(
        payload.registered_address,
        payload.address,
      );
      const businessStatus = pickFirstNonEmpty(
        payload.business_status,
        payload.company_status,
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
        updates.registrationDate = indoDateToISO(issuedDate);
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
      );
      const address = pickFirstNonEmpty(
        payload.registered_address,
        payload.address,
      );
      const registrationDate = pickFirstNonEmpty(
        payload.date_of_registration,
        payload.registration_date,
        payload.business_start_date,
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
        updates.registrationDate = ddMmmYyyyToISO(registrationDate);
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

  // since it can be called from multiple places (after KYC verification, on component mount to hydrate from existing sessions), we create a single handler to persist the KYC result both locally and to parent callback if provided
  const handlePersistKycResultLocal = async ({
    provider_session_id,
    kycData,
    diditPayload,
    mappedFields,
  }) => {
    const formRoot = getFormDataRoot();
    const individuals = Array.isArray(formRoot?.individuals)
      ? formRoot.individuals
      : [];

    const nextIndividuals = individuals.map((person) => {
      const matchesSession =
        person?.provider_session_id === provider_session_id ||
        person?.providerSessionId === provider_session_id ||
        person?.kyc?.sessionId === provider_session_id;

      if (!matchesSession) return person;

      return {
        ...person,
        provider_session_id,
        kyc: {
          ...(person?.kyc || {}),
          ...(kycData || {}),
        },
        fullName: mappedFields?.fullName || person?.fullName || "",
        idNumber: mappedFields?.idNumber || person?.idNumber || "",
        dateOfBirth: mappedFields?.dateOfBirth || person?.dateOfBirth || "",
        nationality: mappedFields?.nationality || person?.nationality || "",
        residentialAddress:
          mappedFields?.residentialAddress || person?.residentialAddress || "",
      };
    });

    const nextFormRoot = {
      ...formRoot,
      individuals: nextIndividuals,
    };

    // immediately update local form state
    onFieldChange("formData", nextFormRoot);

    // then call parent callback too, if provided
    if (onPersistKycResult) {
      try {
        await onPersistKycResult({
          provider_session_id,
          kycData,
          diditPayload,
          mappedFields,
        });
      } catch (err) {
        console.error("[STEP1] parent onPersistKycResult failed:", err);
      }
    }
  };

  const sessionSignature = JSON.stringify(
    (getFormDataRoot()?.individuals || []).map(
      (person) => person?.provider_session_id || null,
    ),
  );
  useEffect(() => {
    if (!applicationId || applicationId === "new") return;

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

          const nextKyc = mapDetectionToKyc(detection);
          const mappedFields = mapDetectionToIndividualFields(detection);
          console.log("[MAP fields]", mappedFields);

          const currentPerson = nextFormRoot.individuals[index];

          const nextPerson = {
            ...currentPerson,
            provider_session_id:
              currentPerson?.provider_session_id ||
              detection?.provider_session_id ||
              "",
            kyc: nextKyc,
            fullName: mappedFields.fullName || currentPerson?.fullName,
            idNumber: mappedFields.idNumber || currentPerson?.idNumber,
            dateOfBirth: mappedFields.dateOfBirth || currentPerson?.dateOfBirth,
            nationality: mappedFields.nationality || currentPerson?.nationality,
            residentialAddress:
              mappedFields.residentialAddress ||
              currentPerson?.residentialAddress,
          };

          const changed =
            JSON.stringify(currentPerson) !== JSON.stringify(nextPerson);

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
          // } catch (err) {
          //   console.error(`Failed to hydrate KYC for row ${index}`, err);
          // }
        } catch (err) {
          const status = err?.response?.status;

          if (status === 404) {
            console.warn(
              `[HYDRATE] Liveness detection not found yet for row ${index}, session ${sessionId}`,
            );
            continue;
          }

          console.error(`[HYDRATE] Failed for row ${index}`, err);
        }
      }

      if (hasChanges) {
        onFieldChange("formData", nextFormRoot);
        // handleFieldChange("individuals", nextFormRoot.individuals);
      }
    };

    hydrateIndividualsFromSessions();
  }, [applicationId, sessionSignature]);

  useEffect(() => {
    hydratedSessionsRef.current = {};
  }, [applicationId]);

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
  }, [basicFieldsConfig, data, ocrState]);

  // ensure minimum rows for repeatable sections are present on initial load
  // useEffect(() => {
  //   const formRoot = getFormDataRoot();

  //   Object.entries(repeatableSectionsConfig).forEach(
  //     ([sectionKey, sectionConfig]) => {
  //       const storageKey = sectionConfig?.storage;
  //       const minRows = sectionConfig?.min || 0;
  //       const rowTypeField = sectionConfig?.rowTypeField;
  //       const rowTypeValue = sectionConfig?.rowTypeValue;
  //       const fields = sectionConfig?.fields || {};

  //       if (!storageKey || minRows < 1) return;

  //       const existingRows = Array.isArray(formRoot?.[storageKey])
  //         ? formRoot[storageKey]
  //         : [];

  //       const matchingRows =
  //         rowTypeField && rowTypeValue
  //           ? existingRows.filter((row) => row?.[rowTypeField] === rowTypeValue)
  //           : existingRows;

  //       if (matchingRows.length >= minRows) return;

  //       const rowsToAdd = Array.from(
  //         { length: minRows - matchingRows.length },
  //         () => {
  //           const newRow = {};

  //           Object.entries(fields).forEach(([fieldKey, fieldConfig]) => {
  //             if (fieldConfig?.value !== undefined) {
  //               newRow[fieldKey] = fieldConfig.value;
  //             } else {
  //               newRow[fieldKey] = "";
  //             }
  //           });

  //           if (rowTypeField && rowTypeValue && newRow[rowTypeField] == null) {
  //             newRow[rowTypeField] = rowTypeValue;
  //           }

  //           return newRow;
  //         },
  //       );

  //       const nextFormRoot = {
  //         ...formRoot,
  //         [storageKey]: [...existingRows, ...rowsToAdd],
  //       };

  //       onFieldChange("formData", nextFormRoot);
  //       // handleFieldChange(storageKey, [...existingRows, ...rowsToAdd]);
  //     },
  //   );
  // }, [repeatableSectionsConfig]);
  useEffect(() => {
  const minRows = Number(sectionConfig?.min || 0);
  if (minRows <= 0) return;

  if (sectionConfig?.storage === "individuals") {
    const allIndividuals = Array.isArray(formData?.individuals)
      ? formData.individuals
      : [];

    const roleField = sectionConfig?.rowTypeField;
    const roleValue = sectionConfig?.rowTypeValue;

    const matchingRows = allIndividuals.filter(
      (row) => row?.[roleField] === roleValue,
    );

    if (matchingRows.length >= minRows) return;

    const rowsToAdd = buildMinRowsForSection(
      sectionConfig,
      minRows - matchingRows.length,
    );

    const nextIndividuals = [...allIndividuals, ...rowsToAdd];
    onFormDataChange({
      ...formData,
      individuals: nextIndividuals,
    });

    return;
  }

  const storageKey = sectionConfig?.storage || sectionKey;
  const existingRows = Array.isArray(formData?.[storageKey])
    ? formData[storageKey]
    : [];

  if (existingRows.length >= minRows) return;

  const rowsToAdd = buildMinRowsForSection(
    sectionConfig,
    minRows - existingRows.length,
  );

  onFormDataChange({
    ...formData,
    [storageKey]: [...existingRows, ...rowsToAdd],
  });
}, [formData, onFormDataChange, sectionConfig, sectionKey]);

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
                onPersistKycResult: handlePersistKycResultLocal,
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
              onPersistKycResult: handlePersistKycResultLocal,
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
              onPersistKycResult: handlePersistKycResultLocal,
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
