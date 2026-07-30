import {getDorianNote, resolveSoundEvent, scaleNumber} from './soundRules';

it('preserves the nine-note C Dorian collection', () => {
  expect(Array.from({length: 9}, (_, index) => getDorianNote(index))).toEqual([
    'C2', 'D2', 'Eb2', 'F2', 'G2', 'A2', 'Bb2', 'C3', 'D3',
  ]);
});

it('preserves the random adjacent-layer mapping and clamps the edges', () => {
  expect([0, 0.34, 0.67].map((random) => scaleNumber(5, random))).toEqual([3, 4, 5]);
  expect([0, 0.34, 0.67].map((random) => scaleNumber(1, random))).toEqual([0, 0, 1]);
  expect([0, 0.34, 0.67].map((random) => scaleNumber(8, random))).toEqual([6, 7, 8]);
});

it('only treats the boolean true leave flag as history', () => {
  expect(resolveSoundEvent({layer: 4.25, leave: true}, 0.34)).toMatchObject({
    layerIndex: 4,
    note: 'G2',
    distanceScalar: 0.75,
    sourceType: 'history',
  });
  expect(resolveSoundEvent({layer: 4.25, leave: false}, 0.34).sourceType).toBe('current');
  expect(resolveSoundEvent({layer: 4.25}, 0.34).sourceType).toBe('current');
  expect(resolveSoundEvent({layer: 4.25, leave: 'true'}, 0.34).sourceType).toBe('current');
});
