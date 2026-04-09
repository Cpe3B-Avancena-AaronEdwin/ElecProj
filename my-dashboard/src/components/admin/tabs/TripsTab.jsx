import AdminActionButtons from "../AdminActionButtons";
import AdminDataTable from "../AdminDataTable";
import TripForm from "../forms/TripForm";
import { formatDateTime } from "../../../utils/adminHelpers";

export default function TripsTab({
  trips,
  routes,
  routeMap,
  vehicleMap,
  tripForm,
  handleTripChange,
  submitTrip,
  editingTripId,
  cancelTripEdit,
  filteredVehiclesForTrip,
  onEditTrip,
  onDeleteTrip,
}) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Trips Management</h2>

      <TripForm
        tripForm={tripForm}
        handleTripChange={handleTripChange}
        submitTrip={submitTrip}
        editingTripId={editingTripId}
        cancelTripEdit={cancelTripEdit}
        routes={routes}
        filteredVehiclesForTrip={filteredVehiclesForTrip}
      />

      <AdminDataTable
        headers={[
          "Trip Code",
          "Route",
          "Vehicle",
          "Departure",
          "Expected Arrival",
          "Actual Arrival",
          "Status",
          "Delay",
          "Actions",
        ]}
        rows={trips.map((trip) => [
          trip.tripCode || "-",
          routeMap[trip.routeId]
            ? `${routeMap[trip.routeId].routeCode} - ${routeMap[trip.routeId].routeName}`
            : "Unassigned",
          vehicleMap[trip.vehicleId]
            ? `${vehicleMap[trip.vehicleId].vehicleCode} - ${vehicleMap[trip.vehicleId].plateNumber}`
            : "Unassigned",
          formatDateTime(trip.departureTime),
          formatDateTime(trip.expectedArrival),
          trip.actualArrival ? formatDateTime(trip.actualArrival) : "-",
          trip.status || "-",
          `${trip.delayMinutes ?? 0} mins`,
          <AdminActionButtons
            key={`${trip.id}-actions`}
            onEdit={() => onEditTrip(trip)}
            onDelete={() => onDeleteTrip(trip.id)}
          />,
        ])}
        emptyText="No trips yet."
      />
    </div>
  );
}