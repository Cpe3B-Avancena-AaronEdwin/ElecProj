import React from "react";

export default function AuthCard({ title, children }) {
  return (
    <div className="auth-wrapper">
      <div className="auth-card" role="region" aria-label={title}>
        <h2 className="auth-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
