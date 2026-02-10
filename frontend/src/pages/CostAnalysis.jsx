import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function CostAnalysis() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Fetch cost data
  useEffect(() => {
    let alive = true;

    const fetchCosting = async () => {
      try {
        setLoading(true);
        const res = await api.get("/costing");
        const list = Array.isArray(res.data) ? res.data : res.data?.rows || [];
        if (!alive) return;

        // latest first
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRows(list);
      } catch (e) {
        console.error("Failed to fetch costing", e);
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchCosting();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const file = (r.fileName || r.document || "").toLowerCase();
      const ref = String(r._id || r.reference || "").toLowerCase();
      const sid = String(r.sessionId || "").toLowerCase();
      return file.includes(q) || ref.includes(q) || sid.includes(q);
    });
  }, [rows, searchTerm]);

  const totals = useMemo(() => {
    const input = filtered.reduce((s, r) => s + (r.inputTokens || 0), 0);
    const output = filtered.reduce((s, r) => s + (r.outputTokens || 0), 0);
    const cost = filtered.reduce((s, r) => s + (r.cost || 0), 0);
    const count = filtered.length;
    const tokens = input + output;
    const avgCost = count ? cost / count : 0;
    const maxCost = filtered.reduce((m, r) => Math.max(m, Number(r.cost || 0)), 0);
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayCost = filtered.reduce((s, r) => {
      const d = (r.createdAt || '').slice(0, 10);
      return s + (d === todayKey ? Number(r.cost || 0) : 0);
    }, 0);
    const efficiency = tokens ? (cost / tokens) : 0;
    return { count, input, output, tokens, cost, avgCost, maxCost, todayCost, efficiency };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const currentItems = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, page]);

  const money = (n) => `$${Number(n || 0).toFixed(4)}`;
  const fmt = (n) => Number(n || 0).toLocaleString();

  if (loading) {
    return (
      <div className="af-card">
        <div className="af-cardBody flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-blue-600" />
          <div className="text-sm font-semibold text-[var(--af-muted)]">Loading usage…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="af-kpiGrid">
        <div className="af-kpiTile"><div className="af-kpiInner">
          <div className="af-kpiK">Total records</div>
          <div className="af-kpiV">{totals.count}</div>
          <div className="mt-2 text-[12px] text-[var(--af-muted)] font-semibold">Rows in the ledger</div>
        </div></div>

        <div className="af-kpiTile"><div className="af-kpiInner">
          <div className="af-kpiK">Total tokens</div>
          <div className="af-kpiV">{fmt(totals.tokens)}</div>
          <div className="mt-2 text-[12px] text-[var(--af-muted)] font-semibold">In {fmt(totals.input)} • Out {fmt(totals.output)}</div>
        </div></div>

        <div className="af-kpiTile"><div className="af-kpiInner">
          <div className="af-kpiK">Total cost</div>
          <div className="af-kpiV">${totals.cost.toFixed(6)}</div>
          <div className="mt-2 text-[12px] text-[var(--af-muted)] font-semibold">All-time spend</div>
        </div></div>

        <div className="af-kpiTile"><div className="af-kpiInner">
          <div className="af-kpiK">Avg cost</div>
          <div className="af-kpiV">${totals.avgCost.toFixed(6)}</div>
          <div className="mt-2 text-[12px] text-[var(--af-muted)] font-semibold">Per record</div>
        </div></div>

        <div className="af-kpiTile"><div className="af-kpiInner">
          <div className="af-kpiK">Peak cost</div>
          <div className="af-kpiV">${Number(totals.maxCost).toFixed(6)}</div>
          <div className="mt-2 text-[12px] text-[var(--af-muted)] font-semibold">Highest single run</div>
        </div></div>

        <div className="af-kpiTile"><div className="af-kpiInner">
          <div className="af-kpiK">Today</div>
          <div className="af-kpiV">${Number(totals.todayCost).toFixed(6)}</div>
          <div className="mt-2 text-[12px] text-[var(--af-muted)] font-semibold">Spend (local time)</div>
        </div></div>
      </div>

      <div className="af-card">
        <div className="af-cardHead">
          <div>
            <div className="af-h3">Usage ledger</div>
            <div className="af-hint">Search by file, session or reference id</div>
          </div>
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search…"
            className="af-input max-w-md"
          />
        </div>

        <div className="af-cardBody p-0">
          <div className="overflow-x-auto thin-scroll">
            <table className="af-table">
              <thead>
                <tr>
                  <th className="af-th">File</th>
                  <th className="af-th">Session</th>
                  <th className="af-th">Input tokens</th>
                  <th className="af-th">Output tokens</th>
                  <th className="af-th">Cost</th>
                  <th className="af-th">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td className="af-td" colSpan={6}>
                      <div className="py-6 text-[13px] text-[var(--af-muted)] font-semibold">No records found.</div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((r) => (
                    <tr key={r._id || `${r.fileName}-${r.createdAt}`} className="af-tr">
                      <td className="af-td">
                        <div className="font-semibold max-w-[460px] truncate">{r.fileName || r.document || "-"}</div>
                        <div className="text-[12px] text-[var(--af-muted)] font-semibold">Ref: {String(r._id || r.reference || "-").slice(-10)}</div>
                      </td>
                      <td className="af-td text-[var(--af-muted)] font-semibold">#{String(r.sessionId || "-").slice(-6)}</td>
                      <td className="af-td">{fmt(r.inputTokens)}</td>
                      <td className="af-td">{fmt(r.outputTokens)}</td>
                      <td className="af-td font-black text-emerald-700">{money(r.cost)}</td>
                      <td className="af-td text-[var(--af-muted)] font-semibold">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="af-cardBody flex items-center justify-between flex-wrap gap-2">
          <div className="text-[13px] text-[var(--af-muted)] font-semibold">Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <button className="af-btn af-btnGhost px-3 py-2" onClick={() => setPage(1)} disabled={page === 1}>First</button>
            <button className="af-btn af-btnGhost px-3 py-2" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
            <button className="af-btn af-btnGhost px-3 py-2" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
            <button className="af-btn af-btnGhost px-3 py-2" onClick={() => setPage(totalPages)} disabled={page === totalPages}>Last</button>
          </div>
        </div>
      </div>
    </div>
  );
}
