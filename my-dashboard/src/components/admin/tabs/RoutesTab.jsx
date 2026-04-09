import AdminActionButtons from "../AdminActionButtons";
import AdminDataTable from "../AdminDataTable";
import RouteForm from "../forms/RouteForm";

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
        headers={["Route Code", "Route Name", "Color", "Status", "Actions"]}
        rows={routes.map((route) => [
          route.routeCode || "-",
          route.routeName || "-",
          <div
            key={`${route.id}-color`}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <span
              style={{
                display: "inline-block",
                width: "18px",
                height: "18px",
                borderRadius: "4px",
                background: route.color || "#2563eb",
                border: "1px solid #fff",
              }}
            />
            {route.color || "-"}
          </div>,
          route.active ? "Active" : "Inactive",
          <AdminActionButtons
            key={`${route.id}-actions`}
            onEdit={() => onEditRoute(route)}
            onDelete={() => onDeleteRoute(route.id)}
          />,
        ])}
        emptyText="No routes yet."
      />
    </div>
  );
}