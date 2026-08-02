// Builds simple straight-line dashed connectors from each out-of-metro gym
// back to its NYC anchor station. No bundling, no borough ordering — these
// are independent point-to-point spurs, not shared trunk lines.
export function buildRegionConnectors(stations) {
  const stationById = Object.fromEntries(stations.map((s) => [s.id, s]));

  return stations
    .filter((s) => s.region !== "nyc-metro" && s.connection?.connectsTo)
    .map((station) => {
      const anchor = stationById[station.connection.connectsTo];
      if (!anchor) return null; // connectsTo id typo/mismatch — skip rather than crash

      return {
        id: station.id,
        from: { x: station.x, y: station.y },
        to: { x: anchor.x, y: anchor.y },
        region: station.region,
      };
    })
    .filter(Boolean);
}

const REGION_ANCHOR = {
  "new-jersey": "chelsea-piers-manhattan",
  "long-island": "bkb-queensbridge",
  "hudson-valley": "movement-harlem",
};

const REGION_DIRECTION = {
  "new-jersey": { dx: -1, dy: 0 },   // west
  "long-island": { dx: 1, dy: 0 },   // east
  "hudson-valley": { dx: 0, dy: -1 }, // north
};

const START_OFFSET = 70; // px, unzoomed — distance from anchor to the first gym
const SPACING = 55;      // px, unzoomed — distance between consecutive gyms in the same region

export function layoutOutOfMetroStations(stations) {
  const stationById = Object.fromEntries(stations.map((s) => [s.id, s]));

  const byRegion = {};
  stations.forEach((s) => {
    if (s.region && s.region !== "nyc-metro") {
      (byRegion[s.region] ??= []).push(s);
    }
  });

  return stations.map((station) => {
    if (!station.region || station.region === "nyc-metro") return station;

    const anchorId = REGION_ANCHOR[station.region];
    const anchor = stationById[anchorId];
    const direction = REGION_DIRECTION[station.region];
    if (!anchor || !direction) return station; // unrecognized region — leave untouched

    const group = byRegion[station.region];
    const index = group.indexOf(station);
    const distance = START_OFFSET + index * SPACING;

    return {
      ...station,
      x: anchor.x + direction.dx * distance,
      y: anchor.y + direction.dy * distance,
      // Force every gym in a region onto the same shared anchor, regardless
      // of whatever individual connectsTo each one has in the JSON.
      connection: { ...station.connection, connectsTo: anchorId },
    };
  });
}