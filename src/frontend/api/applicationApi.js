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
export const saveApplicationDraftApi = async (payload) => {
  // Construct the request with full form data
  const draftPayload = {
    user_id: payload.user_id,
    email: payload.email,
    firstName: payload.firstName,
    form_data: payload.form_data, // entire form state
    ...(payload.application_id && { application_id: payload.application_id }),
  };

  const res = await axiosClient.post("/applications/firstSave", draftPayload);
  return res.data;
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

export const escalateApplication = async (applicationId, reason) => {
  const res = await axiosClient.put(`/applications/escalate/${applicationId}`, {
    reason: String(reason ?? "").trim(),
  });
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
