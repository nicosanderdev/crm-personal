import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.tsx";

const links = [
  { to: "/", label: "Queue", end: true },
  { to: "/dates", label: "Dates", end: true },
  { to: "/people", label: "People", end: false },
  { to: "/import", label: "Import", end: true },
];

export function Layout() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="flex items-center justify-between border-b border-line bg-ink px-5 py-4 text-paper lg:flex-col lg:items-stretch lg:justify-start lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
        <div>
          <p className="font-serif text-2xl tracking-tight">Circle</p>
          <p className="mt-1 hidden text-xs text-paper-2 lg:block">Keep in touch</p>
        </div>
        <nav className="flex gap-4 text-sm lg:mt-10 lg:flex-col lg:gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-md px-2 py-1.5 ${isActive ? "bg-white/10 text-white" : "text-paper-2 hover:text-white"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden lg:mt-auto lg:block">
          <p className="truncate text-xs text-paper-2">{me?.email}</p>
          <button
            type="button"
            className="mt-2 text-sm text-paper-2 underline-offset-2 hover:text-white hover:underline"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-6 py-8 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
}
