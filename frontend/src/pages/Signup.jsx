import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      await signup(username, email, password);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--af-bg)] grid place-items-center p-6">
      <div className="w-full max-w-md">
        <div className="af-brand mb-5">
          <div className="af-brandDot" />
          <div>
            <div className="font-black tracking-wide">InvoiceIQ</div>
            <div className="text-[12px] text-[var(--af-muted)] font-semibold">Create your workspace access</div>
          </div>
        </div>

        <div className="af-card">
          <div className="af-cardHead">
            <div>
              <div className="af-h3">Create account</div>
              <div className="af-hint">Use your org email if applicable</div>
            </div>
          </div>

          <div className="af-cardBody">
            <form onSubmit={handleSubmit} className="grid gap-4">
              {error ? (
                <div className="rounded-[var(--af-radius-xl)] border border-rose-200 bg-rose-50 p-3">
                  <div className="text-[13px] text-rose-700 font-black">{error}</div>
                </div>
              ) : null}

              <div>
                <div className="af-label mb-1">Name</div>
                <input
                  type="text"
                  className="af-input"
                  placeholder="Your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

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
                {loading ? "Creating…" : "Create account"}
              </button>

              <div className="text-center text-[13px] text-[var(--af-muted)] font-semibold">
                Already have an account?{" "}
                <Link to="/login" className="text-slate-900 font-black hover:underline">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
