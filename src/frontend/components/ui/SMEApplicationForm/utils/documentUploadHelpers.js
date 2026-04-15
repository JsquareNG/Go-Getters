import { allDocuments } from "@/api/documentApi";
import { getNestedValue, unwrapFile } from "./formDataHelpers";
import { getSectionRoleValue } from "./repeatableMappingHelpers";

// helper to transform extracted data into backend payoad
const buildExtractedDataPayload = (rawValue) => {
  if (!rawValue || typeof rawValue !== "object") return {};

  // Step 1 style: full raw OCR/classify response stored under extractedData
  if (rawValue.extractedData && typeof rawValue.extractedData === "object") {
    return rawValue.extractedData;
  }

  // Step 3 / older style: full raw response stored under classificationResult
  if (
    rawValue.classificationResult &&
    typeof rawValue.classificationResult === "object"
  ) {
    return rawValue.classificationResult;
  }

  // fallback: keep other metadata except the actual file blob
  const { file, ...rest } = rawValue;
  return rest;
};

const normalizeDocumentType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

export const buildExistingDocumentMap = (documents = []) => {
  return documents.reduce((acc, doc) => {
    const key = normalizeDocumentType(doc.document_type);
    if (key) acc[key] = doc;
    return acc;
  }, {});
};
// export const buildExistingDocumentMap = (documents = []) => {
//   return documents.reduce((acc, doc) => {
//     acc[doc.document_type] = doc;
//     return acc;
//   }, {});
// };

export const sanitizeDocumentFieldKey = (fieldKey) =>
  String(fieldKey || "").replace(/\./g, "_");

export const buildDocumentType = ({
  sectionKey = null,
  sectionConfig = null,
  rowIndex = null,
  fieldKey,
}) => {
  const safeFieldKey = sanitizeDocumentFieldKey(fieldKey);

  if (!sectionKey) return safeFieldKey;

  const roleValue = getSectionRoleValue(sectionKey, sectionConfig);
  return `${roleValue}_${rowIndex + 1}_${safeFieldKey}`;
};

export const collectFilesFromFieldSet = ({
  fieldSet,
  source,
  sectionKey = null,
  sectionConfig = null,
  rowIndex = null,
  uploads = [],
}) => {
  Object.entries(fieldSet || {}).forEach(([fieldKey, fieldConfig]) => {
    if (fieldKey === "conditionalFields") return;

    const rawValue = getNestedValue(source, fieldKey);

    if (fieldConfig?.type === "file") {
      const file = unwrapFile(rawValue);
      if (file) {
        uploads.push({
          fieldPath: sectionKey
            ? `${sectionKey}.${rowIndex}.${fieldKey}`
            : fieldKey,
          document_type: buildDocumentType({
            sectionKey,
            sectionConfig,
            rowIndex,
            fieldKey,
          }),
          file,
          rawValue,
        });
      }
    }

    if (fieldConfig?.conditionalFields && rawValue) {
      const nestedFieldSet = fieldConfig.conditionalFields[rawValue] || {};
      collectFilesFromFieldSet({
        fieldSet: nestedFieldSet,
        source,
        sectionKey,
        sectionConfig,
        rowIndex,
        uploads,
      });
    }

    if (
      typeof fieldConfig === "object" &&
      !fieldConfig.type &&
      !fieldConfig.label &&
      fieldKey !== "conditionalFields"
    ) {
      collectFilesFromFieldSet({
        fieldSet: fieldConfig,
        source: getNestedValue(source, fieldKey) || {},
        sectionKey,
        sectionConfig,
        rowIndex,
        uploads,
      });
    }
  });

  return uploads;
};

export const collectFileUploadEntries = (formData, activeConfig) => {
  const businessType = formData?.businessType;
  const entity = activeConfig?.entities?.[businessType];
  if (!entity?.steps) return [];

  const uploads = [];

  entity.steps.forEach((step) => {
    collectFilesFromFieldSet({
      fieldSet: step.fields || {},
      source: formData,
      uploads,
    });

    Object.entries(step.repeatableSections || {}).forEach(
      ([sectionKey, sectionConfig]) => {
        let rows = [];

        if (sectionConfig?.storage === "individuals") {
          const roleValue = getSectionRoleValue(sectionKey, sectionConfig);
          rows = (formData?.individuals || []).filter(
            (row) => row?.role === roleValue,
          );
        } else {
          rows = Array.isArray(formData?.[sectionKey])
            ? formData[sectionKey]
            : [];
        }

        rows.forEach((row, rowIndex) => {
          collectFilesFromFieldSet({
            fieldSet: sectionConfig.fields || {},
            source: row,
            sectionKey,
            sectionConfig,
            rowIndex,
            uploads,
          });
        });
      },
    );
  });

  return uploads;
};

export const replaceDocumentById = async ({
  documentId,
  file,
  extractedData,
}) => {
  const form = new FormData();
  form.append("file", file);
  form.append("extracted_data", JSON.stringify(extractedData || {}));

  const replaceRes = await fetch(
    `http://127.0.0.1:8000/documents/replace-upload/${documentId}`,
    {
      method: "POST",
      body: form,
    },
  );

  if (!replaceRes.ok) {
    throw new Error(`Failed to replace upload for document ${documentId}`);
  }

  return await replaceRes.json();
};

export const initDocumentUpload = async ({
  applicationId,
  documentType,
  file,
  extractedData = {},
}) => {
  const initRes = await fetch(
    "http://127.0.0.1:8000/documents/init-persist-upload",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: applicationId,
        document_type: documentType,
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        extracted_data: extractedData,
      }),
    },
  );

  if (!initRes.ok) {
    throw new Error(`Failed to init upload for ${documentType}`);
  }

  return await initRes.json();
};

export const uploadSingleDocument = async ({
  applicationId,
  documentType,
  file,
  existingDocumentMap = {},
  extractedData = {},
}) => {
  const existingDoc = existingDocumentMap[documentType];

  if (existingDoc?.document_id) {
    return await replaceDocumentById({
      documentId: existingDoc.document_id,
      file,
      extractedData,
    });
  }

  const initData = await initDocumentUpload({
    applicationId,
    documentType,
    file,
    extractedData,
  });

  if (!initData?.document_id) {
    throw new Error(`No document_id returned for ${documentType}`);
  }

  return await replaceDocumentById({
    documentId: initData.document_id,
    file,
    extractedData,
  });
};

export const uploadAllDocumentsFromFormData = async (
  rawFormData,
  activeConfig,
  applicationId,
) => {
  const root = {
    ...(rawFormData || {}),
    ...((rawFormData || {}).formData || {}),
    individuals:
      rawFormData?.formData?.individuals ?? rawFormData?.individuals ?? [],
  };

  const uploadEntries = collectFileUploadEntries(root, activeConfig);

  const uniqueUploadEntries = Object.values(
    uploadEntries.reduce((acc, entry) => {
      acc[entry.document_type] = entry;
      return acc;
    }, {}),
  );

  const existingDocs = await allDocuments(applicationId);
  const existingDocumentMap = buildExistingDocumentMap(existingDocs);

  const uploadedResults = [];

  for (const entry of uniqueUploadEntries) {
    const extractedData = buildExtractedDataPayload(entry.rawValue);

    const uploaded = await uploadSingleDocument({
      applicationId,
      documentType: entry.document_type,
      file: entry.file,
      existingDocumentMap,
      extractedData,
    });

    uploadedResults.push({
      ...entry,
      uploaded,
    });

    if (uploaded?.document_id) {
      existingDocumentMap[entry.document_type] = {
        document_id: uploaded.document_id,
        document_type: entry.document_type,
      };
    }
  }

  return uploadedResults;
};
