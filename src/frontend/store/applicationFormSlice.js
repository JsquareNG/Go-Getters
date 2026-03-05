import { createSlice, createSelector } from "@reduxjs/toolkit";

const initialState = {
  drafts: {},
  currentApplicationId: null,
  currentStep: 0,
  currentMode: "edit",
  hasUnsavedChanges: false,
};

const applicationFormSlice = createSlice({
  name: "applicationForm",
  initialState,
  reducers: {
    // Load an application from backend
    loadApplication: (state, action) => {
      const { applicationId, formData = {}, status = "Draft" } = action.payload;

      state.currentApplicationId = applicationId;
      state.currentMode = status === "Submitted" ? "view" : "edit";
      state.currentStep = 0;
      state.hasUnsavedChanges = false;

      state.drafts[applicationId] = {
        formData: { ...formData },
        status,
        lastModified: new Date().toISOString(),
      };
    },

    // Start brand new application
    startNewApplication: (state) => {
      const id = "new";
      state.currentApplicationId = id;
      state.currentMode = "edit";
      state.currentStep = 0;
      state.hasUnsavedChanges = false;

      if (!state.drafts[id]) {
        state.drafts[id] = {
          formData: {},
          status: "Draft",
          lastModified: new Date().toISOString(),
        };
      }
    },

    // Update single field (safe for controlled inputs)
    updateField: (state, action) => {
      const { field, value } = action.payload;
      const appId = state.currentApplicationId;
      if (!appId) return;

      if (!state.drafts[appId]) {
        state.drafts[appId] = { formData: {}, status: "Draft", lastModified: new Date().toISOString() };
      }

      state.drafts[appId].formData = {
        ...state.drafts[appId].formData,
        [field]: value,
      };
      state.drafts[appId].lastModified = new Date().toISOString();
      state.hasUnsavedChanges = true;
    },

    // Bulk update (useful when loading multiple fields)
    updateFormData: (state, action) => {
      const appId = state.currentApplicationId;
      if (!appId) return;

      if (!state.drafts[appId]) {
        state.drafts[appId] = { formData: {}, status: "Draft", lastModified: new Date().toISOString() };
      }

      state.drafts[appId].formData = {
        ...state.drafts[appId].formData,
        ...action.payload,
      };

      state.drafts[appId].lastModified = new Date().toISOString();
      state.hasUnsavedChanges = true;
    },

    // Change step in stepper
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },

    // Save draft
    saveDraft: (state) => {
      const appId = state.currentApplicationId;
      if (!appId) return;

      state.drafts[appId].status = "Draft";
      state.drafts[appId].lastModified = new Date().toISOString();
      state.hasUnsavedChanges = false;
    },

    // Submit application
    submitApplication: (state) => {
      const appId = state.currentApplicationId;
      if (!appId) return;

      state.drafts[appId].status = "Submitted";
      state.drafts[appId].submittedAt = new Date().toISOString();

      state.currentMode = "view";
      state.hasUnsavedChanges = false;
    },

    // Switch edit/view mode
    setMode: (state, action) => {
      state.currentMode = action.payload;
    },

    // Reset form
    clearApplication: (state) => {
      state.currentApplicationId = null;
      state.currentStep = 0;
      state.currentMode = "edit";
      state.hasUnsavedChanges = false;
    },

    // Delete draft
    deleteDraft: (state, action) => {
      const appId = action.payload;
      delete state.drafts[appId];
      if (state.currentApplicationId === appId) state.currentApplicationId = null;
    },
  },
});

export const {
  loadApplication,
  startNewApplication,
  updateField,
  updateFormData,
  setCurrentStep,
  saveDraft,
  submitApplication,
  setMode,
  clearApplication,
  deleteDraft,
} = applicationFormSlice.actions;

/* ---------------- Selectors ---------------- */

export const selectApplicationForm = (state) => state.applicationForm;
export const selectCurrentApplicationId = (state) =>
  state.applicationForm.currentApplicationId;
export const selectCurrentApplication = (state) => {
  const id = state.applicationForm.currentApplicationId;
  return id ? state.applicationForm.drafts[id] : null;
};
export const selectFormData = createSelector(
  (state) => state.applicationForm.currentApplicationId,
  (state) => state.applicationForm.drafts,
  (currentApplicationId, drafts) => {
    if (!currentApplicationId) return {};
    return drafts[currentApplicationId]?.formData || {};
  },
);
export const selectCurrentStep = (state) => state.applicationForm.currentStep;
export const selectCurrentMode = (state) => state.applicationForm.currentMode;
export const selectHasUnsavedChanges = (state) =>
  state.applicationForm.hasUnsavedChanges;

export default applicationFormSlice.reducer;