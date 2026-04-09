import AdminActionButtons from "../AdminActionButtons";
import AdminDataTable from "../AdminDataTable";
import StopForm from "../forms/StopForm";

export default function StopsTab({
  stops,
  routes,
  routeMap,
  stopForm,
  handleStopChange,
  submitStop,
  editingStopId,
  cancelStopEdit,
  onEditStop,
  onDeleteStop,
}) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Stops Management</h2>

      <StopForm
        stopForm={stopForm}
        handleStopChange={handleStopChange}
        submitStop={submitStop}
        editingStopId={editingStopId}
        cancelStopEdit={cancelStopEdit}
        routes={routes}
      />

      <AdminDataTable
        headers={[
          "Stop Name",
          "Latitude",
          "Longitude",
          "Route",
          "Delay",
          "Passengers",
          "Actions",
        ]}
        rows={stops.map((stop) => [
          stop.stopName || "-",
          stop.latitude ?? "-",
          stop.longitude ?? "-",
          routeMap[stop.routeId]
            ? `${routeMap[stop.routeId].routeCode} - ${routeMap[stop.routeId].routeName}`
            : "Unassigned",
          stop.simulatedDelay ?? 0,
          stop.simulatedPassengers ?? 0,
          <AdminActionButtons
            key={`${stop.id}-actions`}
            onEdit={() => onEditStop(stop)}
            onDelete={() => onDeleteStop(stop.id)}
          />,
        ])}
        emptyText="No stops yet."
      />
    </div>
  );
}