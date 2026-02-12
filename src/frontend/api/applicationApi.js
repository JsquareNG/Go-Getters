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