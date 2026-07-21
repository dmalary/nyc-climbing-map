import { useMemo, useRef, useState, useEffect } from "react";
import { Delaunay } from "d3";
import * as d3 from "d3";
import Tooltip from "./Tooltip.jsx";

export default function MapLiteral({
  width,
  height,
  boroughFeatures,
  pathGenerator,
  stations,
  hoveredId,
  onHoverStation,
  linePaths,
}) {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  const INITIAL_ZOOM_SCALE = 1.4;

useEffect(() => {
  const svg = d3.select(svgRef.current);
  const zoomBehavior = d3
    .zoom()
    .scaleExtent([1.4, 8])
    .translateExtent([[0, 0], [width, height]])
    .on("zoom", (event) => setTransform(event.transform));

  svg.call(zoomBehavior);

  // Program the initial zoom state — centered on the canvas midpoint at
  // INITIAL_ZOOM_SCALE, rather than starting at the identity (scale 1).
  const initialTransform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(INITIAL_ZOOM_SCALE)
    .translate(-width / 2, -height / 2);

  svg.call(zoomBehavior.transform, initialTransform);

  return () => svg.on(".zoom", null);
}, [width, height]);

  const voronoi = useMemo(() => {
    const delaunay = Delaunay.from(stations, (d) => d.x, (d) => d.y);
    return delaunay.voronoi([0, 0, width, height]);
  }, [stations, width, height]);

  const hoveredStation = stations.find((s) => s.id === hoveredId) ?? null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full touch-none" // touch-none prevents scroll-jank on mobile pinch
    >
      <rect x={0} y={0} width={width} height={height} fill="#f5f0e8" />

      {/* Everything zoomable lives inside this single transformed group */}
      <g transform={transform.toString()}>
        <g className="boroughs">
          {boroughFeatures.map((feature, i) => (
            <path
              key={i}
              d={pathGenerator(feature)}
              fill="#e8e2d4"
              stroke="#d4cbb8"
              strokeWidth={1 / transform.k} // keep stroke visually constant weight as you zoom in
            />
          ))}
        </g>

        <g className="lines">
          {linePaths.map((line) => (
            <g key={line.id}>
              <path
                d={line.d}
                fill="none"
                stroke={line.color}
                strokeWidth={4 / transform.k}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
            </g>
          ))}
        </g>

        <g className="stations" style={{ pointerEvents: "none" }}>
          {stations.map((station) => {
            const isInterchange = station.lines.length > 1;
            const isHovered = station.id === hoveredId;
            const { dx, dy } = station.labelOffset ?? { dx: 10, dy: 4 };

            return (
              <g key={station.id} transform={`translate(${station.x}, ${station.y})`}>
                {isInterchange ? (
                  <rect
                    x={-8} y={-8} width={8} height={8} rx={8}
                    fill="white" stroke="black"
                    strokeWidth={isHovered ? 2 : 1.2}
                    style={{ transition: "stroke-width 150ms ease" }}
                  />
                ) : (
                  <circle
                    r={isHovered ? 8 : 6}
                    fill="black"
                    style={{ transition: "r 150ms ease" }}
                  />
                )}

                <text
                  x={dx}
                  y={dy}
                  fontSize={11 / transform.k} // keep label size visually constant too
                  fontFamily='"Helvetica Neue", Helvetica, Arial, sans-serif'
                  fill="#111"
                >
                  {station.name}
                </text>
              </g>
            );
          })}
        </g>

        <g className="hit-regions">
          {stations.map((station, i) => (
            <path
              key={station.id}
              d={voronoi.renderCell(i)}
              fill="transparent"
              onMouseEnter={() => onHoverStation(station.id)}
              onMouseLeave={() => onHoverStation(null)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </g>

        {hoveredStation && (
          <Tooltip
            station={hoveredStation}
            width={width}
            height={height}
            scale={transform.k}
          />
        )}
      </g>
    </svg>
  );
}