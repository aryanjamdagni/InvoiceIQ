import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const navItems = [
    { path: "/", label: "Create", icon: "spark" },
    { path: "/history", label: "Runs", icon: "list" },
    { path: "/cost-analysis", label: "Usage", icon: "meter" },
  ];

  const Icon = ({ type }) => {
    if (type === "list")
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    if (type === "meter")
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M21 13a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
          <path d="M15.5 9.5 12 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M12 3l2.4 5 5.6.6-4.2 3.8 1.3 5.6L12 15.9 6.9 18.6l1.3-5.6L4 8.6 9.6 8 12 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <aside className="af-sidebar">
      <div className="af-brand">
        <div className="min-w-0">
          <div className="font-black tracking-wide truncate af-gradientText">InvoiceIQ</div>
          <div className="text-[12px] text-[var(--af-muted)] font-semibold truncate">
            Document Processing Console
          </div>
        </div>
      </div>

      <nav className="mt-1 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              ["af-navItem", isActive ? "af-navActive" : ""].join(" ")
            }
          >
            <span className="af-navIcon">
              <Icon type={item.icon} />
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-3 rounded-[var(--af-radius-lg)] border border-dashed border-[color:rgba(15,23,42,.18)] text-[12px] text-[var(--af-muted)]">
        Built for internal workflows • v2 UI refresh
      </div>
    </aside>
  );
}
