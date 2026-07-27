import { useState, useMemo, useEffect } from "react";
import * as d3 from "d3";

import MapLiteral from "./components/MapLiteral.jsx";
import Legend from "./components/Legend.jsx";
import Footer from "./components/Footer.jsx";
import MobileToolTip from "./components/MobileToolTip.jsx";

import { buildLinePaths } from "./utilities/buildLiteralPaths.js";
import { placeLabels, lineObstacleRects } from "./utilities/labelPlacement.js";
import { useIsMobile } from "./utilities/useIsMobile.js";
import { WIDTH, HEIGHT, LINE_STROKE_WIDTH } from "./constants.js";

import gymData from "./data/nyc-climbing-gyms.json"; // small, keep as static import

export default function App() {
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(null);

  // Geo data now loads at runtime instead of bundling
  const [nycBoroughs, setNycBoroughs] = useState(null);
  const [parksData, setParksData] = useState(null);

  const [tappedId, setTappedId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch("/data/Borough_Boundaries_20260720.json")
      .then((res) => res.json())
      .then(setNycBoroughs);

    fetch("/data/nyc-flagship-parks.json")
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

  const flagshipParks = parksData?.features ?? [];

  const stationLabelPlacement = useMemo(() => {
    const lineRects = lineObstacleRects(linePaths, LINE_STROKE_WIDTH);
    const items = stations.map((s) => ({ id: s.id, x: s.x, y: s.y }));
    const { offsets } = placeLabels(items, { labelWidth: 90, labelHeight: 14, distance: 12 }, lineRects);
    return offsets;
  }, [stations, linePaths]);

  const hoveredGym = stations.find((s) => s.id === hoveredId) ?? null;

  const tappedStation = stations.find((s) => s.id === tappedId) ?? null;

  // Boroughs are the one truly required layer — wait on that before rendering the map
  if (!nycBoroughs) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white text-sm">Loading map…</p>
      </div>
    );
  }

  return (
    <div className="w-full h-dvh flex flex-col bg-black">
      <header className="h-20 flex items-end justify-between px-8 pb-5 bg-black shrink-0">
        <h1 className="text-white text-2xl md:text-4xl font-medium tracking-wide">
          {gymData.meta.title}
        </h1>
        {isMobile && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-white text-2xl pb-1"
            aria-label="Open legend"
          >
            ☰
          </button>
        )}
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
            isMobile={isMobile}
            onTapStation={setTappedId}
          />
        </div>

        {!isMobile && (
          <Legend
            lineSystems={gymData.lineSystems}
            description={gymData.meta.description}
            selectedLineId={selectedLineId}
            onSelectLine={setSelectedLineId}
          />
        )}
      </div>

      {/* mobile legend drawer */}
      {isMobile && drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="w-80 max-w-[85vw] bg-white overflow-y-auto">
            <button onClick={() => setDrawerOpen(false)} className="p-4 text-xl" aria-label="Close">
              ✕
            </button>
            <Legend
              lineSystems={gymData.lineSystems}
              description={gymData.meta.description}
              selectedLineId={selectedLineId}
              onSelectLine={setSelectedLineId}
            />
          </div>
        </div>
      )}

      {/* mobile tap-to-open sheet */}
      {isMobile && tappedStation && (
        <MobileToolTip station={tappedStation} lineLookup={lineLookup} onClose={() => setTappedId(null)} />
      )}
      <Footer />
    </div>
  );
}