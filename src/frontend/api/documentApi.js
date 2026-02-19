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
export async function uploadDocument({ applicationId, documentType, file, onProgress }) {
  const payload = {
    application_id: applicationId,
    document_type: documentType,
    filename: file.name,
    mime_type: file.type || "application/octet-stream",
  };

  try {
    return await uploadDocumentApi(payload, file, onProgress);
  } catch (err) {
    console.error("uploadDocument failed:", err?.response || err);
    throw err;
  }
}


// import axiosClient from "./axiosClient";

// export const uploadDocumentApi = async (payload, file, onProgress) => {
//   const initResp = await axiosClient.post(
//     "/documents/init-persist-upload",
//     payload,
//     { headers: { "Content-Type": "application/json" } },
//   );

//   const { uploadUrl, uploadId, ...meta } = initResp.data;
//   // Debug: log init response so we can inspect uploadUrl/uploadId
//   try {
//     console.debug("documentApi.initResp:", initResp.data);
//   } catch (e) {
//     // noop
//   }

//   // Upload the actual file to the provided URL
//   // Upload the actual file to the provided URL using XMLHttpRequest.
//   // We use XHR here (instead of the axios client) so that:
//   // - We avoid axios interceptors (Authorization headers) being sent to
//   //   presigned upload URLs (S3/GCS) which often reject extra headers.
//   // - We get reliable progress events in the browser.
//   const uploadWithXhr = (url, file, onProgressCb) => {
//     return new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       xhr.open("PUT", url);

//       // Only set Content-Type if provided by the file object
//       // Some presigned endpoints expect the header to match what was signed;
//       // if you run into CORS issues, try removing this header.
//       try {
//         if (file && file.type) xhr.setRequestHeader("Content-Type", file.type);
//       } catch (e) {
//         // Some browsers/environments may throw when setting forbidden headers
//       }

//       xhr.upload.onprogress = function (e) {
//         if (!e.lengthComputable) return;
//         const pct = Math.round((e.loaded * 100) / e.total);
//         // Debug: log progress to browser console
//         try {
//           console.debug("documentApi.upload.progress", {
//             filename: file.name,
//             pct,
//           });
//         } catch (err) {}
//         if (onProgressCb) onProgressCb(pct);
//       };

//       xhr.onload = function () {
//         if (xhr.status >= 200 && xhr.status < 300) {
//           try {
//             console.debug("documentApi.upload.complete", {
//               filename: file.name,
//               status: xhr.status,
//             });
//           } catch (err) {}
//           resolve({ status: xhr.status, response: xhr.response });
//         } else {
//           try {
//             console.warn("documentApi.upload.failedStatus", {
//               filename: file.name,
//               status: xhr.status,
//             });
//           } catch (err) {}
//           reject(new Error(`Upload failed with status ${xhr.status}`));
//         }
//       };

//       xhr.onerror = function (err) {
//         reject(err || new Error("Network error during file upload"));
//       };

//       xhr.send(file);
//     });
//   };

//   // Debug: indicate upload is starting
//   try {
//     console.debug("documentApi.upload.start", {
//       filename: file.name,
//       uploadUrl,
//     });
//   } catch (err) {}

//   await uploadWithXhr(uploadUrl, file, onProgress);

//   try {
//     console.debug("documentApi.upload.success", {
//       filename: file.name,
//       uploadId,
//       uploadUrl,
//     });
//   } catch (err) {}

//   // Return metadata including the server-assigned uploadId
//   return { uploadId, ...meta, filename: file.name };
// };

// // Compatibility wrapper used by the form hook
// export async function uploadDocument(documentType, file, onProgress) {
//   try {
//     const payload = {
//       document_type: documentType,
//       filename: file.name,
//     };

//     const result = await uploadDocumentApi(payload, file, onProgress);
//     return result;
//   } catch (err) {
//     console.error("uploadDocument failed:", err?.response || err);
//     throw err;
//   }
// }

// // export const uploadDocumentApi = async (payload, file, onProgress) => {
// //   // Step 1: init-persist-upload with the payload (metadata)
// //   const initResponse = await axiosClient.post(
// //     "/documents/init-persist-upload",
// //     payload,
// //     { headers: { "Content-Type": "application/json" } }
// //   );

// //   const { uploadUrl, uploadId, ...meta } = initResponse.data;

// //   // Step 2: upload actual file to the returned URL
// //   await axiosClient.put(uploadUrl, file, {
// //     headers: { "Content-Type": file.type },
// //     onUploadProgress: (progressEvent) => {
// //       if (!progressEvent.lengthComputable) return;
// //       const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
// //       if (onProgress) onProgress(pct);
// //     },
// //   });

// //   // Return full metadata including what came from init
// //   return {
// //     uploadId,
// //     filename: file.name,
// //     document_type: payload.document_type,
// //     mime_type: file.type,
// //     ...meta,
// //   };
// // };
