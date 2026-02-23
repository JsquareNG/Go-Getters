import axiosClient from "./axiosClient";

export const getAllNotifications = async (recipientId) => {
  // Using the specific endpoint you provided
  const res = await axiosClient.get(`/bell/all/${recipientId}`);
  return res.data;
};

export const getUnreadNotifications = async (recipientId) => {
  // Using the specific endpoint you provided
  const res = await axiosClient.get(`/bell/unread/${recipientId}`);
  return res.data;
};

export const readOneApplication = async (applicationId) => {
  const res = await axiosClient.put(`/bell/read-one/${applicationId}`);
  return res.data;
};

export const readAllApplication = async (recipientId) => {
  const res = await axiosClient.put(`/bell/read-all/${recipientId}`);
  return res.data;
};
