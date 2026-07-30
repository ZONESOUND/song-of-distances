import {
  calcLayerFromDistance,
  calcRadarAngle,
  coordinateForLayer,
  didRadarCross,
  projectGpsPoint,
} from './spatialRules';

const CENTER = {lat: 25.033, lon: 121.5654};
const GLOBAL_SCALE = 250000;
const GLOBAL_POW = 0.58;

it('places deterministic fixture coordinates on all nine legacy layers', () => {
  for (let layer = 1; layer <= 9; layer += 1) {
    const angle = layer * 0.61;
    const coordinate = coordinateForLayer(
      CENTER,
      layer,
      angle,
      GLOBAL_SCALE,
      GLOBAL_POW
    );
    const projected = projectGpsPoint(
      coordinate,
      CENTER,
      GLOBAL_SCALE,
      GLOBAL_POW
    );
    const resolvedLayer = calcLayerFromDistance(
      projected.distance,
      GLOBAL_SCALE,
      GLOBAL_POW
    );
    expect(resolvedLayer).toBeCloseTo(layer, 8);
  }
});

it('preserves radar frame angles and ignores the wraparound jump', () => {
  const speed = 0.5 / 2 * Math.PI;
  expect(calcRadarAngle(speed, 0)).toBeCloseTo(-Math.PI, 8);
  expect(calcRadarAngle(speed, 120)).toBeCloseTo(-Math.PI / 2, 8);
  expect(calcRadarAngle(speed, 240)).toBeCloseTo(0, 8);
  expect(calcRadarAngle(speed, 360)).toBeCloseTo(Math.PI / 2, 8);

  const beforeWrap = calcRadarAngle(speed, 480);
  const afterWrap = calcRadarAngle(speed, 481);
  expect(didRadarCross(beforeWrap, afterWrap, 0)).toBe(false);
  expect(didRadarCross(-0.02, 0.02, 0)).toBe(true);
});
