import axiosClient from "./axiosClient";

/**
 * Normalize Supabase signed upload response into a URL string.
 * Supabase SDK responses can vary by version.
 */
const extractSignedUploadUrl = (signedUpload) => {
  if (!signedUpload) return null;
  if (typeof signedUpload === "string") return signedUpload;

  return (
    signedUpload.signedURL ||
    signedUpload.signedUrl ||
    signedUpload.url ||
    signedUpload.signed_upload_url ||
    null
  );
};

/**
 * Upload to a signed URL with XHR so we get progress events and avoid axios interceptors.
 */
const uploadWithXhr = (url, file, onProgressCb) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);

    // Some signed URLs expect matching Content-Type
    try {
      if (file?.type) xhr.setRequestHeader("Content-Type", file.type);
    } catch (e) {
      // ignore
    }

    xhr.upload.onprogress = function (e) {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded * 100) / e.total);
      if (onProgressCb) onProgressCb(pct);
    };

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ status: xhr.status, response: xhr.response });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = function () {
      reject(new Error("Network error during file upload"));
    };

    xhr.send(file);
  });
};

/**
 * Main upload: init -> PUT to signed URL -> confirm
 *
 * payload MUST include: application_id, document_type, filename, mime_type
 */
export const uploadDocumentApi = async (payload, file, onProgress) => {
  // 1) init
  const initResp = await axiosClient.post(
    "/documents/init-persist-upload",
    payload,
    { headers: { "Content-Type": "application/json" } },
  );

  // Backend returns: { document_id, storage_path, signed_upload }
  const { document_id, storage_path, signed_upload } = initResp.data || {};

  const uploadUrl = extractSignedUploadUrl(signed_upload);

  if (!document_id) throw new Error("init-persist-upload did not return document_id");
  if (!uploadUrl) throw new Error("init-persist-upload did not return signed upload URL");

  // 2) upload file bytes to signed url
  await uploadWithXhr(uploadUrl, file, onProgress);

  // 3) confirm
  await axiosClient.post(
    "/documents/confirm-persist-upload",
    { document_id },
    { headers: { "Content-Type": "application/json" } },
  );

  // return meta
  return {
    document_id,
    storage_path,
    document_type: payload.document_type,
    filename: payload.filename,
    mime_type: payload.mime_type,
  };
};

/**
 * Convenience wrapper you can call from submit.
 * IMPORTANT: you MUST pass applicationId now.
 */
export async function uploadDocument({ applicationId, documentType, file, onProgress, extracted_data }) {
  const payload = {
    application_id: applicationId,
    document_type: documentType,
    filename: file.name,
    mime_type: file.type || "application/octet-stream",
    extracted_data: extracted_data
  };

  try {
    return await uploadDocumentApi(payload, file, onProgress);
  } catch (err) {
    console.error("uploadDocument failed:", err?.response || err);
    throw err;
  }
}

export const allDocuments = async (applicationId) => {
  const res = await axiosClient.get(`/documents/by-application/${applicationId}`);
  return res.data;
};

export const downloadDocuments = async (documentId) => {
  const res = await axiosClient.get(`/documents/download-url/${documentId}`);
  return res.data;
};
