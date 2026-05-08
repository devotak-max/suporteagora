import { useEffect, useState } from "react";
import { createTicket } from "../../services/tickets";
import { listAssets } from "../../services/assets";

const initialState = {
  title: "",
  description: "",
  priority: "MEDIA",
  category: "",
  asset_id: "",
};

export default function NewTicketModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(initialState);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialState);
    setError(null);
    listAssets().then(setAssets).catch(() => setAssets([]));
  }, [open]);

  if (!open) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        category: form.category || null,
        asset_id: form.asset_id ? Number(form.asset_id) : null,
      };
      const ticket = await createTicket(payload);
      onCreated?.(ticket);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao criar chamado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Novo Chamado</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input
              type="text"
              required
              minLength={3}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
              <select
                value={form.priority}
                onChange={(e) => update("priority", e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ativo (CMDB)</label>
            <select
              value={form.asset_id}
              onChange={(e) => update("asset_id", e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            >
              <option value="">— Nenhum —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.ip_address ? `(${a.ip_address})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-slate-800 text-white text-sm hover:bg-slate-900 disabled:opacity-50"
            >
              {submitting ? "Criando..." : "Abrir Chamado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
