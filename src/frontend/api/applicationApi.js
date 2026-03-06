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
        ? { answer_text: q?.answer_text === null ? null : String(q.answer_text).trim() }
        : {}),
    }))
    .filter((q) => q.question_text);

  const body = { reason, documents, questions };

  // Optional debug (remove later)
  console.log("PUT /applications/escalate payload:", body);

  const res = await axiosClient.put(`/applications/escalate/${applicationId}`, body);
  return res.data;
};

export const deleteApplication = async (applicationId) => {
  const res = await axiosClient.delete(`/applications/delete/${applicationId}`);
  return res.data;
};

export const getReviewJob = async (applicationId) => {
  const res = await axiosClient.get(`/reviewJobs/getReviewJob/${applicationId}`);
  return res.data;
};

export const getMissingItems = async (applicationId) => {
  const res = await axiosClient.get(`/applications/getRequired/${applicationId}`);
  return res.data;
};

export const secondSubmit = async (applicationId, payload) => {
  const res = await axiosClient.put(`/applications/secondSubmit/${applicationId}`, payload);
  return res.data;
};

export const getQnA = async (applicationId) => {
  const res = await axiosClient.get(`/applications/getActionRequests/${applicationId}`);
  return res.data;
};