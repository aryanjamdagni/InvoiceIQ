import React from "react";

export default function GlassCard({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl",
        "shadow-[0_20px_60px_rgba(15,23,42,0.10)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
