import { current } from "@reduxjs/toolkit";
import axiosClient from "./axiosClient";

export const getApplicationsByUserId = async (userId) => {
  try {
    const res = await axiosClient.get(`/applications/byUserID/${userId}`);
    return res.data;
  } catch (err) {
    if (err?.response?.status === 404) {
      return [];
    }
    throw err;
  }
};

export const getApplicationByAppId = async (id) => {
  const res = await axiosClient.get(`/applications/byAppID/${id}`);
  return res.data;
};

const mapTopLevelFields = (form_data) => {
  return {
    last_saved_step: form_data.last_saved_step ?? 0,
    previous_status: form_data.previous_status || null,
    current_status: form_data.current_status || "Draft",
  };
};

export const saveApplicationDraftApi = async (payload) => {
  console.log("draft payload", payload)

  const { application_id } = payload;

  try {
    const res = application_id
      ? await axiosClient.put(
          `/applications/secondSave/${application_id}`,
          payload,
        )
      : await axiosClient.post("/applications/firstSave", payload);

    console.log("API response:", res.data); // log backend response
    console.log("payload", payload);

    return res.data;
  } catch (err) {
    console.error("Failed to save draft:", err);
    throw err;
  }
};

export const submitSmeApplicationApi = async (payload) => {
  const { application_id } = payload;

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

  const docsInput = Array.isArray(payload?.documents) ? payload.documents : [];
  const qsInput = Array.isArray(payload?.questions) ? payload.questions : [];

  const documents = docsInput
    .map((d) => ({
      document_name: String(d?.document_name ?? d?.name ?? "").trim(),
      document_desc: String(d?.document_desc ?? d?.description ?? "").trim(),
    }))
    .filter((d) => d.document_name || d.document_desc);

  const questions = qsInput
    .map((q) => ({
      question_text: String(q?.question_text ?? q ?? "").trim(),
      ...(q?.answer_text !== undefined
        ? {
            answer_text:
              q?.answer_text === null ? null : String(q.answer_text).trim(),
          }
        : {}),
    }))
    .filter((q) => q.question_text);

  const body = { reason, documents, questions };

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

