import { configureStore, createSlice } from "@reduxjs/toolkit";

const browserSlice = createSlice({
  name: "browser",
  initialState: {
    clickedButtons: true,
  },
  reducers: {
    clickBrowserButtons: (state, action) => {
      state["clickedButtons"] = true;
    },
    notClickBrowserButtons: (state, action) => {
      state["clickedButtons"] = false;
    },
  },
});

export const { clickBrowserButtons, notClickBrowserButtons } =
  browserSlice.actions;

const cacheSlice = createSlice({
  name: "cache",
  initialState: {},
  reducers: {
    cachePage: (state, action) => {
      const { path, key, data } = action.payload;
      if (!state[path]) {
        state[path] = {};
      }
      state[path][key] = data;
    },
    clearCache: (state, action) => {
      const { path } = action.payload;
      state[path] = {};
    },
    deleteEntireCache: (state) => {
      return {}; // Reset the entire cache state to an empty object
    },
  },
});

export const { cachePage, clearCache, deleteEntireCache } = cacheSlice.actions;

const store = configureStore({
  reducer: {
    browser: browserSlice.reducer,
    cache: cacheSlice.reducer,
  },
});

export default store;