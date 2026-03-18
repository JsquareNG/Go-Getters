import { current } from "@reduxjs/toolkit";
import axiosClient from "./axiosClient";

export const getApplicationsByUserId = async (userId) => {
  // Using the specific endpoint you provided
  const res = await axiosClient.get(`/applications/byUserID/${userId}`);
  return res.data;
};

export const getApplicationByAppId = async (id) => {
  const res = await axiosClient.get(`/applications/byAppID/${id}`);
  return res.data;
};

/**
 * Save application draft with full form data persistence
 * Payload should include:
 * - user_id: userId
 * - email: user email
 * - firstName: user first name
 * - form_data: entire form state object including all fields, country-specific, business-specific, and documents
 * - application_id: (optional) for updating existing draft
 */
// export const saveApplicationDraftApi = async (payload) => {
//   // Construct the request with full form data
//   const draftPayload = {
//     user_id: payload.user_id,
//     email: payload.email,
//     firstName: payload.firstName,
//     business_country: payload.form_data.business_country, // Extract country from form_data for backend mapping
//     business_name: payload.form_data.business_name, // Extract business name from form_data for backend mapping
//     business_type: payload.form_data.business_type, // Extract business type from form_data for backend mapping
//     last_saved_step: payload.form_data.last_saved_step, // Extract last saved step from form_data for backend mapping
//     previous_status: payload.form_data.previous_status, // Extract previous status from form_data for backend mapping
//     current_status: payload.form_data.current_status, // Extract current status from form_data for backend mapping
//     form_data: payload.form_data, // entire form state
//     ...(payload.application_id && { application_id: payload.application_id }),
//   };

//   /*
//   @router.post("/firstSave")
//         business_country=data["business_country"],
//         business_name=data['business_name'],
//         business_type=data['business_type'],
//         user_id=data["user_id"],
//         form_data=form_data,
//         last_saved_step=data['last_saved_step'],
//         previous_status=None,
//         current_status="Draft"
//   */

//   // Determine endpoint: firstSave if new, secondSave if updating
//   const endpoint = payload.application_id
//     ? `/applications/secondSave/${payload.application_id}`
//     : "/applications/firstSave";

//   const res = await axiosClient.post(endpoint, draftPayload);
//   return res.data;
// };

/**
 * Save or update an SME application draft
 * @param {Object} payload - Contains user info, application_id, and form data
 */
export const saveApplicationDraftApi = async (payload) => {
  // Extract form-level fields for backend mapping
  const { user_id, email, firstName, application_id, form_data } = payload;

  // Build draft payload for API
  const draftPayload = {
    user_id,
    email,
    firstName,
    // business_country: state.data.country || "SG", // match Step0Brief
    // business_name: state.data.business_name || "", // match Step0Brief
    // business_type: state.data.businessType || "", // match Step0Brief
    business_country: form_data.business_country || "", // fallback empty string
    business_type: form_data.business_type || "",
    business_name: form_data.businessName || "",
    last_saved_step: form_data.last_saved_step ?? 0, // default to 0 if undefined
    previous_status: form_data.previous_status || null,
    current_status: form_data.current_status || "Draft",
    form_data, // entire form state including repeatable sections, documents, conditional fields
    ...(application_id && { application_id }), // include only if defined
  };

  console.log(
    "Saving application draft payload:",
    JSON.stringify(draftPayload, null, 2),
  );

  try {
    const res = application_id
      ? await axiosClient.put(
          `/applications/secondSave/${application_id}`,
          draftPayload,
        )
      : await axiosClient.post("/applications/firstSave", draftPayload);

    console.log("API response:", res.data); // log backend response

    return res.data;
  } catch (err) {
    console.error("Failed to save draft:", err);
    throw err;
  }
};

export const submitApplicationApi = async (payload) => {
  const res = await axiosClient.post("/applications/firstSubmit", payload);
  return res.data;
};

export const getApplicationByReviewer = async (reviewerId) => {
  const res = await axiosClient.get(`/applications/byEmployeeID/${reviewerId}`);
  return res.data;
};

export const approveApplication = async (applicationId, reason) => {
  const res = await axiosClient.put(`/applications/approve/${applicationId}`, {
    reason: String(reason ?? "").trim(),
  });
  return res.data;
};

export const rejectApplication = async (applicationId, reason) => {
  const res = await axiosClient.put(`/applications/reject/${applicationId}`, {
    reason: String(reason ?? "").trim(),
  });
  return res.data;
};

export const withdrawApplication = async (applicationId) => {
  const res = await axiosClient.put(`/applications/withdraw/${applicationId}`);
  return res.data;
};

export const escalateApplication = async (applicationId, payload) => {
  const reason = String(payload?.reason ?? "").trim();

  // backend expects: documents + questions
  const docsInput = Array.isArray(payload?.documents) ? payload.documents : [];
  const qsInput = Array.isArray(payload?.questions) ? payload.questions : [];

  // Normalize documents (allow multiple)
  const documents = docsInput
    .map((d) => ({
      document_name: String(d?.document_name ?? d?.name ?? "").trim(),
      document_desc: String(d?.document_desc ?? d?.description ?? "").trim(),
    }))
    .filter((d) => d.document_name || d.document_desc);

  // Normalize questions (allow multiple)
  const questions = qsInput
    .map((q) => ({
      question_text: String(q?.question_text ?? q ?? "").trim(),
      // You can include answer_text if you want, but backend currently doesn't store it on create
      ...(q?.answer_text !== undefined
        ? {
            answer_text:
              q?.answer_text === null ? null : String(q.answer_text).trim(),
          }
        : {}),
    }))
    .filter((q) => q.question_text);

  const body = { reason, documents, questions };

  // Optional debug (remove later)
  console.log("PUT /applications/escalate payload:", body);

  const res = await axiosClient.put(
    `/applications/escalate/${applicationId}`,
    body,
  );
  return res.data;
};

export const deleteApplication = async (applicationId) => {
  const res = await axiosClient.delete(`/applications/delete/${applicationId}`);
  return res.data;
};

export const getReviewJob = async (applicationId) => {
  const res = await axiosClient.get(
    `/reviewJobs/getReviewJob/${applicationId}`,
  );
  return res.data;
};

export const getAllJob = async () => {
  const res = await axiosClient.get(
    `/reviewJobs/`,
  );
  return res.data;
};

export const getMissingItems = async (applicationId) => {
  const res = await axiosClient.get(
    `/applications/getRequired/${applicationId}`,
  );
  return res.data;
};

export const secondSubmit = async (applicationId, payload) => {
  const res = await axiosClient.put(
    `/applications/secondSubmit/${applicationId}`,
    payload,
  );
  return res.data;
};

export const getQnA = async (applicationId) => {
  const res = await axiosClient.get(
    `/applications/getActionRequests/${applicationId}`,
  );
  return res.data;
};

export const getAllApplications = async () => {
  const response = await axiosClient.get("/applications/");
  return response.data;
};