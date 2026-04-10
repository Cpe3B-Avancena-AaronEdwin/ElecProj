import React from "react";

export default React.memo(function Button({ children, className = "", ...props }) {
  return (
    <button className={`btn ${className}`} {...props}>
      {children}
    </button>
  );
});
