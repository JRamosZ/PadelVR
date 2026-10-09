import {useEffect, useState} from "react";
import {ApiError, getMatchModes} from "../services/courtsApi.js";

export function useMatchModes() {
  const [state, setState] = useState({status: "loading", modes: []});

  useEffect(() => {
    const controller = new AbortController();

    getMatchModes(controller.signal)
      .then(({matchModes}) => {
        if (!Array.isArray(matchModes) || matchModes.length === 0) {
          throw new ApiError("No hay modos de juego disponibles.", 500);
        }

        setState({status: "ready", modes: matchModes});
      })
      .catch((error) => {
        if (error.name === "AbortError") return;

        setState({
          status: "error",
          modes: [],
          message: error.message,
        });
      });

    return () => controller.abort();
  }, []);

  return state;
}
