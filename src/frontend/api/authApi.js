import axiosClient from "./axiosClient";

export const loginApi = async (email, password) => {
  const res = await axiosClient.post("https://go-getters-onboarding.onrender.com/users/login", { email, password });
  return res.data;
};

export const registerApi = async (payload) => {
  const res = await axiosClient.post("https://go-getters-onboarding.onrender.com//users/register", payload);
  return res.data;
};

