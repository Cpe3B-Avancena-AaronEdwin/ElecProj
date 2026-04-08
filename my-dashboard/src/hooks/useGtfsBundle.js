import { useEffect, useState } from "react";
import { loadGtfsFiles } from "../services/gtfsService";
import { buildGtfsBundle } from "../utils/gtfsUtils";

const FILES = [
  "agency",
  "calendar",
  "feed_info",
  "frequencies",
  "routes",
  "shapes",
  "stop_times",
  "stops",
  "trips",
];

export function useGtfsBundle() {
  const [gtfsBundle, setGtfsBundle] = useState(null);
  const [gtfsLoading, setGtfsLoading] = useState(true);
  const [gtfsError, setGtfsError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await loadGtfsFiles(FILES);
        const built = buildGtfsBundle(raw);
        setGtfsBundle(built);
      } catch (e) {
        setGtfsError(e.message);
      } finally {
        setGtfsLoading(false);
      }
    };

    load();
  }, []);

  return { gtfsBundle, gtfsLoading, gtfsError };
}