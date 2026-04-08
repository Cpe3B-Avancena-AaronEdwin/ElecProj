import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";

export function useFirestoreTransitData() {
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loadingMapData, setLoadingMapData] = useState(true);

  useEffect(() => {
    const routesQuery = query(collection(db, "routes"), orderBy("createdAt", "desc"));
    const stopsQuery = query(collection(db, "stops"), orderBy("createdAt", "desc"));
    const vehiclesQuery = query(collection(db, "vehicles"), orderBy("createdAt", "desc"));
    const tripsQuery = query(collection(db, "trips"), orderBy("createdAt", "desc"));
    const predictionsQuery = query(collection(db, "predictions"), orderBy("generatedAt", "desc"));

    const unsubRoutes = onSnapshot(routesQuery, snap => {
      setRoutes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubStops = onSnapshot(stopsQuery, snap => {
      setStops(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingMapData(false);
    });

    const unsubVehicles = onSnapshot(vehiclesQuery, snap => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTrips = onSnapshot(tripsQuery, snap => {
      setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPredictions = onSnapshot(predictionsQuery, snap => {
      setPredictions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubRoutes();
      unsubStops();
      unsubVehicles();
      unsubTrips();
      unsubPredictions();
    };
  }, []);

  return { routes, stops, vehicles, trips, predictions, loadingMapData };
}