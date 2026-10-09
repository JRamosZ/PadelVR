export class ApiError extends Error {
  constructor(message, status, details = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = details.code;
    this.activeMatch = details.activeMatch;
  }
}

async function requestJson(url, signal, options = {}) {
  const response = await fetch(url, {...options, signal});
  let data;

  try {
    data = await response.json();
  } catch {
    throw new ApiError("El servidor devolvió una respuesta inválida.", response.status);
  }

  if (!response.ok) {
    throw new ApiError(
      data.error || "No se pudo completar la solicitud.",
      response.status,
      data,
    );
  }

  return data;
}

export function getCourtSetup(courtId, signal) {
  return requestJson(`/api/courts/${encodeURIComponent(courtId)}/setup`, signal);
}

export function getApiHealth(signal) {
  return requestJson("/api/health", signal);
}

export function getMatchModes(signal) {
  return requestJson("/api/match-modes", signal);
}

export function createMatch(courtId, matchData, signal) {
  return requestJson(
    `/api/courts/${encodeURIComponent(courtId)}/matches`,
    signal,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(matchData),
    },
  );
}
