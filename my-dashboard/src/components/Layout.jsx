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
      { label: "Data", path: "/data", icon: "📊" },
      { label: "Trip Planner", path: "/trip-planner", icon: "🧭" },
    ];

    if (role === "admin") {
      items.push(
        { label: "User Management", path: "/admin/users", icon: "👤" },
        { label: "Route Management", path: "/admin", icon: "🛣️" }
      );
    }

    return items;
  }, [role]);

  return (
    <div className="app">
      <div className="main full-width">

        {/* HEADER */}
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

          {/* USER DROPDOWN */}
          <div className="header-right">
            <div className="dropdown-wrapper" ref={dropdownRef}>
              <button
                ref={buttonRef}
                type="button"
                className="user-label"
                onClick={toggleDropdown}
              >
                Hello, {firstName}
              </button>

              {dropdownOpen && (
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={handleProfile}>
                    Profile
                  </button>

                  <button
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

        <div className="layout-body">
          <aside className="nav-sidebar">
            <nav className="sidebar-menu">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);

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

          <div className="content">{children}</div>
        </div>

        <SiteFooter />
      </div>
    </div>
  );
}