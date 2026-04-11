import axiosClient from "./axiosClient";
import axios from "axios";

export const livenessDetectionApi = async (payload) => {
  const res = await axiosClient.post(
    "/liveness-detection/createDetection",
    payload,
  );
  return res.data;
};

export const getKYCdetails = async (appId) => {
  // Using the specific endpoint you provided
  const res = await axiosClient.get(
    `/liveness-detection/byApplicationID/${appId}`,
  );
  return res.data;
};

export const getAllLivenessDetections = async (params = {}) => {
  const res = await axiosClient.get(`/liveness-detection/`, {
    params,
  });
  return res.data;
};

export const getLivenessDetectionBySessionId = async (sessionId) => {
  try {
    const res = await axios.get(
      `http://127.0.0.1:8000/liveness-detection/bySessionID/${sessionId}`,
    );

    console.log("[LIVENESS API] success:", res.data);

    return res.data;
  } catch (err) {
    console.error(
      "[LIVENESS API] error:",
      err.response?.status,
      err.response?.data || err.message,
    );

    throw new Error(
      `Failed to fetch liveness detection for session ${sessionId}`,
    );
  }
};
