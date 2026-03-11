import { createSlice, createSelector } from "@reduxjs/toolkit";
// import { v4 as uuidv4 } from "uuid";

// --- HELPER FUNCTION TO UPDATE NESTED FIELDS IN AN IMMUTABLE WAY ---
export const setIn = (obj, path, value) => {
  if (!path || typeof path !== "string") {
    throw new Error("Invalid path: " + path);
  }

  const keys = path.split(".").filter(Boolean); // remove empty segments
  if (keys.length === 0) throw new Error("Path cannot be empty");

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
    startNewApplication: (state) => {
      state.currentApplicationId = null; // backend will create ID
      state.currentMode = "edit";
      state.currentStep = 0;
      state.hasUnsavedChanges = false;

      state.drafts = {};
    },
    // Start brand new application
    // startNewApplication: (state) => {
    //   // const id = "new";

    //   const hasSubmitted = Object.values(state.drafts).some(
    //     (d) => d.status === "Submitted",
    //   );
    //   if (hasSubmitted) {
    //     console.warn("User already has a submitted application.");
    //     return; // do not create new draft
    //   }

    //   // const id = uuidv4(); // unique ID per draft, else will create one draft one submission
    //   // state.currentApplicationId = id;
    //   state.currentMode = "edit";
    //   state.currentStep = 0;
    //   state.hasUnsavedChanges = false;

    //   // Reset all previous drafts
    //   state.drafts = {};

    //   if (!state.drafts[id]) {
    //     state.drafts[id] = {
    //       formData: {},
    //       status: "Draft",
    //       lastModified: new Date().toISOString(),
    //     };
    //   }
    // },
    resetForm: (state) => {
      state.drafts = {};
      state.currentApplicationId = null;
      state.currentStep = 0;
      state.currentMode = "edit";
      state.hasUnsavedChanges = false;
    },
    updateField: (state, action) => {
      const { field, value } = action.payload;
      const appId = state.currentApplicationId;
      if (!appId || !field) return;

      if (!state.drafts[appId]) {
        state.drafts[appId] = {
          formData: {},
          status: "Draft",
          lastModified: new Date().toISOString(),
        };
      }

      try {
        setIn(state.drafts[appId].formData, field, value);
      } catch (err) {
        console.error("updateField failed:", field, value, err);
        return;
      }

      state.drafts[appId].lastModified = new Date().toISOString();
      state.hasUnsavedChanges = true;
    },

    // applicationFormSlice.js
    // updateField: (state, action) => {
    //   const { field, value } = action.payload;
    //   const keys = field.split("."); // split nested path
    //   let curr = state.formData;

    //   for (let i = 0; i < keys.length - 1; i++) {
    //     const key = keys[i];
    //     if (!(key in curr)) curr[key] = {}; // create nested object if missing
    //     curr = curr[key];
    //   }

    //   curr[keys[keys.length - 1]] = value; // set the final value
    // },

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

      // Remove any other drafts so only the submitted one remains
      Object.keys(state.drafts).forEach((id) => {
        if (id !== appId) delete state.drafts[id];
      });

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
  resetForm,
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
      // 1: !!formData.basicFields,
      // 2: !!formData.financialFields,
      // 3: !!formData.complianceFields,
      1: !!formData.step1_basic_info, // check actual step keys
      2: !!formData.step2_financial,
      3: !!formData.step3_compliance,
    };
  },
);

export default applicationFormSlice.reducer;
