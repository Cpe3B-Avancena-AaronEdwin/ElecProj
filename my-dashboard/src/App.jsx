import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Traffic from "./pages/Traffic";
import RoutesPage from "./pages/Routes";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import AboutUs from "./pages/AboutUs"; // ✅ added
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Login */}
          <Route path="/login" element={<Login />} />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin", "operator", "viewer"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Traffic */}
          <Route
            path="/traffic"
            element={
              <ProtectedRoute allowedRoles={["admin", "operator", "viewer"]}>
                <Traffic />
              </ProtectedRoute>
            }
          />

          {/* Routes */}
          <Route
            path="/routes"
            element={
              <ProtectedRoute allowedRoles={["admin", "operator", "viewer"]}>
                <RoutesPage />
              </ProtectedRoute>
            }
          />

          {/* Reports */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["admin", "operator", "viewer"]}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Admin />
              </ProtectedRoute>
            }
          />

          {/* About Us */}
          <Route
            path="/about"
            element={
              <ProtectedRoute allowedRoles={["admin", "operator", "viewer"]}>
                <AboutUs />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}