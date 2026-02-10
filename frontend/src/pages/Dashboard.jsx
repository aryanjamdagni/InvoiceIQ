import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

// -------- helpers ----------
const formatDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const secondsBetween = (a, b) => {
  if (!a || !b) return null;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
  return Math.max(0, Math.round((db.getTime() - da.getTime()) / 1000));
};

const StatusBadge = ({ status }) => {
  const s = String(status || "").toLowerCase();
  if (s === "completed") {
    return (
      <span className="af-chip af-chipOk">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Completed
      </span>
    );
  }
  if (s === "failed") {
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

// Download (token via axios interceptor)
async function downloadInvoiceExcel(invoiceId, fallbackName = "Report.xlsx") {
  const res = await api.get(`/invoices/${invoiceId}/download`, {
    responseType: "blob",
  });

  const blob = new Blob([res.data], {
    type:
      res.headers?.["content-type"] ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  let filename = fallbackName;
  const cd = res.headers?.["content-disposition"];
  if (cd && cd.includes("filename=")) {
    const match = cd.match(/filename="?([^"]+)"?/i);
    if (match?.[1]) filename = match[1];
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

async function deleteInvoiceRow(invoiceId) {
  const res = await api.delete(`/invoices/${invoiceId}`);
  return res.data;
}

async function fetchAllInvoicesSafely() {
  try {
    const r = await api.get("/invoices", { params: { page: 1, limit: 1000 } });
    const maybeList = Array.isArray(r.data) ? r.data : r.data?.invoices;
    if (Array.isArray(maybeList) && maybeList.length > 0) return maybeList;
  } catch (_) {}

  let all = [];
  let page = 1;
  const limit = 50;
  let guard = 0;

  while (guard < 100) {
    guard += 1;
    const res = await api.get("/invoices", { params: { page, limit } });
    const list = Array.isArray(res.data) ? res.data : res.data?.invoices || [];
    if (!Array.isArray(list) || list.length === 0) break;
    all = all.concat(list);
    if (list.length < limit) break;
    page += 1;
  }

  return all;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // close dropdown when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [openMenuId]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        const list = await fetchAllInvoicesSafely();
        if (!alive) return;
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAllInvoices(list);
      } catch (e) {
        console.error("Failed to load invoices", e);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = !q
      ? allInvoices
      : allInvoices.filter((inv) => {
          const f = (inv.fileName || "").toLowerCase();
          const id = (inv._id || "").toLowerCase();
          const sid = String(inv.sessionId || "").toLowerCase();
          return f.includes(q) || id.includes(q) || sid.includes(q);
        });

    const map = new Map();
    for (const inv of filtered) {
      const sid = inv.sessionId || "unknown";
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(inv);
    }

    const groups = Array.from(map.entries()).map(([sessionId, invoices]) => {
      invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const total = invoices.length;
      const completed = invoices.filter((x) => x.status === "completed").length;
      const failed = invoices.filter((x) => x.status === "failed").length;
      const processing = invoices.filter((x) => x.status === "processing").length;

      const when = invoices[0]?.createdAt;
      const type = total > 1 ? "Batch" : "Single";

      return {
        sessionId,
        type,
        createdAt: when,
        total,
        completed,
        failed,
        processing,
        invoices,
      };
    });

    groups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return groups;
  }, [allInvoices, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(grouped.length / itemsPerPage));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const currentGroups = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return grouped.slice(start, start + itemsPerPage);
  }, [grouped, page]);

  const kpis = useMemo(() => {
    const totalFiles = allInvoices.length;
    const inProgress = allInvoices.filter((x) => x.status === "processing").length;
    const done = allInvoices.filter((x) => x.status === "completed").length;
    const successRate = totalFiles ? Math.round((done / totalFiles) * 100) : 0;

    const durations = allInvoices
      .filter((x) => x.status !== "processing")
      .map((x) => secondsBetween(x.createdAt, x.updatedAt))
      .filter((n) => typeof n === "number");

    const avgTime =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    return { totalFiles, inProgress, successRate, avgTime };
  }, [allInvoices]);


  const runStats = useMemo(() => {
    const runs = grouped.length;
    const totalFiles = allInvoices.length;
    const completed = allInvoices.filter((x) => x.status === "completed").length;
    const failed = allInvoices.filter((x) => x.status === "failed").length;
    const avgFilesPerRun = runs ? Math.round(totalFiles / runs) : 0;
    const completion = totalFiles ? Math.round((completed / totalFiles) * 100) : 0;
    return { runs, completed, failed, avgFilesPerRun, completion };
  }, [grouped, allInvoices]);


  if (loading) {
    return (
      <div className="af-card">
        <div className="af-cardBody flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--af-line)] border-t-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full grid gap-5">
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[var(--af-radius-xl)] border border-[var(--af-line)] bg-[var(--af-panel)] shadow-[var(--af-shadow-soft)] p-6">
            <div className="text-lg font-black text-slate-900">Delete this entry?</div>
            <div className="text-sm text-[var(--af-muted)] font-semibold mt-2">
              This will permanently delete <span className="font-black text-slate-900">{deleteTarget.fileName}</span> from the run history.
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="af-btn af-btnGhost">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    await deleteInvoiceRow(deleteTarget._id);
                    setAllInvoices((prev) => prev.filter((x) => x._id !== deleteTarget._id));
                    setDeleteTarget(null);
                  } catch (e) {
                    console.error(e);
                    alert(e?.response?.data?.message || "Delete failed");
                  }
                }}
                className="af-btn af-btnDanger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[16px] font-black text-slate-900">Run ledger</div>
          <div className="text-[13px] text-[var(--af-muted)] font-semibold mt-1">
            Sessions are grouped by sessionId and contain one or more files.
          </div>
        </div>

        <button onClick={() => navigate("/")} className="af-btn af-btnPrimary">
          New extraction
        </button>
      </div>

      <div className="af-kpiGrid">
        <div className="af-kpiTile">
          <div className="af-kpiInner">
            <div className="af-kpiK">Total runs</div>
            <div className="af-kpiV">{runStats.runs}</div>
            <div className="mt-2 text-[12px] text-[var(--af-muted)] font-semibold">Session groups created</div>
          </div>
        </div>

        <div className="af-kpiTile">
          <div className="af-kpiInner">
            <div className="af-kpiK">Total files</div>
            <div className="af-kpiV">{kpis.totalFiles}</div>
            <div className="mt-2 text-[12px] text-[var(--af-muted)] font-semibold">Across all runs</div>
          </div>
        </div>

        <div className="af-kpiTile">
          <div className="af-kpiInner">
            <div className="af-kpiK">Completion</div>
            <div className="af-kpiV">{runStats.completion}%</div>
            <div className="mt-2 text-[12px] text-[var(--af-muted)] font-semibold">Completed vs total</div>
          </div>
        </div>

        <div className="af-kpiTile">
          <div className="af-kpiInner">
            <div className="af-kpiK">Avg time</div>
            <div className="af-kpiV">{kpis.avgTime}s</div>
            <div className="mt-2 text-[12px] text-[var(--af-muted)] font-semibold">Per finished file</div>
          </div>
        </div>

        <div className="af-kpiTile">
          <div className="af-kpiInner">
            <div className="af-kpiK">In progress</div>
            <div className="af-kpiV">{kpis.inProgress}</div>
            <div className="mt-2 text-[12px] text-[var(--af-muted)] font-semibold">Currently processing</div>
          </div>
        </div>

        <div className="af-kpiTile">
          <div className="af-kpiInner">
            <div className="af-kpiK">Avg files/run</div>
            <div className="af-kpiV">{runStats.avgFilesPerRun}</div>
            <div className="mt-2 text-[12px] text-[var(--af-muted)] font-semibold">Typical batch size</div>
          </div>
        </div>
      </div>

      <div className="af-card">
        <div className="af-cardHead">
          <div>
            <div className="af-h3">Extraction history</div>
            <div className="af-hint">Download or delete individual files</div>
          </div>
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search by file, invoice id, or session id"
            className="af-input max-w-md"
          />
        </div>

        <div className="af-cardBody grid gap-4">
          {currentGroups.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[var(--af-muted)] font-semibold">
              No history found.
            </div>
          ) : (
            currentGroups.map((g) => (
              <div key={g.sessionId} className="rounded-[var(--af-radius-xl)] border border-[var(--af-line)] bg-[var(--af-panel-2)] p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-black text-slate-900">{g.type} • {formatDateTime(g.createdAt)}</div>
                    <div className="text-[13px] text-[var(--af-muted)] font-semibold mt-1">
                      {g.total} file(s) • {g.completed} completed • {g.failed} failed • {g.processing} processing
                    </div>
                  </div>
                  <div className="text-[12px] text-[var(--af-muted)] font-black">
                    Session #{String(g.sessionId).slice(-6)}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-[16px] border border-[var(--af-line)] bg-white p-3">
                    <div className="text-[12px] font-extrabold text-[var(--af-muted)]">Completion</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-[18px] font-black">{g.total ? Math.round((g.completed / g.total) * 100) : 0}%</div>
                      <div className="h-2 w-28 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${g.total ? Math.round((g.completed / g.total) * 100) : 0}%`,
                            background:
                              "linear-gradient(90deg, var(--af-primary), var(--af-primary-2), var(--af-accent))",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-[var(--af-line)] bg-white p-3">
                    <div className="text-[12px] font-extrabold text-[var(--af-muted)]">Health</div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="af-chip af-chipOk">✔ {g.completed}</span>
                      <span className="af-chip af-chipFail">✖ {g.failed}</span>
                      <span className="af-chip af-chipWarn">⏳ {g.processing}</span>
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-[var(--af-line)] bg-white p-3">
                    <div className="text-[12px] font-extrabold text-[var(--af-muted)]">Session</div>
                    <div className="mt-2 text-[13px] font-black text-slate-900">#{String(g.sessionId).slice(-8)}</div>
                    <div className="mt-1 text-[12px] text-[var(--af-muted)] font-semibold">Type: {g.type}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-[var(--af-radius-xl)] border border-[var(--af-line)] bg-white overflow-visible">
                  <div className="grid grid-cols-12 gap-0 bg-slate-50 text-[12px] font-black tracking-wide text-[var(--af-muted)] px-4 py-3">
                    <div className="col-span-4">Input PDF</div>
                    <div className="col-span-4">Generated Excel</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {g.invoices.map((inv) => {
                    const excelName = inv.excelUrl?.split("/").pop() || inv.excelFileName || "-";
                    return (
                      <div key={inv._id} className="grid grid-cols-12 gap-0 px-4 py-4 border-t border-[var(--af-line)] items-center">
                        <div className="col-span-4 font-semibold text-slate-900 truncate pr-3">{inv.fileName}</div>
                        <div className="col-span-4 text-[13px] text-[var(--af-muted)] font-semibold truncate pr-3">{excelName}</div>
                        <div className="col-span-2"><StatusBadge status={inv.status} /></div>

                        <div className="col-span-2 flex justify-end">
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setOpenMenuId((cur) => (cur === inv._id ? null : inv._id))}
                              className="h-10 w-10 grid place-items-center rounded-[var(--af-radius-md)] border border-[var(--af-line)] bg-white hover:-translate-y-[1px] hover:shadow-[var(--af-shadow-card)] transition font-black"
                              aria-label="Actions"
                            >
                              ⋮
                            </button>

                            {openMenuId === inv._id ? (
                              <div className="absolute right-0 mt-2 w-48 rounded-[var(--af-radius-xl)] border border-[var(--af-line)] bg-white shadow-[var(--af-shadow-soft)] p-2 z-50">
                                <button
                                  onClick={async () => {
                                    setOpenMenuId(null);
                                    try {
                                      await downloadInvoiceExcel(inv._id, excelName || "Report.xlsx");
                                    } catch (e) {
                                      console.error(e);
                                      alert(e?.response?.data?.message || "Download failed. Is the file ready?");
                                    }
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-[var(--af-radius-lg)] hover:bg-slate-50 font-black text-sm"
                                >
                                  Download
                                </button>

                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setDeleteTarget(inv);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-[var(--af-radius-lg)] hover:bg-rose-50 text-rose-700 font-black text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <div className="text-[13px] text-[var(--af-muted)] font-semibold">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button className="af-btn af-btnGhost px-3 py-2" onClick={() => setPage(1)} disabled={page === 1}>
                First
              </button>
              <button className="af-btn af-btnGhost px-3 py-2" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Prev
              </button>
              <button className="af-btn af-btnGhost px-3 py-2" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </button>
              <button className="af-btn af-btnGhost px-3 py-2" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                Last
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
