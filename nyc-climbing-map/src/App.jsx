import { useState, useMemo } from "react";
import * as d3 from "d3";

import MapLiteral from "./components/MapLiteral.jsx";
import Legend from "./components/Legend.jsx";

import { buildLinePaths } from "./utilities/buildLiteralPaths.js";
import { placeLabels, lineObstacleRects } from "./utilities/labelPlacement.js";

import { WIDTH, HEIGHT, LINE_STROKE_WIDTH } from "./constants.js";

import gymData from "./data/nyc-climbing-gyms.json";
import nycBoroughs from "./data/Borough_Boundaries_20260720.json"; 
import parksData from "./data/Parks_Properties_20260721.json"; 


export default function App() {
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(null);

  const projection = useMemo(
    () =>
      d3
        .geoMercator()
        .center([-73.94, 40.74])
        .scale(140000)
        .translate([WIDTH / 2, HEIGHT / 2]),
    []
  );

  const pathGenerator = useMemo(() => d3.geoPath(projection), [projection]);

  const stations = useMemo(
    () =>
      gymData.gyms.map((gym) => {
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
  
  const linePaths = useMemo(
    () => buildLinePaths(stations, gymData.lineSystems),
    [stations]
  );

  const flagshipParks = useMemo(
    () => parksData.features.filter((f) => f.properties.typecategory === "Flagship Park"),
    []
  );

  const stationLabelPlacement = useMemo(() => {
    const lineRects = lineObstacleRects(linePaths, LINE_STROKE_WIDTH);

    const items = stations.map((s) => ({ id: s.id, x: s.x, y: s.y }));
    const { offsets } = placeLabels(
      items,
      { labelWidth: 90, labelHeight: 14, distance: 12 },
      lineRects // <-- seeded obstacles, so labels avoid lines from the start
    );
    return offsets;
  }, [stations, linePaths]);
  
  const hoveredGym = stations.find((s) => s.id === hoveredId) ?? null;

  return (
    <div className="w-full h-screen flex flex-col bg-black">
      {/* Vignelli-poster title bar */}
      <header className="h-16 flex items-center px-6 bg-black shrink-0">
        <h1 className="text-white text-lg md:text-xl font-bold uppercase tracking-wide">
          {gymData.meta.title}
        </h1>
      </header>

      {/* Body: map canvas + legend sidebar */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex items-center justify-center bg-[#f5f0e8] overflow-auto">
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
    </div>
  );
}