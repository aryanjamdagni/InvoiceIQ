import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--af-bg)] p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="h-10 w-10 rounded-xl" style={{ background: "radial-gradient(circle at 30% 30%, #60a5fa, #1d4ed8)" }} />
          <div>
            <div className="text-lg font-black">InvoiceIQ</div>
            <div className="text-[12px] text-[var(--af-muted)] font-semibold">Sign in to continue</div>
          </div>
        </div>

        <div className="af-card">
          <div className="af-cardHead">
            <div>
              <div className="af-h3">Welcome back</div>
              <div className="af-hint">Use your account to access runs and exports</div>
            </div>
          </div>

          <div className="af-cardBody">
            {error ? (
              <div className="mb-4 rounded-[var(--af-radius-xl)] border border-rose-200 bg-rose-50 px-4 py-3">
                <div className="text-rose-700 font-black text-sm">{error}</div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div>
                <div className="af-label mb-1">Email</div>
                <input
                  type="email"
                  className="af-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="af-label mb-1">Password</div>
                <input
                  type="password"
                  className="af-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="af-btn af-btnPrimary w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>

              <div className="text-center text-[13px] text-[var(--af-muted)] font-semibold">
                Don’t have an account?{" "}
                <Link to="/signup" className="text-slate-900 font-black hover:underline">
                  Create one
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
