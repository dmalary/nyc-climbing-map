import { Delaunay } from "d3";

// Priority order matches standard map-labeling convention: right first,
// then diagonals, then left/up/down as fallbacks.
const CANDIDATE_DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: 1, dy: -0.6 },
  { dx: 1, dy: 0.6 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: -0.6 },
  { dx: -1, dy: 0.6 },
];

function rectsOverlap(a, b) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

// items: [{ id, x, y }]. Returns { [id]: { dx, dy } } — an offset per item,
// biased away from its nearest neighbor and checked against already-placed
// label rectangles so nothing overlaps.
export function placeLabels(items, { labelWidth, labelHeight, distance = 12 }, existingRects = []) {
  const delaunay = Delaunay.from(items, (d) => d.x, (d) => d.y);
  const placed = [...existingRects];
  const results = {};

  items.forEach((item, i) => {
    // nearest neighbor via Delaunay's triangulation — cheaper and more
    // "true nearest" than a naive all-pairs scan once you have many items
    const neighborIndices = [...delaunay.neighbors(i)];
    let nearest = null;
    let nearestDist = Infinity;
    neighborIndices.forEach((ni) => {
      const other = items[ni];
      const d = Math.hypot(other.x - item.x, other.y - item.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = other;
      }
    });

    let awayDx = 1, awayDy = 0;
    if (nearest) {
      const dx = item.x - nearest.x;
      const dy = item.y - nearest.y;
      const len = Math.hypot(dx, dy) || 1;
      awayDx = dx / len;
      awayDy = dy / len;
    }

    const sortedCandidates = [...CANDIDATE_DIRECTIONS].sort(
      (a, b) => (b.dx * awayDx + b.dy * awayDy) - (a.dx * awayDx + a.dy * awayDy)
    );

    let chosen = null;
    for (const dir of sortedCandidates) {
      const len = Math.hypot(dir.dx, dir.dy) || 1;
      const cx = item.x + (dir.dx / len) * distance;
      const cy = item.y + (dir.dy / len) * distance;
      const rect = { x: cx - labelWidth / 2, y: cy - labelHeight / 2, w: labelWidth, h: labelHeight };

      if (!placed.some((p) => rectsOverlap(rect, p))) {
        chosen = { dx: cx - item.x, dy: cy - item.y, rect };
        break;
      }
    }

    if (!chosen) {
      // nothing was collision-free — fall back to the best-scoring direction anyway
      const dir = sortedCandidates[0];
      const len = Math.hypot(dir.dx, dir.dy) || 1;
      const cx = item.x + (dir.dx / len) * distance;
      const cy = item.y + (dir.dy / len) * distance;
      chosen = { dx: cx - item.x, dy: cy - item.y, rect: { x: cx - labelWidth / 2, y: cy - labelHeight / 2, w: labelWidth, h: labelHeight } };
    }

    placed.push(chosen.rect);
    results[item.id] = { dx: chosen.dx, dy: chosen.dy };
  });

  return { offsets: results, rects: placed };
}

// Converts a line's sampled points into small rectangles representing the
// stroke's footprint, so label placement can treat the path itself as an
// obstacle, same as it already treats other labels.
export function lineObstacleRects(linePaths, strokeWidth, sampleStride = 4) {
  const rects = [];
  linePaths.forEach((line) => {
    line.points.forEach((pt, i) => {
      if (i % sampleStride !== 0) return; // don't need every single sample point
      rects.push({
        x: pt.x - strokeWidth / 2,
        y: pt.y - strokeWidth / 2,
        w: strokeWidth,
        h: strokeWidth,
      });
    });
  });
  return rects;
}