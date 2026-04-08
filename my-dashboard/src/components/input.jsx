import React from "react";

export default React.memo(function Input({ id, label, error, className = "", ...props }) {
  return (
    <div className="form-field">
      {label && <label htmlFor={id} className="form-label">{label}</label>}
      <input id={id} className={`input ${error ? "input--error" : ""} ${className}`} {...props} />
      {error && <div role="alert" className="form-error">{error}</div>}
    </div>
  );
});
