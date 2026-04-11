import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";              // ✅ Admin Panel
import AdminUsersPage from "./pages/AdminUsersPage"; // ✅ User Management
import UserSettings from "./components/user/UserSettings";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import Traffic from "./pages/Traffic";
import RoutesPage from "./pages/Routes";       // ✅ Public routes page
import About from "./pages/About";
import './App';      
import "./components/user/UserSettings";

// 🔹 Protected Route wrapper
function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />

  <Route
    path="/dashboard"
    element={
      <ProtectedRoute allowedRoles={["admin", "operator", "viewer"]}>
        <Dashboard />
      </ProtectedRoute>
    }
  />

          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<About />} />

          {/* Protected routes */}
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
              <ProtectedRoute allowedRoles={["admin", "operator"]}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* 🔹 Admin Panel */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Admin />
              </ProtectedRoute>
            }
          />

          {/* 🔹 Admin Users Page */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />

          {/* 🔹 User Settings */}
          <Route
            path="/settings/*"
            element={
              <ProtectedRoute allowedRoles={["admin", "operator", "viewer"]}>
                <UserSettings />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}