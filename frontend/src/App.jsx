import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Sidebar from "./components/SIdebar";
import CostAnalysis from "./pages/CostAnalysis";
import TopBar from "./components/TopBar";
import BackgroundDecor from "./components/BackgroundDecor";

function PageFrame({ children }) {
  const location = useLocation();

  const map = {
    "/": { title: "Create", subtitle: "Upload PDFs and track extraction" },
    "/history": { title: "Runs", subtitle: "Browse, download and manage past runs" },
    "/dashboard": { title: "Runs", subtitle: "Browse, download and manage past runs" },
    "/cost-analysis": { title: "Usage", subtitle: "Token usage and cost ledger" },
  };

  const meta = map[location.pathname] || { title: "InvoiceIQ", subtitle: "" };

  return (
    <div className="af-shell">
      <Sidebar />
      <div className="af-main">
        <BackgroundDecor />
        <TopBar title={meta.title} subtitle={meta.subtitle} />
        <main className="p-6 grid gap-5">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <PageFrame>
                <Home />
              </PageFrame>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PageFrame>
                <Dashboard />
              </PageFrame>
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <PageFrame>
                <History />
              </PageFrame>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cost-analysis"
          element={
            <ProtectedRoute>
              <PageFrame>
                <CostAnalysis />
              </PageFrame>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
