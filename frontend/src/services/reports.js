import { api } from "./api";

export async function getMonthlyReport(year, month) {
  const { data } = await api.get("/reports/monthly", { params: { year, month } });
  return data;
}
