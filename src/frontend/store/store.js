import { configureStore, combineReducers } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import smeReducer from "./smeFormConfigSlice";
import applicationFormReducer from "./applicationFormSlice";

import storage from "redux-persist/lib/storage"; 
import { persistReducer, persistStore } from "redux-persist";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "smeFormConfig", "applicationForm"], 
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
      serializableCheck: false, 
    }),
});

export const persistor = persistStore(store);
