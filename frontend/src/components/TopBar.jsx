import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function Avatar({ name = "User" }) {
  const initial = (name?.[0] || "U").toUpperCase();
  return (
    <div className="h-9 w-9 rounded-xl bg-slate-100 border border-[var(--af-line)] grid place-items-center">
      <span className="text-sm font-black text-slate-700">{initial}</span>
    </div>
  );
}

export default function TopBar({ title = "", subtitle = "" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const username = user?.username || user?.name || "User";

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="af-topbar">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[18px] font-black truncate af-gradientText">{title}</div>
          {subtitle ? (
            <div className="text-[13px] text-[var(--af-muted)] font-semibold truncate">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 rounded-[var(--af-radius-lg)] border border-[var(--af-line)] bg-[var(--af-panel)] px-3 py-2 hover:-translate-y-[1px] hover:shadow-[var(--af-shadow-card)] transition"
          >
            <Avatar name={username} />
            <div className="text-left leading-tight hidden sm:block">
              <div className="text-sm font-black text-[var(--af-text)]">{username}</div>
              <div className="text-xs text-[var(--af-muted)]">{user?.email || ""}</div>
            </div>
            <svg
              className={`w-4 h-4 text-[var(--af-muted)] transition ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-3 w-56 rounded-[var(--af-radius-xl)] border border-[var(--af-line)] bg-[var(--af-panel)] shadow-[var(--af-shadow-soft)] overflow-hidden">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black hover:bg-rose-50 transition text-rose-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
