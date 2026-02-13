import { createSlice } from "@reduxjs/toolkit";
import {
  COUNTRIES,
  BUSINESS_TYPES,
  DOCUMENT_TYPES,
} from "../components/ui/SMEApplicationForm/config";

const initialState = {
  countries: COUNTRIES,
  businessTypes: BUSINESS_TYPES,
  documentTypes: DOCUMENT_TYPES,
};

const smeConfigSlice = createSlice({
  name: "smeFormConfig",
  initialState,
  reducers: {
    setConfig(state, action) {
      return { ...state, ...action.payload };
    },
    resetConfig() {
      return initialState;
    },
  },
});

export const { setConfig, resetConfig } = smeConfigSlice.actions;
export default smeConfigSlice.reducer;
