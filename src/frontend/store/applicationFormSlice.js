import { createSlice, createSelector } from "@reduxjs/toolkit";

// --- HELPER FUNCTION TO UPDATE NESTED FIELDS IN AN IMMUTABLE WAY ---
export const setIn = (obj, path, value) => {
  const keys = path.split(".");
  const lastKey = keys.pop();
  let ref = obj;

  keys.forEach((key) => {
    if (!ref[key] || typeof ref[key] !== "object") ref[key] = {};
    ref = ref[key];
  });

  ref[lastKey] = value;
};

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
    // updateField: (state, action) => {
    //   const { field, value } = action.payload;
    //   if (!field) return;

    //   const keys = field.split(".");
    //   const lastKey = keys.pop();

    //   let newFormData = { ...state.formData }; // shallow copy
    //   let ref = newFormData;

    //   keys.forEach((key) => {
    //     ref[key] = ref[key] ? { ...ref[key] } : {};
    //     ref = ref[key];
    //   });

    //   ref[lastKey] = value; // set the final key
    //   state.formData = newFormData; // replace state with new object
    // },
    // updateField: (state, action) => {
    //   const { field, value } = action.payload;
    //   state.formData = {
    //     ...state.formData,
    //     [field]: value,
    //   };
    //     console.log("Redux formData updated:", state.formData);

    // },

    updateField: (state, action) => {
      const { field, value } = action.payload;
      const appId = state.currentApplicationId;
      if (!appId) return;

      if (!state.drafts[appId]) {
        state.drafts[appId] = {
          formData: {},
          status: "Draft",
          lastModified: new Date().toISOString(),
        };
      }

      // safely update nested paths
      setIn(state.drafts[appId].formData, field, value);
      state.drafts[appId].lastModified = new Date().toISOString();
      state.hasUnsavedChanges = true;

      console.log("Redux formData updated:", state.drafts[appId].formData);
    },

    // Bulk update (useful when loading multiple fields)
    updateFormData: (state, action) => {
      const appId = state.currentApplicationId;
      if (!appId) return;

      if (!state.drafts[appId]) {
        state.drafts[appId] = {
          formData: {},
          status: "Draft",
          lastModified: new Date().toISOString(),
        };
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
      if (state.currentApplicationId === appId)
        state.currentApplicationId = null;
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

// Add at the bottom with other selectors
export const selectStepCompletion = createSelector(
  selectFormData,
  (formData) => {
    // Example: mark step complete if fields exist
    return {
      0: !!formData.country && !!formData.businessType,
      1: !!formData.basicFields,
      2: !!formData.financialFields,
      3: !!formData.complianceFields,
    };
  },
);

export default applicationFormSlice.reducer;
