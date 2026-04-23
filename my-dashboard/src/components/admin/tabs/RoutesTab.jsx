import AdminActionButtons from "../AdminActionButtons";
import AdminDataTable from "../AdminDataTable";
import RouteForm from "../forms/RouteForm";

const ROUTE_COLORS = [
  { label: "Primary", value: "#2563eb" },
  { label: "Secondary", value: "#22d3ee" },
  { label: "Express", value: "#a855f7" },
  { label: "Feeder", value: "#22c55e" },
  { label: "Special", value: "#f97316" },
  { label: "Inactive", value: "#64748b" },
];

function getRouteColorLabel(color) {
  const match = ROUTE_COLORS.find(
    (item) => item.value.toLowerCase() === String(color || "").toLowerCase()
  );
  return match ? match.label : "Custom";
}

export default function RoutesTab({
  routes,
  routeForm,
  handleRouteChange,
  submitRoute,
  editingRouteId,
  cancelRouteEdit,
  onEditRoute,
  onDeleteRoute,
}) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Routes Management</h2>

      <RouteForm
        routeForm={routeForm}
        handleRouteChange={handleRouteChange}
        submitRoute={submitRoute}
        editingRouteId={editingRouteId}
        cancelRouteEdit={cancelRouteEdit}
      />

      <AdminDataTable
        headers={["Route Code", "Route Name", "Color Class", "Status", "Actions"]}
        rows={routes.map((route) => {
          const routeColor = route.color || "#2563eb";
          const colorLabel = getRouteColorLabel(routeColor);

          return [
            route.routeCode || "-",
            route.routeName || "-",
            <div
              key={`${route.id}-color`}
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "18px",
                  height: "18px",
                  borderRadius: "4px",
                  background: routeColor,
                  border: "1px solid rgba(255,255,255,0.8)",
                }}
              />
              <span>{colorLabel}</span>
            </div>,
            route.active ? "Active" : "Inactive",
            <AdminActionButtons
              key={`${route.id}-actions`}
              onEdit={() => onEditRoute(route)}
              onDelete={() => onDeleteRoute(route.id)}
            />,
          ];
        })}
        emptyText="No routes yet."
      />
    </div>
  );
}