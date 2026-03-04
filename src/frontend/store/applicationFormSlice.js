import { createSlice } from "@reduxjs/toolkit";

/**
 * Redux slice for managing SME application form state.
 * Handles:
 * - Draft form data persistence
 * - Application submission status
 * - Current step tracking
 * - Form mode (edit/view)
 */

const initialState = {
  // draft data keyed by applicationId (or 'new' for new applications)
  drafts: {}, // { [applicationId]: { formData, status, lastModified, appliedAt } }

  // current active application/draft being edited
  currentApplicationId: null,
  currentMode: "edit", // "edit" | "view"
  currentStep: 0,

  // unsaved changes tracking
  hasUnsavedChanges: false,
};

const applicationFormSlice = createSlice({
  name: "applicationForm",
  initialState,
  reducers: {
    // Initialize or load an application
    loadApplication: (state, action) => {
      const { applicationId, formData, status, lastModified } = action.payload;
      state.currentApplicationId = applicationId;
      state.currentMode = status === "Submitted" ? "view" : "edit";
      state.currentStep = 0;
      state.hasUnsavedChanges = false;

      if (!state.drafts[applicationId]) {
        state.drafts[applicationId] = {
          formData: formData || {},
          status: status || "Draft",
          lastModified: lastModified || new Date().toISOString(),
        };
      }
    },

    // Start a new application
    startNewApplication: (state) => {
      state.currentApplicationId = "new";
      state.currentMode = "edit";
      state.currentStep = 0;
      state.hasUnsavedChanges = false;

      if (!state.drafts["new"]) {
        state.drafts["new"] = {
          formData: {},
          status: "Draft",
          lastModified: new Date().toISOString(),
        };
      }
    },

    // Update form data for current application
    updateFormData: (state, action) => {
      const appId = state.currentApplicationId;
      if (appId && state.drafts[appId]) {
        state.drafts[appId].formData = {
          ...state.drafts[appId].formData,
          ...action.payload,
        };
        state.drafts[appId].lastModified = new Date().toISOString();
        state.hasUnsavedChanges = true;
      }
    },

    // Save draft
    saveDraft: (state, action) => {
      const appId = state.currentApplicationId;
      if (appId && state.drafts[appId]) {
        state.drafts[appId].lastModified = new Date().toISOString();
        state.drafts[appId].status = "Draft";
        state.hasUnsavedChanges = false;
      }
    },

    // Mark application as submitted
    markAsSubmitted: (state, action) => {
      const { applicationId, serverApplicationId } = action.payload;
      const appId = applicationId || state.currentApplicationId;

      if (appId && state.drafts[appId]) {
        state.drafts[appId].status = "Submitted";
        state.drafts[appId].submittedAt = new Date().toISOString();
        state.drafts[appId].serverApplicationId = serverApplicationId;
        state.currentMode = "view";
        state.hasUnsavedChanges = false;
      }
    },

    // Update current step
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },

    // Set mode (edit/view)
    setMode: (state, action) => {
      state.currentMode = action.payload; // "edit" | "view"
    },

    // Clear current application (on logout or reset)
    clearApplication: (state) => {
      state.currentApplicationId = null;
      state.currentMode = "edit";
      state.currentStep = 0;
      state.hasUnsavedChanges = false;
    },

    // Delete a draft
    deleteDraft: (state, action) => {
      const appId = action.payload;
      delete state.drafts[appId];
      if (state.currentApplicationId === appId) {
        state.currentApplicationId = null;
      }
    },
  },
});

export const {
  loadApplication,
  startNewApplication,
  updateFormData,
  saveDraft,
  markAsSubmitted,
  setCurrentStep,
  setMode,
  clearApplication,
  deleteDraft,
} = applicationFormSlice.actions;

// Selectors
export const selectApplicationForm = (state) => state.applicationForm;
export const selectCurrentApplicationId = (state) =>
  state.applicationForm.currentApplicationId;
export const selectCurrentApplication = (state) => {
  const appId = state.applicationForm.currentApplicationId;
  return appId ? state.applicationForm.drafts[appId] : null;
};
export const selectCurrentMode = (state) => state.applicationForm.currentMode;
export const selectCurrentStep = (state) => state.applicationForm.currentStep;
export const selectAllDrafts = (state) => state.applicationForm.drafts;
export const selectHasUnsavedChanges = (state) =>
  state.applicationForm.hasUnsavedChanges;

export default applicationFormSlice.reducer;
