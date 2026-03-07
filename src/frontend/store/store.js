import { configureStore, combineReducers } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import smeReducer from "./smeFormConfigSlice";
import applicationFormReducer from "./applicationFormSlice";

import storage from "redux-persist/lib/storage"; // localStorage
import { persistReducer, persistStore } from "redux-persist";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "smeFormConfig", "applicationForm"], // persist these slices
};

const rootReducer = combineReducers({
  auth: authReducer,
  smeFormConfig: smeReducer,
  applicationForm: applicationFormReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // needed for redux-persist
    }),
});

export const persistor = persistStore(store);
