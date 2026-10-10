const matchModes = {
  TRADITIONAL: {
    id: "TRADITIONAL",
    name: "Profesional",
    description: "Ideal para partidos competitivos y torneos.",
    icon: "trophy",
    features: [
      "3 sets",
      "6 juegos por set",
      "Ventajas y punto de oro tras 2 ventajas",
      "Tie-break en 6-6",
    ],
    featureTypes: ["sets", "games", "advantages", "ending"],
    format: {
      type: "BEST_OF_THREE",
      setsToWin: 2,
      gamesToWinSet: 6,
    },
    rules: {
      scoringStrategy: "STAR_POINT",
      advantagesBeforeStarPoint: 2,
      setEndingStrategy: "TIE_BREAK",
      tieBreak: {
        triggerAtGames: 6,
        pointsToWin: 7,
        winByPoints: 2,
      },
      sideChange: {
        enabled: true,
        policy: "STANDARD",
      },
    },
  },
  QUICK: {
    id: "QUICK",
    name: "Rápido",
    description: "Perfecto para partidos casuales o de práctica.",
    icon: "lightning",
    features: [
      "1 set",
      "6 juegos por set",
      "Sin ventajas (punto decisivo)",
      "Primero en llegar a 6 juegos (sin tie-break)",
    ],
    featureTypes: ["sets", "games", "advantages", "ending"],
    format: {
      type: "SINGLE_SET",
      setsToWin: 1,
      gamesToWinSet: 6,
    },
    rules: {
      scoringStrategy: "NO_AD",
      setEndingStrategy: "FIRST_TO_SIX",
      tieBreak: {
        triggerAtGames: 6,
        pointsToWin: 7,
        winByPoints: 2,
      },
      sideChange: {
        enabled: true,
        policy: "STANDARD",
      },
    },
  },
  FRIENDLY: {
    id: "FRIENDLY",
    name: "Amistoso",
    description: "Disfruta del juego sin presión.",
    icon: "players",
    features: [
      "1 set",
      "6 juegos por set",
      "Ventajas ilimitadas",
      "Sin tie-break; gana con 2 juegos de diferencia",
    ],
    featureTypes: ["sets", "games", "advantages", "ending"],
    format: {
      type: "SINGLE_SET",
      setsToWin: 1,
      gamesToWinSet: 6,
    },
    rules: {
      scoringStrategy: "ADVANTAGE",
      setEndingStrategy: "TWO_GAME_LEAD",
      tieBreak: {
        triggerAtGames: 6,
        pointsToWin: 7,
        winByPoints: 2,
      },
      sideChange: {
        enabled: true,
        policy: "STANDARD",
      },
    },
  },
};

export default matchModes;
