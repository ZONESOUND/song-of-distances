export const DORIAN_SCALE = ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'];
export const DEFAULT_NOTE_COUNT = 9;

export const clampNoteIndex = (index, noteCount = DEFAULT_NOTE_COUNT) =>
  Math.max(Math.min(index, noteCount - 1), 0);

export const scaleNumber = (
  ceiledLayer,
  randomValue,
  noteCount = DEFAULT_NOTE_COUNT
) => clampNoteIndex(
  Math.floor(ceiledLayer + Math.floor(randomValue * 3) - 1) - 1,
  noteCount
);

export const getDorianNote = (
  index,
  scale = DORIAN_SCALE,
  octaveStart = 2,
  octaveMax = 5
) => {
  const scaleLength = scale.length;
  return scale[index % scaleLength] +
    Math.min(octaveMax, Math.floor(octaveStart + index / scaleLength));
};

export const resolveSoundEvent = (data, randomValue) => {
  const ceiledLayer = Math.ceil(data.layer);
  const layerIndex = scaleNumber(ceiledLayer, randomValue);
  return {
    ceiledLayer,
    layerIndex,
    note: getDorianNote(layerIndex),
    distanceScalar: Math.max(0.5, ceiledLayer - data.layer),
    sourceType: data.leave === true ? 'history' : 'current',
  };
};
