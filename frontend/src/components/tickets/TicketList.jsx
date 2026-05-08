const STATUS_LABEL = {
  ABERTO: "Aberto",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const STATUS_COLOR = {
  ABERTO: "bg-amber-100 text-amber-800",
  EM_ATENDIMENTO: "bg-blue-100 text-blue-800",
  CONCLUIDO: "bg-emerald-100 text-emerald-800",
  CANCELADO: "bg-slate-200 text-slate-700",
};

const PRIORITY_COLOR = {
  BAIXA: "bg-slate-100 text-slate-700",
  MEDIA: "bg-yellow-100 text-yellow-800",
  ALTA: "bg-orange-100 text-orange-800",
  CRITICA: "bg-red-100 text-red-800",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

export default function TicketList({ tickets, onStatusChange, isStaff }) {
  if (!tickets.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-500">
        Nenhum chamado encontrado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white border border-slate-200 rounded-md">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-2 text-left">#</th>
            <th className="px-4 py-2 text-left">Título</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Prioridade</th>
            <th className="px-4 py-2 text-left">Aberto em</th>
            <th className="px-4 py-2 text-left">Fechado em</th>
            {isStaff && <th className="px-4 py-2 text-left">Ações</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tickets.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 text-slate-700 font-mono">#{t.id}</td>
              <td className="px-4 py-2 text-slate-800">{t.title}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </span>
              </td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLOR[t.priority]}`}>
                  {t.priority}
                </span>
              </td>
              <td className="px-4 py-2 text-slate-600">{formatDate(t.opened_at)}</td>
              <td className="px-4 py-2 text-slate-600">{formatDate(t.closed_at)}</td>
              {isStaff && (
                <td className="px-4 py-2">
                  <select
                    value={t.status}
                    onChange={(e) => onStatusChange(t.id, e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 text-xs"
                  >
                    {Object.keys(STATUS_LABEL).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
