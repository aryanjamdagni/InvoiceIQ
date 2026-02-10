export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const btn =
    "px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card2)] transition text-[11px] font-black";

  return (
    <div className="flex items-center justify-between gap-3 mt-4">
      <div className="text-[11px] font-black text-(--muted)]">
        Page {page} of {totalPages}
      </div>

      <div className="flex items-center gap-2">
        <button
          className={btn}
          onClick={() => onPageChange(1)}
          disabled={page === 1}
        >
          First
        </button>
        <button
          className={btn}
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          Prev
        </button>
        <button
          className={btn}
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          Next
        </button>
        <button
          className={btn}
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
        >
          Last
        </button>
      </div>
    </div>
  );
}
