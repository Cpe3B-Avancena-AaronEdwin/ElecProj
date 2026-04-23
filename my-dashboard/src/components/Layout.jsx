import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../firebase/auth";
import SiteFooter from "./SiteFooter";

function getFirstName(user) {
  const rawName =
    user?.displayName?.trim() ||
    user?.email?.split("@")[0] ||
    "User";

  const firstToken = rawName.split(/\s+/)[0] || "User";
  return firstToken.charAt(0).toUpperCase() + firstToken.slice(1);
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const firstName = useMemo(() => getFirstName(user), [user]);

  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const toggleDropdown = (e) => {
    e.preventDefault();
    setDropdownOpen((prev) => !prev);
  };

  const closeDropdown = () => setDropdownOpen(false);

  const handleLogout = async () => {
    closeDropdown();
    await logoutUser();
    navigate("/login");
  };

  const handleProfile = () => {
    closeDropdown();
    navigate("/profile");
  };

  const navItems = useMemo(() => {
    const items = [
      { label: "Dashboard", path: "/dashboard", icon: "🏠" },
      { label: "Data", path: "/traffic", icon: "📊" },
      { label: "Trip Planner", path: "/trip-planner", icon: "🧭" },
      { label: "About Us", path: "/about", icon: "ℹ️" },
    ];

    if (role === "admin") {
      items.push(
        { label: "Users Information Settings", path: "/admin/users", icon: "👤" },
        { label: "Manage Routes", path: "/admin", icon: "🗺️" }
      );
    }

    return items;
  }, [role]);

  return (
    <div
      className="app"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="main full-width"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <div className="header">
          <div className="header-left">
            <div className="header-icon">
              <img src="/logo.jpeg" alt="CityBloop Logo" />
            </div>

            <div className="header-content">
              <h1 className="header-title">CityBloop</h1>
              <p className="header-subtitle">Live Transit Analytics</p>
            </div>
          </div>

          <div className="header-right">
            <div className="dropdown-wrapper" ref={dropdownRef}>
              <button
                ref={buttonRef}
                type="button"
                className="user-label"
                onClick={toggleDropdown}
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
              >
                Hello, {firstName}
              </button>

              {dropdownOpen && (
                <div className="dropdown-menu" role="menu">
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={handleProfile}
                  >
                    Profile
                  </button>

                  <button
                    type="button"
                    className="dropdown-item dropdown-item--danger"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="layout-body"
          style={{
            display: "flex",
            flex: 1,
            minHeight: 0,
            alignItems: "stretch",
          }}
        >
          <aside className="nav-sidebar">
            <nav className="sidebar-menu">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-item ${isActive ? "active" : ""}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main
            className="content"
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {children}
            <SiteFooter />
          </main>
        </div>
      </div>
    </div>
  );
}