import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";
import { createRouteMap, createVehicleMap } from "../utils/adminHelpers";

export function useAdminData() {
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const routesQuery = query(collection(db, "routes"), orderBy("createdAt", "desc"));
    const stopsQuery = query(collection(db, "stops"), orderBy("createdAt", "desc"));
    const vehiclesQuery = query(collection(db, "vehicles"), orderBy("createdAt", "desc"));
    const tripsQuery = query(collection(db, "trips"), orderBy("createdAt", "desc"));

    const unsubRoutes = onSnapshot(
      routesQuery,
      (snapshot) => {
        setRoutes(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Routes fetch error:", error);
        setLoading(false);
      }
    );

    const unsubStops = onSnapshot(
      stopsQuery,
      (snapshot) => {
        setStops(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
      (error) => {
        console.error("Stops fetch error:", error);
      }
    );

    const unsubVehicles = onSnapshot(
      vehiclesQuery,
      (snapshot) => {
        setVehicles(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
      (error) => {
        console.error("Vehicles fetch error:", error);
      }
    );

    const unsubTrips = onSnapshot(
      tripsQuery,
      (snapshot) => {
        setTrips(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
      (error) => {
        console.error("Trips fetch error:", error);
      }
    );

    return () => {
      unsubRoutes();
      unsubStops();
      unsubVehicles();
      unsubTrips();
    };
  }, []);

  const routeMap = useMemo(() => createRouteMap(routes), [routes]);
  const vehicleMap = useMemo(() => createVehicleMap(vehicles), [vehicles]);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  };

  return {
    routes,
    stops,
    vehicles,
    trips,
    loading,
    message,
    showMessage,
    routeMap,
    vehicleMap,
  };
}