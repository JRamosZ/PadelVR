import {useEffect, useState} from "react";
import {ApiError, getCourtSetup} from "../services/courtsApi.js";

export function useCourtSetup(courtId) {
  const [result, setResult] = useState({status: "loading"});

  useEffect(() => {
    const controller = new AbortController();

    async function loadSetup() {
      try {
        const data = await getCourtSetup(courtId, controller.signal);

        if (data.court.status !== "AVAILABLE") {
          setResult({status: "unavailable", court: data.court});
          return;
        }

        setResult({
          status: "ready",
          court: data.court,
          match: data.match,
        });
      } catch (error) {
        if (error.name === "AbortError") return;

        setResult({
          status: error instanceof ApiError && error.status === 404 ? "not-found" : "error",
          message:
            error instanceof ApiError && error.status === 404
              ? "No encontramos una cancha con este identificador."
              : error.message,
        });
      }
    }

    loadSetup();
    return () => controller.abort();
  }, [courtId]);

  return result;
}
