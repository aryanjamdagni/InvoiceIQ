import StatusPill from "./StatusPill";

export default function BatchGroup({ group, onDownload }) {
  const { label, invoices, stats } = group;

  return (
    <details className="rounded-2xl border border-(--border)] bg-(--card)] overflow-hidden">
      <summary className="cursor-pointer select-none px-6 py-4 flex items-center justify-between hover:bg-(--card2)] transition">
        <div>
          <div className="text-[12px] font-black text-(--text)]">
            {label}
          </div>
          <div className="text-[10px] font-bold text-(--muted)] mt-1">
            {stats.total} file(s) • {stats.completed} completed • {stats.failed} failed •{" "}
            {stats.processing} processing
          </div>
        </div>

        <div className="text-[10px] font-black text-(--muted)]">
          Session: #{group.sessionShort}
        </div>
      </summary>

      <div className="px-6 pb-6 pt-2">
        <div className="rounded-2xl border border-(--border)] overflow-hidden">
          <div className="thin-scroll max-h-80 overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-(--card)] border-b border-(--border)] z-10">
                <tr className="text-[10px] font-black text-(--muted)] uppercase tracking-widest">
                  <th className="px-5 py-4">Input PDF</th>
                  <th className="px-5 py-4">Generated Excel</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-center">Timestamp</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-(--border)]">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-(--card2)] transition">
                    <td className="px-5 py-4 text-[12px] font-black text-(--text)]">
                      {inv.fileName}
                    </td>

                    <td className="px-5 py-4 text-[11px] font-bold text-(--muted)]">
                      {inv.excelUrl ? inv.excelUrl.split("/").pop() : "Not Generated"}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <StatusPill text={inv.status} />
                    </td>

                    <td className="px-5 py-4 text-center text-[11px] font-black text-(--text)]">
                      {inv.createdAt
                        ? new Date(inv.createdAt).toLocaleString()
                        : "-"}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onDownload(inv._id)}
                        className="px-4 py-2 rounded-xl border border-(--border)] bg-(--card)] hover:bg-(--card2)] transition text-[11px] font-black"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </details>
  );
}
