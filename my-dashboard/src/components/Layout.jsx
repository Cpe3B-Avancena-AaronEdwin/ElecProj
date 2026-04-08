import { Link, useLocation } from "react-router-dom";

export default function Layout({ children }) {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/dashboard":
        return "Dashboard";
      case "/traffic":
        return "Live Traffic";
      case "/routes":
        return "Routes";
      case "/reports":
        return "Reports";
      case "/admin":
        return "Admin";
      default:
        return "Dashboard";
    }
  };

  return (
    <div className="app">

      {/* SIDEBAR */}
      <div className="sidebar">
        <h2>TrafficSys</h2>
        <Link
          to="/dashboard"
          className={location.pathname === "/dashboard" ? "active" : ""}
        >
          Dashboard
        </Link>
        <Link
          to="/traffic"
          className={location.pathname === "/traffic" ? "active" : ""}
        >
          Live Traffic
        </Link>
        <Link
          to="/routes"
          className={location.pathname === "/routes" ? "active" : ""}
        >
          Routes
        </Link>
        <Link
          to="/reports"
          className={location.pathname === "/reports" ? "active" : ""}
        >
          Reports
        </Link>
        <Link
          to="/admin"
          className={location.pathname === "/admin" ? "active" : ""}
        >
          Settings
        </Link>
      </div>

      {/* MAIN */}
      <div className="main">

        <div className="topbar">
          <h3>{getPageTitle()}</h3>
          <input placeholder="Search location..." />
        </div>

        <div className="content">
          {children}
        </div>

      </div>
    </div>
  );
}