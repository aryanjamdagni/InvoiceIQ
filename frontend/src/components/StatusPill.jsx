import { useMemo } from "react";

export default function StatusPill({ text }) {
  const t = (text || "").toLowerCase();

  const type = useMemo(() => {
    if (t.includes("completed")) return "done";
    if (t.includes("failed") || t.includes("error") || t.includes("skipped"))
      return "fail";
    if (t.includes("pending")) return "idle";
    return "work";
  }, [t]);

  const styles = {
    done: "bg-green-500/10 text-green-300 border-green-500/20",
    work: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20 animate-pulse",
    idle: "bg-slate-700/20 text-slate-300 border-slate-600/30",
    fail: "bg-red-500/10 text-red-300 border-red-500/20",
  };

  const label = useMemo(() => {
    if (!text) return "Pending";
    if (t.includes("completed")) return "Completed";
    if (t.includes("processing")) return "Processing";
    if (t.includes("pending")) return "Pending";
    if (t.includes("failed") || t.includes("error") || t.includes("skipped"))
      return "Failed";
    return text;
  }, [text, t]);

  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[type]}`}
      title={text}
    >
      {label}
    </span>
  );
}
