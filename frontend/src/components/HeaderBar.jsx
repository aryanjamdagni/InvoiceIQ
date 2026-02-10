import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/ThemeContext";

function UserAvatar({ className = "" }) {
  return (
    <div className={`grid place-items-center rounded-full ${className}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 21a8 8 0 10-16 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M12 13a5 5 0 100-10 5 5 0 000 10z"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

export default function HeaderBar({ title, subtitle, rightSlot = null }) {
  const { user, logout } = useAuth();
  const { isDark, setTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);

  const username =
    user?.username || user?.name || user?.email?.split("@")?.[0] || "User";

  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    setPos({
      top: r.bottom,
      left: r.left,
      width: r.width, // Matches the button width exactly
    });
  };

  useEffect(() => {
    if (!open) return;

    updatePos();

    const onResize = () => updatePos();
    const onScroll = () => updatePos();
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onClickOutside = (e) => {
      const btn = btnRef.current;
      const dd = dropdownRef.current;
      if (btn && btn.contains(e.target)) return;
      if (dd && dd.contains(e.target)) return;
      setOpen(false);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onClickOutside);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  const dropdown = useMemo(() => {
    if (!open) return null;

    return createPortal(
      <>
        {/* Background overlay to catch clicks */}
        <div
          className="fixed inset-0 z-99998"
          onMouseDown={() => setOpen(false)}
        />

        <div
          ref={dropdownRef}
          className="
            fixed z-99999
            overflow-hidden
            bg-(--card) border border-(--border)
            shadow-xl
            rounded-b-2xl rounded-t-none
            border-t-0
          "
          style={{ 
            top: pos.top, 
            left: pos.left, 
            width: pos.width,
            marginTop: '-1px' // Overlaps the button border to look like one piece
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-2">
            <button
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-(--card2) transition text-[12px] font-black text-(--text)"
              onClick={() => {
                setTheme(isDark ? "light" : "dark");
                setOpen(false);
              }}
              type="button"
            >
              {isDark ? "Light mode" : "Dark mode"}
            </button>

            <button
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-(--card2) transition text-[12px] font-black text-red-400"
              onClick={() => {
                logout();
                setOpen(false);
              }}
              type="button"
            >
              Sign out
            </button>
          </div>
        </div>
      </>,
      document.body
    );
  }, [open, pos, isDark, logout, setTheme]);

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-[22px] font-black tracking-tight text-(--text)">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-[11px] font-black tracking-[0.22em] uppercase text-(--muted) mt-1">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        {rightSlot}

        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`
            flex items-center gap-3
            px-4 py-3
            bg-(--card) border border-(--border)
            hover:bg-(--card2) transition relative z-99999
            ${open ? "rounded-t-2xl rounded-b-none border-b-transparent" : "rounded-2xl"}
          `}
        >
          <UserAvatar className="w-9 h-9 text-(--text)" />

          <div className="text-left leading-tight min-w-0">
            <div className="text-[12px] font-black text-(--text) truncate max-w-35">
              {username}
            </div>
            <div className="text-[10px] font-bold text-(--muted) truncate max-w-35">
              {user?.email || ""}
            </div>
          </div>

          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {dropdown}
      </div>
    </div>
  );
}