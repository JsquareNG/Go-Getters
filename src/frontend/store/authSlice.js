import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,      // { user_id, email, first_name, last_name, role }
//   token: null,     // if you use JWT
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
    //   state.token = action.payload.token || null;
      state.isLoggedIn = true;
    },
    logout: (state) => {
      state.user = null;
    //   state.token = null;
      state.isLoggedIn = false;
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
