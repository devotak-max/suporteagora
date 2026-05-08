import { useEffect, useState } from "react";
import { getMonthlyReport } from "../services/reports";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatHours(hours) {
  if (hours === null || hours === undefined) return "—";
  return `${hours.toFixed(2)} h`;
}

function formatMinutes(min) {
  if (min === null || min === undefined) return "—";
  return `${min.toFixed(1)} min`;
}

export default function Reports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getMonthlyReport(year, month)
      .then((data) => active && setReport(data))
      .catch((err) =>
        active && setError(err.response?.data?.detail || "Erro ao gerar relatório")
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [year, month]);

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) years.push(y);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Relatórios Mensais</h2>
        <p className="text-slate-500 text-sm">
          Indicadores de performance: volume de chamados e tempo médio de resolução.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">Mês</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-slate-300 rounded px-3 py-2 text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Ano</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-slate-300 rounded px-3 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
          {error}
        </div>
      )}

      {loading && <div className="text-slate-500 text-sm">Carregando...</div>}

      {report && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Tickets abertos"
            value={report.tickets_opened}
            hint={`${MONTHS[month - 1]}/${year}`}
            color="bg-amber-50 text-amber-800 border-amber-200"
          />
          <KpiCard
            label="Tickets concluídos"
            value={report.tickets_closed}
            hint={`${MONTHS[month - 1]}/${year}`}
            color="bg-emerald-50 text-emerald-800 border-emerald-200"
          />
          <KpiCard
            label="Tempo médio (horas)"
            value={formatHours(report.avg_resolution_hours)}
            hint="MTTR"
            color="bg-blue-50 text-blue-800 border-blue-200"
          />
          <KpiCard
            label="Tempo médio (minutos)"
            value={formatMinutes(report.avg_resolution_minutes)}
            hint="MTTR"
            color="bg-indigo-50 text-indigo-800 border-indigo-200"
          />
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, hint, color }) {
  return (
    <div className={`border rounded-md p-5 ${color}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
      {hint && <div className="text-xs mt-1 opacity-70">{hint}</div>}
    </div>
  );
}
