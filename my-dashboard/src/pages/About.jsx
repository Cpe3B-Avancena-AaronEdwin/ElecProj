import React from "react";
import { Users, Target, Eye, Info, Mail, Phone } from "lucide-react";
import Layout from "../components/Layout";

const teamMembers = [
  { name: "AARON EDWIN L. AVANCENA", role: "MEMBER 1" },
  { name: "CHRISTEA BLESS D.C. CASIA", role: "MEMBER 2" },
  { name: "DERICK A. DE GUZMAN", role: "MEMBER 3" },
  { name: "KENNETH BAUTISTA", role: "MEMBER 4" },
  { name: "JOHN JOSEPH MANALANG", role: "MEMBER 5" },
];

const emails = [
  "aaronavancena23@gmail.com",
  "kenneth.bautista0604@gmail.com",
  "casia.christeablessdc@gmail.com",
  "derickdeguzman17@gmail.com",
  "johnjosephmanalangg@gmail.com",
];

const phones = [
  "09253066632",
  "09464037811",
  "09503589237",
  "09774524599",
  "09478225246",
];

export default function AboutUs() {
  return (
    <Layout>
      <div className="dashboard-container">
        <div style={{ marginBottom: "16px" }}>
          <h1>About Our Project</h1>
          <p>
            Learn more about the system, its purpose, mission, vision, and
            development team.
          </p>
        </div>

        {/* Project Overview */}
        <div className="card" style={{ marginTop: "16px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Info size={20} />
            Project Overview
          </h2>
          <p className="status-card-note">
            This web-based dashboard provides real-time traffic monitoring, route management, and reporting functionalities. It enables administrators and operators to efficiently monitor live traffic data, manage and update route information, and generate comprehensive performance reports. With its user-friendly interface and organized data visualization, the system improves workflow efficiency, supports faster and more accurate decision-making, and enhances overall traffic management operations for better planning and service delivery. 
          </p>
        </div>

        {/* Mission & Vision */}
        <div
          className="grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Target size={18} />
              Mission
            </h3>
            <p>
              To develop a reliable, efficient, and scalable traffic monitoring and management system that enhances real-time decision-making, improves operational efficiency, and supports data-driven planning for better traffic flow, safety, and overall transportation management.
            </p>
          </div>

          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Eye size={18} />
              Vision
            </h3>
            <p>
              To become a trusted, innovative, and widely adopted traffic monitoring system that enhances transportation management, improves road safety, and provides accurate, real-time information to support smarter decision-making for both authorities and the public.
            </p>
          </div>
        </div>

        {/* Development Team */}
        <div className="card" style={{ marginTop: "24px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={20} />
            Development Team
          </h2>

          <div
            className="grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="panel"
                style={{
                  textAlign: "center",
                  padding: "16px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                }}
              >
                <h4 style={{ marginBottom: "8px" }}>{member.name}</h4>
                <p style={{ color: "#555" }}>{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        <div className="card" style={{ marginTop: "32px", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
          <h2 style={{ marginBottom: "16px" }}>Contact Information</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <h4 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Mail size={16} /> Emails
              </h4>
              <ul style={{ marginLeft: "20px", lineHeight: "1.8" }}>
                {emails.map((email) => (
                  <li key={email}>{email}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Phone size={16} /> Phone Numbers
              </h4>
              <ul style={{ marginLeft: "20px", lineHeight: "1.8" }}>
                {phones.map((phone) => (
                  <li key={phone}>{phone}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
