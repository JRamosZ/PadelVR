export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function requestJson(url, signal) {
  const response = await fetch(url, {signal});
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
