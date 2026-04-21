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

const sectionTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  margin: 0,
  color: "var(--text-on-dark)",
  flexWrap: "wrap",
};

const bodyTextStyle = {
  color: "var(--text-sub)",
  lineHeight: 1.75,
  marginTop: "12px",
  marginBottom: 0,
};

export default function AboutUs() {
  return (
    <Layout>
      <div className="dashboard-container">
        <div
          style={{
            marginBottom: "16px",
            padding: "4px 0",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "var(--text-on-dark)",
              fontSize: "clamp(1.9rem, 4vw, 2.5rem)",
              lineHeight: 1.15,
              wordBreak: "break-word",
            }}
          >
            About Our Project
          </h1>

          <p
            style={{
              marginTop: "10px",
              marginBottom: 0,
              color: "var(--text-sub)",
              lineHeight: 1.7,
              maxWidth: "900px",
            }}
          >
            Learn more about the system, its purpose, mission, vision, and
            development team.
          </p>
        </div>

        <div className="card" style={{ marginTop: "16px" }}>
          <h2 style={sectionTitleStyle}>
            <Info size={20} />
            Project Overview
          </h2>

          <p style={bodyTextStyle}>
            This web-based dashboard provides real-time traffic monitoring,
            route management, and reporting functionalities. It enables
            administrators and operators to efficiently monitor live traffic
            data, manage and update route information, and generate
            comprehensive performance reports. With its user-friendly interface
            and organized data visualization, the system improves workflow
            efficiency, supports faster and more accurate decision-making, and
            enhances overall traffic management operations for better planning
            and service delivery.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          <div className="card">
            <h3 style={sectionTitleStyle}>
              <Target size={18} />
              Mission
            </h3>

            <p style={bodyTextStyle}>
              To develop a reliable, efficient, and scalable traffic monitoring
              and management system that enhances real-time decision-making,
              improves operational efficiency, and supports data-driven planning
              for better traffic flow, safety, and overall transportation
              management.
            </p>
          </div>

          <div className="card">
            <h3 style={sectionTitleStyle}>
              <Eye size={18} />
              Vision
            </h3>

            <p style={bodyTextStyle}>
              To become a trusted, innovative, and widely adopted traffic
              monitoring system that enhances transportation management,
              improves road safety, and provides accurate, real-time information
              to support smarter decision-making for both authorities and the
              public.
            </p>
          </div>
        </div>

        <div className="card" style={{ marginTop: "24px" }}>
          <h2 style={sectionTitleStyle}>
            <Users size={20} />
            Development Team
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
                  padding: "18px 14px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  background: "rgba(255,255,255,0.02)",
                  minWidth: 0,
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    marginBottom: "8px",
                    color: "var(--text-on-dark)",
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {member.name}
                </h4>

                <p
                  style={{
                    color: "var(--text-sub)",
                    margin: 0,
                    wordBreak: "break-word",
                  }}
                >
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="card"
          style={{
            marginTop: "24px",
            padding: "20px",
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: "16px",
              color: "var(--text-on-dark)",
              wordBreak: "break-word",
            }}
          >
            Contact Information
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h4
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: 0,
                  marginBottom: "10px",
                  color: "var(--text-on-dark)",
                  flexWrap: "wrap",
                  wordBreak: "break-word",
                }}
              >
                <Mail size={16} />
                Emails
              </h4>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: "18px",
                  lineHeight: 1.9,
                  color: "var(--text-on-dark)",
                }}
              >
                {emails.map((email) => (
                  <li
                    key={email}
                    style={{
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    <a
                      href={`mailto:${email}`}
                      style={{
                        color: "#67e8f9",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.textDecoration = "underline")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.textDecoration = "none")
                      }
                    >
                      {email}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ minWidth: 0 }}>
              <h4
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: 0,
                  marginBottom: "10px",
                  color: "var(--text-on-dark)",
                  flexWrap: "wrap",
                  wordBreak: "break-word",
                }}
              >
                <Phone size={16} />
                Phone Numbers
              </h4>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: "18px",
                  lineHeight: 1.9,
                  color: "var(--text-on-dark)",
                }}
              >
                {phones.map((phone) => (
                  <li
                    key={phone}
                    style={{
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    <a
                      href={`tel:${phone}`}
                      style={{
                        color: "#67e8f9",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.textDecoration = "underline")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.textDecoration = "none")
                      }
                    >
                      {phone}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}