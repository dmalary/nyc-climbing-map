import { useState, useMemo, useEffect } from "react";
import * as d3 from "d3";

import MapLiteral from "./components/MapLiteral.jsx";
import Legend from "./components/Legend.jsx";
import Footer from "./components/Footer.jsx";

import { buildLinePaths } from "./utilities/buildLiteralPaths.js";
import { placeLabels, lineObstacleRects } from "./utilities/labelPlacement.js";
import { WIDTH, HEIGHT, LINE_STROKE_WIDTH } from "./constants.js";

import gymData from "./data/nyc-climbing-gyms.json"; // small, keep as static import

export default function App() {
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(null);

  // Geo data now loads at runtime instead of bundling
  const [nycBoroughs, setNycBoroughs] = useState(null);
  const [parksData, setParksData] = useState(null);

  useEffect(() => {
    fetch("/data/Borough_Boundaries_20260720.json")
      .then((res) => res.json())
      .then(setNycBoroughs);

    fetch("/data/Parks_Properties_20260721.json")
      .then((res) => res.json())
      .then(setParksData);
  }, []);

  const projection = useMemo(
    () => d3.geoMercator().center([-73.94, 40.74]).scale(140000).translate([WIDTH / 2, HEIGHT / 2]),
    []
  );

  const pathGenerator = useMemo(() => d3.geoPath(projection), [projection]);

  const stations = useMemo(
    () => gymData.gyms.map((gym) => {
      const [x, y] = projection([gym.coordsGeo.lng, gym.coordsGeo.lat]);
      return { ...gym, x, y };
    }),
    [projection]
  );

  const lineLookup = useMemo(() => {
    const map = {};
    Object.entries(gymData.lineSystems).forEach(([tierId, tier]) => {
      (tier.lines ?? []).forEach((line) => {
        map[line.id] = { color: line.color, shortLabel: line.shortLabel, name: line.name, tierId };
      });
    });
    return map;
  }, []);

  const linePaths = useMemo(() => buildLinePaths(stations, gymData.lineSystems), [stations]);

  const flagshipParks = useMemo(() => {
    if (!parksData) return [];
    return parksData.features.filter((f) => f.properties.typecategory === "Flagship Park");
  }, [parksData]);

  const stationLabelPlacement = useMemo(() => {
    const lineRects = lineObstacleRects(linePaths, LINE_STROKE_WIDTH);
    const items = stations.map((s) => ({ id: s.id, x: s.x, y: s.y }));
    const { offsets } = placeLabels(items, { labelWidth: 90, labelHeight: 14, distance: 12 }, lineRects);
    return offsets;
  }, [stations, linePaths]);

  const hoveredGym = stations.find((s) => s.id === hoveredId) ?? null;

  // Boroughs are the one truly required layer — wait on that before rendering the map
  if (!nycBoroughs) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white text-sm">Loading map…</p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-black">
      <header className="h-16 flex items-center px-6 bg-black shrink-0">
        <h1 className="text-white text-2xl md:text-4xl font-medium tracking-wide">
          {gymData.meta.title}
        </h1>
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex items-center justify-center bg-[#a8c9d4] overflow-auto">
          <MapLiteral
            width={WIDTH}
            height={HEIGHT}
            boroughFeatures={nycBoroughs.features}
            parkFeatures={flagshipParks}
            pathGenerator={pathGenerator}
            stations={stations}
            hoveredId={hoveredId}
            onHoverStation={setHoveredId}
            linePaths={linePaths}
            selectedLineId={selectedLineId}
            lineLookup={lineLookup}
            stationLabelPlacement={stationLabelPlacement}
          />
        </div>

        <Legend
          lineSystems={gymData.lineSystems}
          description={gymData.meta.description}
          selectedLineId={selectedLineId}
          onSelectLine={setSelectedLineId}
        />
      </div>
      <Footer />
    </div>
  );
}