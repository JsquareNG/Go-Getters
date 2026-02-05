import axios from "axios";
import { store } from "../store/store";
import { logout } from "../store/authSlice";

const axiosClient = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// attach JWT token automatically
axiosClient.interceptors.request.use((config) => {
  const token = store.getState().auth.token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// auto logout if token invalid/expired
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default axiosClient;

