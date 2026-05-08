import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { listTickets, updateTicket } from "../services/tickets";
import TicketList from "../components/tickets/TicketList";
import NewTicketModal from "../components/tickets/NewTicketModal";

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "ABERTO", label: "Abertos" },
  { value: "EM_ATENDIMENTO", label: "Em atendimento" },
  { value: "CONCLUIDO", label: "Concluídos" },
];

export default function Dashboard() {
  const { user, isStaff, isClient } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const data = await listTickets(params);
      setTickets(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao carregar chamados");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(id, status) {
    try {
      const updated = await updateTicket(id, { status });
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao atualizar status");
    }
  }

  const stats = {
    total: tickets.length,
    abertos: tickets.filter((t) => t.status === "ABERTO").length,
    emAtendimento: tickets.filter((t) => t.status === "EM_ATENDIMENTO").length,
    concluidos: tickets.filter((t) => t.status === "CONCLUIDO").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isClient ? "Meus Chamados" : "Painel de Atendimento"}
          </h2>
          <p className="text-slate-500 text-sm">
            Olá, {user?.full_name}. {isClient ? "Acompanhe seus tickets abaixo." : "Visão global de chamados."}
          </p>
        </div>
        {isClient && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            + Novo Chamado
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} color="bg-slate-100 text-slate-800" />
        <StatCard label="Abertos" value={stats.abertos} color="bg-amber-100 text-amber-800" />
        <StatCard label="Em atendimento" value={stats.emAtendimento} color="bg-blue-100 text-blue-800" />
        <StatCard label="Concluídos" value={stats.concluidos} color="bg-emerald-100 text-emerald-800" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded text-sm border ${
              statusFilter === f.value
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">Carregando...</div>
      ) : (
        <TicketList tickets={tickets} onStatusChange={handleStatusChange} isStaff={isStaff} />
      )}

      <NewTicketModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={(ticket) => setTickets((prev) => [ticket, ...prev])}
      />
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className={`mt-1 inline-block px-2 py-0.5 rounded text-2xl font-bold ${color}`}>
        {value}
      </div>
    </div>
  );
}
