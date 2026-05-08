import { api } from "./api";

export async function listAssets() {
  const { data } = await api.get("/assets");
  return data;
}
