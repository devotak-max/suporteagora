import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const linkBase =
  "px-3 py-2 rounded-md text-sm font-medium transition-colors";
const active = "bg-slate-900 text-white";
const inactive = "text-slate-300 hover:bg-slate-700 hover:text-white";

export default function AppLayout() {
  const { user, isStaff, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold">SuporteAgora ITSM</h1>
            <nav className="flex gap-2">
              <NavLink to="/" end className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
                Dashboard
              </NavLink>
              {isStaff && (
                <NavLink to="/reports" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
                  Relatórios
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-300">
              {user?.full_name} <span className="text-slate-400">·</span>{" "}
              <span className="uppercase text-xs">{user?.role}</span>
            </span>
            <button
              onClick={handleLogout}
              className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md text-sm"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
