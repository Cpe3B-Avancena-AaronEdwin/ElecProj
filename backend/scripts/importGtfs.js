import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { fileURLToPath } from "url";
import { pool } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gtfsDir = path.join(__dirname, "../gtfs");

function normalizeText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function normalizeNullableText(value) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toColor(value) {
  const raw = normalizeText(value);
  if (!raw) return null;
  return raw.startsWith("#") ? raw : `#${raw}`;
}

function readCsv(fileName) {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(gtfsDir, fileName);

    if (!fs.existsSync(fullPath)) {
      resolve([]);
      return;
    }

    const rows = [];
    fs.createReadStream(fullPath)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

async function truncateTables() {
  console.log("Clearing existing GTFS-imported data...");

  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  await pool.query("TRUNCATE TABLE trips");
  await pool.query("TRUNCATE TABLE stops");
  await pool.query("TRUNCATE TABLE vehicles");
  await pool.query("TRUNCATE TABLE routes");
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");
}

async function importRoutes() {
  const rows = await readCsv("routes.txt");

  for (const row of rows) {
    const routeId = normalizeText(row.route_id);
    if (!routeId) continue;

    const routeCode = normalizeNullableText(row.route_short_name);
    const routeName =
      normalizeText(row.route_long_name) ||
      normalizeText(row.route_short_name) ||
      routeId;

    const color = toColor(row.route_color);
    const description =
      normalizeNullableText(row.route_desc) ||
      normalizeNullableText(row.route_url);

    await pool.query(
      `INSERT INTO routes
      (route_id, route_name, route_code, color, status, start_point, end_point, fare, distance_km, estimated_duration_minutes, description)
      VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
      [
        routeId,
        routeName,
        routeCode,
        color,
        null,
        null,
        0,
        0,
        0,
        description,
      ]
    );
  }

  console.log(`Imported ${rows.length} routes`);
}

async function importStops() {
  const rows = await readCsv("stops.txt");

  for (const row of rows) {
    const stopId = normalizeText(row.stop_id);
    if (!stopId) continue;

    const stopName = normalizeText(row.stop_name) || stopId;
    const latitude = toNumber(row.stop_lat, 0);
    const longitude = toNumber(row.stop_lon, 0);
    const description =
      normalizeNullableText(row.stop_desc) ||
      normalizeNullableText(row.zone_id);

    await pool.query(
      `INSERT INTO stops
      (stop_id, stop_name, route_id, latitude, longitude, sequence_no, status, simulated_passengers, estimated_passengers, description)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [
        stopId,
        stopName,
        null,
        latitude,
        longitude,
        0,
        0,
        0,
        description,
      ]
    );
  }

  console.log(`Imported ${rows.length} stops`);
}

async function importTrips() {
  const rows = await readCsv("trips.txt");

  for (const row of rows) {
    const tripId = normalizeText(row.trip_id);
    if (!tripId) continue;

    const routeId = normalizeNullableText(row.route_id);
    const tripName =
      normalizeNullableText(row.trip_headsign) ||
      normalizeNullableText(row.trip_short_name) ||
      tripId;

    const directionRaw = normalizeNullableText(row.direction_id);
    const direction =
      directionRaw === "0"
        ? "Outbound"
        : directionRaw === "1"
        ? "Inbound"
        : directionRaw;

    await pool.query(
      `INSERT INTO trips
      (trip_id, route_id, vehicle_id, trip_name, direction, departure_time, arrival_time, status, delay_minutes, passenger_count, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)`,
      [tripId, routeId, null, tripName, direction, null, null, 0, 0, null]
    );
  }

  console.log(`Imported ${rows.length} trips`);
}

async function importStopTimes() {
  const rows = await readCsv("stop_times.txt");

  if (!rows.length) {
    console.log("No stop_times.txt found, skipping stop sequence/times update");
    return;
  }

  const routeSequenceMap = new Map();
  const tripFirstTimes = new Map();
  const tripLastTimes = new Map();

  for (const row of rows) {
    const tripId = normalizeText(row.trip_id);
    const stopId = normalizeText(row.stop_id);
    const arrivalTime = normalizeNullableText(row.arrival_time);
    const departureTime = normalizeNullableText(row.departure_time);
    const stopSequence = toNumber(row.stop_sequence, 0);

    if (!tripId || !stopId) continue;

    const [tripRows] = await pool.query(
      "SELECT route_id FROM trips WHERE trip_id = ? LIMIT 1",
      [tripId]
    );

    if (!tripRows.length) continue;

    const routeId = tripRows[0].route_id;
    if (routeId) {
      const existingKey = `${routeId}::${stopId}`;
      const existingSequence = routeSequenceMap.get(existingKey);

      if (
        existingSequence === undefined ||
        stopSequence < existingSequence ||
        existingSequence === 0
      ) {
        routeSequenceMap.set(existingKey, stopSequence);
      }

      await pool.query(
        `UPDATE stops
         SET route_id = CASE
             WHEN route_id IS NULL OR route_id = '' THEN ?
             ELSE route_id
           END
         WHERE stop_id = ?`,
        [routeId, stopId]
      );
    }

    const firstTime = tripFirstTimes.get(tripId);
    if (!firstTime && departureTime) {
      tripFirstTimes.set(tripId, departureTime);
    }

    if (arrivalTime) {
      tripLastTimes.set(tripId, arrivalTime);
    }
  }

  for (const [key, sequenceNo] of routeSequenceMap.entries()) {
    const [routeId, stopId] = key.split("::");

    await pool.query(
      `UPDATE stops
       SET sequence_no = CASE
           WHEN sequence_no = 0 OR sequence_no IS NULL OR sequence_no > ? THEN ?
           ELSE sequence_no
         END
       WHERE stop_id = ? AND route_id = ?`,
      [sequenceNo, sequenceNo, stopId, routeId]
    );
  }

  for (const [tripId, departureTime] of tripFirstTimes.entries()) {
    await pool.query(
      "UPDATE trips SET departure_time = ? WHERE trip_id = ?",
      [departureTime, tripId]
    );
  }

  for (const [tripId, arrivalTime] of tripLastTimes.entries()) {
    await pool.query(
      "UPDATE trips SET arrival_time = ? WHERE trip_id = ?",
      [arrivalTime, tripId]
    );
  }

  console.log(`Processed ${rows.length} stop_times rows`);
}

async function seedVehiclesFromRoutes() {
  const [routeRows] = await pool.query(
    "SELECT route_id, route_code, route_name FROM routes ORDER BY route_name ASC"
  );

  let created = 0;

  for (const route of routeRows) {
    const baseCode =
      normalizeText(route.route_code) ||
      normalizeText(route.route_name).slice(0, 12).replace(/\s+/g, "-") ||
      route.route_id;

    const vehicleId = `vehicle_${route.route_id}`;
    const vehicleNumber = `SIM-${baseCode}`.slice(0, 100);

    await pool.query(
      `INSERT INTO vehicles
      (vehicle_id, vehicle_number, route_id, type, capacity, status, driver_name, plate_number, latitude, longitude, speed, occupancy, description)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        vehicle_number = VALUES(vehicle_number),
        route_id = VALUES(route_id),
        type = VALUES(type),
        capacity = VALUES(capacity),
        status = VALUES(status),
        description = VALUES(description),
        updated_at = CURRENT_TIMESTAMP`,
      [
        vehicleId,
        vehicleNumber,
        route.route_id,
        "GTFS Simulated Vehicle",
        45,
        "System Generated",
        null,
        0,
        0,
        0,
        0,
        "Generated from GTFS route import",
      ]
    );

    created += 1;
  }

  console.log(`Seeded/updated ${created} vehicles from routes`);
}

async function main() {
  try {
    console.log("Starting GTFS import...");
    console.log(`GTFS folder: ${gtfsDir}`);

    await truncateTables();
    await importRoutes();
    await importStops();
    await importTrips();
    await importStopTimes();
    await seedVehiclesFromRoutes();

    console.log("GTFS import complete.");
    process.exit(0);
  } catch (error) {
    console.error("GTFS import failed:", error);
    process.exit(1);
  }
}

main();