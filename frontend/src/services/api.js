// import axios from "axios";

// const api = axios.create({
//   baseURL: "http://localhost:5000/api",
//   withCredentials: true,
// });

// api.interceptors.request.use(
//   (config) => {
//     const raw = localStorage.getItem("user");
//     const user = raw ? JSON.parse(raw) : null;

//     if (user?.token) {
//       config.headers = config.headers || {};
//       config.headers.Authorization = `Bearer ${user.token}`;
//     }

//     // ✅ If FormData, don't force header
//     if (config.data instanceof FormData) {
//       if (config.headers?.["Content-Type"]) delete config.headers["Content-Type"];
//       if (config.headers?.["content-type"]) delete config.headers["content-type"];
//     }

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// export default api;

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    // try common storage keys
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("auth") ||
      localStorage.getItem("currentUser");

    const obj = raw ? JSON.parse(raw) : null;

    // token could be token/accessToken
    const token = obj?.token || obj?.accessToken;

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // if FormData, let browser set content-type
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
