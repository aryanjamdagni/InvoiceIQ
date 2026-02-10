import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

const bytesToKB = (b) => {
  const kb = b / 1024;
  return `${kb.toFixed(1)} KB`;
};

const StatusPill = ({ status }) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("completed")) {
    return (
      <span className="af-chip af-chipOk">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Completed
      </span>
    );
  }
  if (s.includes("failed") || s.includes("error") || s.includes("skipped")) {
    return (
      <span className="af-chip af-chipFail">
        <span className="h-2 w-2 rounded-full bg-rose-500" />
        Failed
      </span>
    );
  }
  return (
    <span className="af-chip af-chipWarn">
      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
      Processing
    </span>
  );
};

export default function Home() {
  const fileInputRef = useRef(null);

  // prevents infinite download loops
  const hasAttemptedDownload = useRef(false);

  const [selected, setSelected] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [pollData, setPollData] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);

  // ✅ tick forces timer UI update every second while running
  const [tick, setTick] = useState(0);

  const totalCount = useMemo(
    () => selected.length || pollData?.total_count || 0,
    [selected, pollData]
  );

  const completedCount = useMemo(() => {
    const c = pollData?.completed_count;
    if (typeof c === "number") return c;

    return Object.values(statusMap).filter((s) =>
      String(s).toLowerCase().includes("completed")
    ).length;
  }, [pollData, statusMap]);

  const progress = useMemo(() => {
    const total = totalCount || 0;
    if (!total) return 0;
    return Math.min(100, Math.round((completedCount / total) * 100));
  }, [completedCount, totalCount]);

  // only auto-download when backend confirms download_url exists
  const downloadReady = useMemo(() => !!pollData?.download_url, [pollData]);

  // ✅ determine if timer should run
  const isRunning = useMemo(() => {
    if (!sessionId || !startedAt) return false;
    if (endedAt) return false;
    // stop timer once extraction is fully done & download is ready
    if (progress === 100 && downloadReady) return false;
    return true;
  }, [sessionId, startedAt, endedAt, progress, downloadReady]);

  // ✅ interval that updates `tick` every second while running
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const onPickFiles = (files) => {
    const arr = Array.from(files || []).slice(0, 10);
    setSelected(arr);
    setSessionId(null);
    setStatusMap({});
    setPollData(null);
    setStartedAt(null);
    setEndedAt(null);
    setTick(0);
    hasAttemptedDownload.current = false;
  };

  const clearAll = () => {
    setSelected([]);
    setSessionId(null);
    setStatusMap({});
    setPollData(null);
    setStartedAt(null);
    setEndedAt(null);
    setTick(0);
    hasAttemptedDownload.current = false;
  };

  const removeOne = (name) => {
    setSelected((prev) => prev.filter((f) => f.name !== name));
    setStatusMap((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  // download (with retry)
  const triggerDownload = async (sid) => {
    const maxTries = 10;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        const response = await api.get(`/invoices/session/${sid}/download`, {
          responseType: "blob",
        });

        const blob = new Blob([response.data], {
          type:
            response.headers?.["content-type"] ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `Extraction_Results_${String(sid).slice(-6)}.xlsx`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        return true;
      } catch (error) {
        const status = error?.response?.status;
        if (status === 404 && attempt < maxTries) {
          await wait(1200);
          continue;
        }
        console.error("Auto-download failed:", error);
        return false;
      }
    }
    return false;
  };

  const startExtraction = async () => {
    if (!selected.length) return;

    try {
      setUploading(true);
      hasAttemptedDownload.current = false;

      const form = new FormData();
      selected.forEach((f) => form.append("files", f));

      const res = await api.post("/invoices/upload", form);

      const sid = res.data?.sessionId || res.data?.session_id || null;
      setSessionId(sid);

      // ✅ start timer
      setStartedAt(Date.now());
      setEndedAt(null);
      setTick(0);

      const init = {};
      selected.forEach((f) => (init[f.name] = "processing"));
      setStatusMap(init);
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  };

  // polling
  useEffect(() => {
    if (!sessionId) return;
    let alive = true;

    const poll = async () => {
      try {
        const res = await api.get(`/invoices/session/${sessionId}/status`);
        if (!alive) return;

        const data = res.data || {};
        setPollData(data);

        const files = data?.files || {};
        setStatusMap((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((name) => {
            if (files[name]) next[name] = files[name];
          });
          return next;
        });
      } catch (e) {
        console.error("Polling error", e);
      }
    };

    poll();
    const t = setInterval(poll, 1500);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [sessionId]);

  // auto-download
  useEffect(() => {
    if (!sessionId) return;

    if (progress === 100 && downloadReady && !hasAttemptedDownload.current) {
      hasAttemptedDownload.current = true;
      (async () => {
        const ok = await triggerDownload(sessionId);
        if (ok) setEndedAt(Date.now());
      })();
    }
  }, [progress, downloadReady, sessionId]);

  const queueRows = useMemo(() => {
    return selected.map((f) => ({
      name: f.name,
      size: f.size,
      status: statusMap[f.name] || "pending",
    }));
  }, [selected, statusMap]);

  const hasQueue = selected.length > 0;

  // ✅ elapsed now updates every second due to `tick`
  const elapsed = useMemo(() => {
    if (!startedAt) return null;
    const end = endedAt || Date.now();
    const sec = Math.max(0, Math.round((end - startedAt) / 1000));
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [startedAt, endedAt, tick]);

  const onDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    onPickFiles(files);
  };

  return (
    <div className="grid gap-5">
      <div className="af-card">
        <div className="af-cardBody relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "linear-gradient(120deg, rgba(109,40,217,.18), rgba(37,99,235,.14), rgba(6,182,212,.12), rgba(244,63,94,.10))",
            }}
          />
          <div
            className="absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-60"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(6,182,212,.55), transparent 60%)",
            }}
          />
          <div
            className="absolute -bottom-24 left-10 h-72 w-72 rounded-full blur-3xl opacity-60"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(109,40,217,.55), transparent 60%)",
            }}
          />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-[12px] font-extrabold text-[var(--af-muted)] tracking-[0.28em]">
                DOCUMENT WORKFLOW
              </div>
              <div className="mt-2 text-[26px] font-black leading-tight">
                Generate reports with{" "}
                <span className="af-gradientText">InvoiceIQ</span>
              </div>
              <div className="mt-2 text-[13px] text-[var(--af-muted)] font-semibold max-w-2xl">
                Upload PDFs, run extraction, and automatically download the
                generated output — with live progress tracking and session
                history.
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="rounded-[18px] border border-[var(--af-line)] bg-white/80 backdrop-blur px-4 py-3">
                <div className="text-[12px] font-extrabold text-[var(--af-muted)]">
                  Queue
                </div>
                <div className="mt-1 text-[20px] font-black">{totalCount}</div>
              </div>
              <div className="rounded-[18px] border border-[var(--af-line)] bg-white/80 backdrop-blur px-4 py-3">
                <div className="text-[12px] font-extrabold text-[var(--af-muted)]">
                  Completed
                </div>
                <div className="mt-1 text-[20px] font-black">
                  {completedCount}
                </div>
              </div>
              <div className="rounded-[18px] border border-[var(--af-line)] bg-white/80 backdrop-blur px-4 py-3">
                <div className="text-[12px] font-extrabold text-[var(--af-muted)]">
                  Elapsed
                </div>
                <div className="mt-1 text-[20px] font-black">
                  {elapsed || "00:00"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="af-card">
        <div className="af-cardHead">
          <div>
            <div className="af-h3">Upload invoices</div>
            <div className="af-hint">Drop PDFs here or choose up to 10 files</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="af-btn af-btnGhost"
            >
              Choose files
            </button>
            <button
              onClick={startExtraction}
              disabled={!hasQueue || uploading}
              className={`af-btn ${
                !hasQueue || uploading
                  ? "bg-slate-100 text-slate-400 border-[var(--af-line)] cursor-not-allowed"
                  : "af-btnPrimary"
              }`}
            >
              {uploading ? "Starting…" : "Start extraction"}
            </button>
          </div>
        </div>

        <div
          className="af-cardBody"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />

          <div className="grid gap-4">
            <div className="rounded-[var(--af-radius-xl)] border border-dashed border-[color:rgba(15,23,42,.18)] bg-[var(--af-panel-2)] p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-[15px] font-black">Drag & drop area</div>
                  <div className="text-[13px] text-[var(--af-muted)] font-semibold">
                    PDFs only • Max 10 files
                  </div>
                </div>
                <div className="text-[12px] text-[var(--af-muted)] font-semibold">
                  Session: {sessionId ? String(sessionId).slice(-8) : "—"}{" "}
                  {elapsed ? `• ${elapsed}` : ""}
                </div>
              </div>

              {hasQueue ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] text-[var(--af-muted)] font-bold">
                      Progress
                    </div>
                    <div className="text-[12px] text-[var(--af-muted)] font-bold">
                      {progress}%
                    </div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        background:
                          "linear-gradient(90deg, var(--af-primary), var(--af-primary-2))",
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Queue table */}
            <div className="af-card">
              <div className="af-cardHead">
                <div>
                  <div className="af-h3">Queue</div>
                  <div className="af-hint">Files selected for extraction</div>
                </div>
                <button
                  onClick={clearAll}
                  className="af-btn af-btnGhost"
                  disabled={!hasQueue}
                >
                  Clear
                </button>
              </div>
              <div className="af-cardBody p-0">
                <div className="overflow-x-auto thin-scroll">
                  <table className="af-table">
                    <thead>
                      <tr>
                        <th className="af-th">File</th>
                        <th className="af-th">Size</th>
                        <th className="af-th">Status</th>
                        <th className="af-th" />
                      </tr>
                    </thead>
                    <tbody>
                      {queueRows.length === 0 ? (
                        <tr>
                          <td className="af-td" colSpan={4}>
                            <div className="py-6 text-[13px] text-[var(--af-muted)] font-semibold">
                              No files selected.
                            </div>
                          </td>
                        </tr>
                      ) : (
                        queueRows.map((r) => (
                          <tr key={r.name} className="af-tr">
                            <td className="af-td">
                              <div className="font-semibold text-slate-900 max-w-[520px] truncate">
                                {r.name}
                              </div>
                            </td>
                            <td className="af-td text-[var(--af-muted)] font-semibold">
                              {bytesToKB(r.size)}
                            </td>
                            <td className="af-td">
                              <StatusPill status={r.status} />
                            </td>
                            <td className="af-td text-right">
                              <button
                                className="af-btn af-btnDanger px-3 py-2"
                                onClick={() => removeOne(r.name)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {progress === 100 && downloadReady ? (
              <div className="rounded-[var(--af-radius-xl)] border border-emerald-200 bg-emerald-50 p-4">
                <div className="font-black text-emerald-800">
                  Extraction complete
                </div>
                <div className="text-[13px] text-emerald-700 font-semibold mt-1">
                  Your Excel file should download automatically. If not, open
                  Runs to download it.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
