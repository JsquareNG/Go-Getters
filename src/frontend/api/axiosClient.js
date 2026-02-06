import axios from "axios";
import { store } from "../store/store";
import { logout } from "../store/authSlice";

const axiosClient = axios.create({
  baseURL: "https://go-getters-onboarding.onrender.com", // FastAPI URL
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosClient;

