export const ACTIVE_SESSION_TIMEOUT_MS = 60000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

export const isSessionActive = (
  session,
  now = Date.now(),
  timeoutMs = ACTIVE_SESSION_TIMEOUT_MS
) => {
  if (!session || session.leave !== false) return false;
  const lastSeen = Number(session.lastSeen || session.timeStamp);
  if (!Number.isFinite(lastSeen)) return false;
  const age = now - lastSeen;
  return age <= timeoutMs && age >= -MAX_FUTURE_CLOCK_SKEW_MS;
};

export const withEffectivePresence = (session, now = Date.now()) => ({
  ...session,
  leave: session && session.data && session.data.fixture === true
    ? session.leave
    : !isSessionActive(session, now),
});
