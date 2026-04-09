import AdminActionButtons from "../AdminActionButtons";
import AdminDataTable from "../AdminDataTable";
import VehicleForm from "../forms/VehicleForm";

export default function VehiclesTab({
  vehicles,
  routes,
  routeMap,
  vehicleForm,
  handleVehicleChange,
  submitVehicle,
  editingVehicleId,
  cancelVehicleEdit,
  onEditVehicle,
  onDeleteVehicle,
}) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Vehicles Management</h2>

      <VehicleForm
        vehicleForm={vehicleForm}
        handleVehicleChange={handleVehicleChange}
        submitVehicle={submitVehicle}
        editingVehicleId={editingVehicleId}
        cancelVehicleEdit={cancelVehicleEdit}
        routes={routes}
      />

      <AdminDataTable
        headers={["Vehicle Code", "Plate Number", "Route", "Status", "Actions"]}
        rows={vehicles.map((vehicle) => [
          vehicle.vehicleCode || "-",
          vehicle.plateNumber || "-",
          routeMap[vehicle.routeId]
            ? `${routeMap[vehicle.routeId].routeCode} - ${routeMap[vehicle.routeId].routeName}`
            : "Unassigned",
          vehicle.status || "-",
          <AdminActionButtons
            key={`${vehicle.id}-actions`}
            onEdit={() => onEditVehicle(vehicle)}
            onDelete={() => onDeleteVehicle(vehicle.id)}
          />,
        ])}
        emptyText="No vehicles yet."
      />
    </div>
  );
}