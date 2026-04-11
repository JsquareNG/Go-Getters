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

  const processedOcrFilesRef = useRef({});
  const hydratedSessionsRef = useRef({});

  useEffect(() => {
    if (!applicationId || applicationId === "new") return;

    const fetchDocs = async () => {
      try {
        const docs = await allDocuments(applicationId);
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

  // const getNestedValue = (obj, path) => {
  //   if (!path) return undefined;

  //   return path.split(".").reduce((acc, key) => {
  //     if (acc == null) return undefined;
  //     const isIndex = !Number.isNaN(Number(key));
  //     return isIndex ? acc[Number(key)] : acc[key];
  //   }, obj);
  // };

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

  const getDisplayedFileValue = (fieldPath) => {
    const localValue =
      getNestedValue(getFormDataRoot(), fieldPath) ??
      getNestedValue(data, fieldPath) ??
      null;

    if (hasUsableLocalFile(localValue)) return localValue;

    const existingDoc = existingDocumentMap[fieldPath];
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
      console.log("[LOCAL VALUE]", localValue);
      return {
        status: localValue.verificationStatus,
        message: localValue.verificationMessage || "",
        detectedType: localValue.detectedType || null,
        expectedType: localValue.expectedType || null,
        rawResult: localValue.classificationResult || null,
        isSupported: localValue.isSupported ?? null,
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

  const setFieldVerificationState = (fieldKey, nextState) => {
    setVerificationState((prev) => ({
      ...prev,
      [fieldKey]: {
        ...(prev[fieldKey] || {}),
        ...nextState,
      },
    }));
  };

  const verifyAndMaybeExtractDocument = async ({
    file,
    fieldKey,
    fieldConfig,
  }) => {
    const expectedType = inferExpectedDocumentType(fieldKey, fieldConfig);

    const classifyResult = await classifyAndExtractApi(file);
    console.log("[VERIFY RESULT]", classifyResult);

    const detectedType = normalizeDocumentType(
      classifyResult?.document_type ||
        classifyResult?.classified_as ||
        classifyResult?.doc_type ||
        classifyResult?.label,
    );

    const isSupported = classifyResult?.is_supported === true;

    if (!isSupported) {
      const errorMessage =
        classifyResult?.upload_validation?.reasons?.join(", ") ||
        (detectedType
          ? `Detected document type "${detectedType}" is not supported.`
          : "This document is not supported.");

      throw new Error(errorMessage);
    }

    // if (expectedType && detectedType && expectedType !== detectedType) {
    //   throw new Error(
    //     `Wrong document uploaded. Expected "${expectedType}" but detected "${detectedType}".`,
    //   );
    // }

    let extractedData = null;

    // only do extraction for business profile OCR fields
    if (fieldConfig?.ocrTarget === "business_profile") {
      const extractResult = await classifyAndExtractApi(file);
      extractedData = extractResult?.data || null;
      console.log("[OCR EXTRACT RESULT]", extractedData);
    }

    return {
      classifyResult,
      extractedData,
      detectedType,
      expectedType,
      isSupported,
    };
  };

  const buildFileValidator = useCallback(
    (fieldKey, fieldConfig) => async (file) => {
      const expectedType = inferExpectedDocumentType(fieldKey, fieldConfig);

      setFieldVerificationState(fieldKey, {
        status: "verifying",
        message: "Verifying document...",
        expectedType,
        detectedType: null,
        rawResult: null,
      });

      try {
        const { classifyResult, extractedData, detectedType, isSupported } =
          await verifyAndMaybeExtractDocument({
            file,
            fieldKey,
            fieldConfig,
          });

        const nextValue = {
          file,
          progress: 0,
          verified: true,
          verificationStatus: "verified",
          verificationMessage: "Document verified successfully.",
          detectedType,
          expectedType,
          classificationResult: classifyResult,
          extractedData,
          uploadValidation: classifyResult?.upload_validation || null,
          isSupported,
        };

        setFieldVerificationState(fieldKey, {
          status: "verified",
          message: "Document verified successfully.",
          expectedType,
          detectedType,
          rawResult: classifyResult,
        });

        return nextValue;
      } catch (err) {
        setFieldVerificationState(fieldKey, {
          status: "failed",
          message:
            err?.response?.data?.detail ||
            err?.message ||
            "Verification failed. Please upload the file again.",
          expectedType,
          detectedType: null,
          rawResult: null,
        });

        throw err;
      }
    },
    [],
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

      //this will reset the verification state when the field is cleared, which is important to allow re-upload and re-verification of files
      // setVerificationState((prev) => ({
      //   ...prev,
      //   [name]: {
      //     status: "idle",
      //     message: "",
      //     expectedType: null,
      //     detectedType: null,
      //   },
      // }));
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
    // const formRoot = getFormDataRoot();

    Object.entries(updates).forEach(([fieldKey, nextValue]) => {
      // const currentValue =
      //   getNestedValue(formRoot, fieldKey) ?? getNestedValue(data, fieldKey);

      // const isEmpty =
      //   currentValue === undefined ||
      //   currentValue === null ||
      //   currentValue === "";

      console.log(`Applying OCR update for ${fieldKey}:`, nextValue);

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
      // const result = await classifyAndExtractApi(selectedFile);
      // const payload = result?.data || {};
      let payload = fileValue?.extractedData || null;

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
          mappedFields?.residentialAddress ||
          person?.residentialAddress ||
          "",
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

          const nextKyc = mapDetectionToKyc(detection);
          const mappedFields = mapDetectionToIndividualFields(detection);

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
        } catch (err) {
          console.error(`Failed to hydrate KYC for row ${index}`, err);
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
  useEffect(() => {
    const formRoot = getFormDataRoot();

    Object.entries(repeatableSectionsConfig).forEach(
      ([sectionKey, sectionConfig]) => {
        const storageKey = sectionConfig?.storage;
        const minRows = sectionConfig?.min || 0;
        const rowTypeField = sectionConfig?.rowTypeField;
        const rowTypeValue = sectionConfig?.rowTypeValue;
        const fields = sectionConfig?.fields || {};

        if (!storageKey || minRows < 1) return;

        const existingRows = Array.isArray(formRoot?.[storageKey])
          ? formRoot[storageKey]
          : [];

        const matchingRows =
          rowTypeField && rowTypeValue
            ? existingRows.filter((row) => row?.[rowTypeField] === rowTypeValue)
            : existingRows;

        if (matchingRows.length >= minRows) return;

        const rowsToAdd = Array.from(
          { length: minRows - matchingRows.length },
          () => {
            const newRow = {};

            Object.entries(fields).forEach(([fieldKey, fieldConfig]) => {
              if (fieldConfig?.value !== undefined) {
                newRow[fieldKey] = fieldConfig.value;
              } else {
                newRow[fieldKey] = "";
              }
            });

            if (rowTypeField && rowTypeValue && newRow[rowTypeField] == null) {
              newRow[rowTypeField] = rowTypeValue;
            }

            return newRow;
          },
        );

        const nextFormRoot = {
          ...formRoot,
          [storageKey]: [...existingRows, ...rowsToAdd],
        };

        onFieldChange("formData", nextFormRoot);
        // handleFieldChange(storageKey, [...existingRows, ...rowsToAdd]);
      },
    );
  }, [repeatableSectionsConfig]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Basic Information
      </h2>

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
