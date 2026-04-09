export default function AdminDataTable({ headers, rows, emptyText }) {
  return (
    <div
      style={{
        marginTop: "1rem",
        overflowX: "auto",
        background: "#0b1220",
        borderRadius: "14px",
        border: "1px solid #1f2937",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "1150px",
        }}
      >
        <thead>
          <tr style={{ background: "#1f2937" }}>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  textAlign: "left",
                  padding: "0.95rem",
                  color: "#fff",
                  borderBottom: "1px solid #334155",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                style={{
                  padding: "1rem",
                  color: "#cbd5e1",
                }}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} style={{ borderBottom: "1px solid #1f2937" }}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      padding: "0.95rem",
                      color: "#e5e7eb",
                      verticalAlign: "top",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}