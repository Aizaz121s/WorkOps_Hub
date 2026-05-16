export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function displayTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function hoursBetween(startIso?: string | null, endIso?: string | null) {
  if (!startIso || !endIso) return null;
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;
  return Math.round((diffMs / 1000 / 60 / 60) * 100) / 100;
}
