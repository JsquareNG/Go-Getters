import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  countries: null,
  businessTypes: null,
  documentTypes: null,
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
