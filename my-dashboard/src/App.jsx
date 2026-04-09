import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Traffic from "./pages/Traffic";
import RoutesPage from "./pages/Routes";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import AboutUs from "./pages/AboutUs"; // ✅ import About Us
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin", "operator", "viewer"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/traffic"
            element={
              <ProtectedRoute allowedRoles={["admin", "operator", "viewer"]}>
                <Traffic />
              </ProtectedRoute>
            }
          />

          <Route
            path="/routes"
            element={
              <ProtectedRoute allowedRoles={["admin", "operator", "viewer"]}>
                <RoutesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["admin", "operator", "viewer"]}>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Admin />
              </ProtectedRoute>
            }
          />

          {/* Public About Us page */}
          <Route path="/about" element={<AboutUs />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}