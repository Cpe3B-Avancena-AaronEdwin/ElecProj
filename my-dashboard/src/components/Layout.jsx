import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../firebase/auth";
import SiteFooter from "./SiteFooter";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  // Navigation handlers
  const handleUserSettings = () => {
    navigate("/settings");
    setDropdownOpen(false);
  };

  const handleAdminUsers = () => {
    navigate("/admin/users");   // ✅ User Management
    setDropdownOpen(false);
  };

  const handleAdminPanel = () => {
    navigate("/admin");         // ✅ Admin Panel
    setDropdownOpen(false);
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Live Traffic", path: "/traffic" },
    { label: "Routes", path: "/routes" },
    { label: "Reports", path: "/reports" },
    { label: "About Us", path: "/about" },
  ];

  return (
    <div className="app">
      <div className="main full-width">
        {/* HEADER */}
        <div className="header">
          <div className="header-left">
            <div className="header-icon">🚌</div>
            <div className="header-content">
              <h1 className="header-title">CityBloop</h1>
              <p className="header-subtitle">Live Transit Analytics</p>
            </div>
          </div>

          {/* USER INFO + DROPDOWN */}
          <div className="header-right" ref={dropdownRef}>
            <span className="user-label">
              Hello, {user?.displayName || "User"}
            </span>

            <button
              className="dropdown-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              ☰
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu">
                {role === "viewer" && (
                  <>
                    <button className="dropdown-item" onClick={handleUserSettings}>
                      User Information Settings
                    </button>
                    <button
                      className="dropdown-item dropdown-item--danger"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </>
                )}

                {role === "admin" && (
                  <>
                    <button className="dropdown-item" onClick={handleAdminUsers}>
                      Users Information Settings
                    </button>
                    <button className="dropdown-item" onClick={handleAdminPanel}>
                      Manage Routes
                    </button>
                    <button
                      className="dropdown-item dropdown-item--danger"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* NAVIGATION BAR */}
        <div className="nav-bar">
          <nav className="horizontal-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <input className="search-input" placeholder="Search location..." />
        </div>

        <div className="content">{children}</div>
        <SiteFooter />
      </div>
    </div>
  );
}