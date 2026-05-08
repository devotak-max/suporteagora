import { api } from "./api";

export async function listTickets(params = {}) {
  const { data } = await api.get("/tickets", { params });
  return data;
}

export async function createTicket(payload) {
  const { data } = await api.post("/tickets", payload);
  return data;
}

export async function updateTicket(id, payload) {
  const { data } = await api.patch(`/tickets/${id}`, payload);
  return data;
}

export async function getTicket(id) {
  const { data } = await api.get(`/tickets/${id}`);
  return data;
}
