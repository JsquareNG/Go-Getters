import axiosClient from "./axiosClient";

export const loginUser = async (email, password) => {
  const res = await axiosClient.post("/users/login", {
    email,
    password,
  });
  return res.data;
};

export const registerSME = async (payload) => {
  const res = await axiosClient.post("/users/register", payload);
  return res.data;
};
