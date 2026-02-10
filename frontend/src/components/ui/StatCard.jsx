import React from "react";

export default function StatCard({ label, value, sub, right, className = "" }) {
  return (
    <div
      className={[
        "rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl",
        "shadow-[0_20px_60px_rgba(15,23,42,0.10)]",
        "p-6",
        className,
      ].join(" ")}
    >
      <div className="text-xs font-extrabold tracking-[0.28em] text-slate-500 uppercase">
        {label}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="text-5xl font-black text-slate-900 leading-none">
          {value}
        </div>

        {right ? <div className="pb-1">{right}</div> : null}
      </div>

      {sub ? (
        <div className="mt-3 text-xs font-semibold text-slate-500">
          {sub}
        </div>
      ) : null}
    </div>
  );
}
