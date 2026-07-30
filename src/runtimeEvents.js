export const RUNTIME_EVENT = 'song-of-distance:runtime';

export const publishRuntimeEvent = (detail) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(RUNTIME_EVENT, {detail}));
};
