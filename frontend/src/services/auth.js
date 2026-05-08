import { api } from "./api";

export async function login(email, password) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const { data } = await api.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data.user;
}

export async function register(payload) {
  const { data } = await api.post("/auth/register", payload);
  return data;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
}

export function getStoredUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export async function fetchMe() {
  const { data } = await api.get("/auth/me");
  localStorage.setItem("user", JSON.stringify(data));
  return data;
}
