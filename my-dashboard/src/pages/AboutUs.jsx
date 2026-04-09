import React from "react";
import { Users, Target, Eye, Info, Mail, Phone } from "lucide-react";
import Layout from "../components/Layout";

export default function AboutUs() {
  return (
    <Layout>
      <div className="dashboard-container">

        {/* Header (no card) */}
        <div style={{ marginBottom: "16px" }}>
          <h1>About Our Project</h1>
          <p>
            Learn more about the system, its purpose, mission, vision, and development team.
          </p>
        </div>

        {/* Project Overview */}
        <div className="card" style={{ marginTop: "16px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Info size={20} /> Project Overview
          </h2>
          <p className="status-card-note">
            This web-based dashboard provides real-time traffic monitoring, route management,
            and reporting features. Administrators and operators can easily monitor data,
            manage routes, and generate performance reports efficiently.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid" style={{ gap: "16px", marginTop: "16px" }}>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Target size={18} /> Mission
            </h3>
            <p>
              To develop a reliable and efficient traffic monitoring and management system
              that enhances decision-making and operational efficiency.
            </p>
          </div>

          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Eye size={18} /> Vision
            </h3>
            <p>
              To become a trusted and innovative traffic monitoring system
              that improves transportation management and public safety.
            </p>
          </div>
        </div>

        {/* Development Team */}
        <div className="card" style={{ marginTop: "24px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={20} /> Development Team
          </h2>
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            {[
              { name: "AARON EDWIN L. AVANCENA", role: "Member 1" },
              { name: "CHRISTEA BLESS D.C. CASIA", role: "Member 2" },
              { name: "DERICK A. DE GUZMAN", role: "Member 3" },
              { name: "KENNETH BAUTISTA", role: "Member 4" },
              { name: "JOHN JOSEPH MANALANG", role: "Member 5" },
            ].map((member) => (
              <div key={member.name} className="panel" style={{ textAlign: "center" }}>
                <h4>{member.name}</h4>
                <p>{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        <div className="card" style={{ marginTop: "24px" }}>
          <h2>Contact Information</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
            <p style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Mail size={16} /> project@email.com
            </p>
            <p style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Phone size={16} /> 09XXXXXXXXX
            </p>
          </div>
        </div>

      </div>
    </Layout>
  );
}