import Papa from "papaparse";

export async function loadGtfsFiles(files) {
  const responses = await Promise.all(
    files.map(async (name) => {
      const res = await fetch(`/gtfs/${name}.txt`);
      if (!res.ok) throw new Error(`Failed ${name}`);
      const text = await res.text();

      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      });

      return [name, parsed.data];
    })
  );

  return Object.fromEntries(responses);
}