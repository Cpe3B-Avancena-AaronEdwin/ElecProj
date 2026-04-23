import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../firebase/auth";
import SiteFooter from "./SiteFooter";

function getFirstName(user) {
  const rawName = user?.displayName?.trim() || user?.email?.split("@")[0] || "User";
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
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) {
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

  const closeDropdown = () => setDropdownOpen(false);

  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropdownOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    closeDropdown();
    await logoutUser();
    navigate("/login");
  };

  const handleProfile = () => {
    closeDropdown();
    navigate("/profile");
  };

  const handleAdminUsers = () => {
    closeDropdown();
    navigate("/admin/users");
  };

  const handleAdminPanel = () => {
    closeDropdown();
    navigate("/admin");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Traffic & Routes", path: "/traffic" },
    { label: "About Us", path: "/about" },
  ];

  return (
    <div className="app">
      <div className="main full-width">
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
              <span className="user-label">Hello, {firstName}</span>

              <button
                ref={buttonRef}
                type="button"
                className="dropdown-trigger"
                onClick={toggleDropdown}
                aria-label="Open user menu"
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
              >
                ☰
              </button>

              {dropdownOpen && (
                <div className="dropdown-menu" role="menu">
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={handleProfile}
                    role="menuitem"
                  >
                    Profile
                  </button>

                  {role === "admin" && (
                    <>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={handleAdminUsers}
                        role="menuitem"
                      >
                        Users Information Settings
                      </button>

                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={handleAdminPanel}
                        role="menuitem"
                      >
                        Manage Routes
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="dropdown-item dropdown-item--danger"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

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
        </div>

        <div className="content">{children}</div>
        <SiteFooter />
      </div>
    </div>
  );
}