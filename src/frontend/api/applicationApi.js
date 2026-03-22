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
 * Generic function to extract top-level fields dynamically from form_data
 * Can be extended if backend expects more mandatory fields per country/type
 */
const mapTopLevelFields = (form_data) => {
  return {
    // business_name: form_data.business_name || "",
    // business_country: form_data.country || "",
    // business_type: form_data.business_type || "",
    last_saved_step: form_data.last_saved_step ?? 0,
    previous_status: form_data.previous_status || null,
    current_status: form_data.current_status || "Draft",
  };
};

/**
 * Save or update SME application draft dynamically
 */
export const saveApplicationDraftApi = async (payload) => {
  // Extract form-level fields for backend mapping
  // const { user_id, email, first_name, application_id, form_data } = payload;

  // const draftPayload = {
  //   user_id,
  //   email,
  //   first_name,
  //   ...mapTopLevelFields(form_data), // dynamically mapped top-level fields
  //   form_data, // keep all dynamic fields for backend
  //   ...(application_id && { application_id }),
  // };

  // console.log("draft payload", draftPayload)

  const {application_id} = payload

  try {
    const res = application_id
      ? await axiosClient.put(
          `/applications/secondSave/${application_id}`,
          payload,
        )
      : await axiosClient.post("/applications/firstSave", payload);

    console.log("API response:", res.data); // log backend response
    console.log("payload", payload)

    return res.data;
  } catch (err) {
    console.error("Failed to save draft:", err);
    throw err;
  }
};

/**
 * Submit SME application dynamically
 */
export const submitSmeApplicationApi = async (payload) => {
  const { application_id } = payload;

  // const submitPayload = {
  //   form_data,
  //   current_status: "Submitted",
  //   ...(application_id && { application_id }),
  // };

  try {
    const res = application_id
      ? await axiosClient.put(
          `/applications/secondSubmit/${application_id}`,
          payload,
        )
      : await axiosClient.post("/applications/firstSubmit", payload);

    return res.data;
  } catch (err) {
    console.error("Failed to submit SME application:", err);
    throw err;
  }
};

// export const submitApplicationApi = async (payload) => {
//   const res = await axiosClient.post("/applications/firstSubmit", payload);
//   return res.data;
// };

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