const matchModes = {
  TRADITIONAL: {
    id: "TRADITIONAL",
    name: "Torneo",
    description: "Ideal para partidos competitivos y torneos.",
    icon: "trophy",
    features: ["3 sets", "6 juegos por set", "Tie-break en 6-6"],
    format: {
      type: "BEST_OF_THREE",
      setsToWin: 2,
      gamesToWinSet: 6,
    },
    rules: {
      gameScoring: "PREMIER",
      starPoint: {
        enabled: true,
        advantagesBeforeStarPoint: 2,
      },
      tieBreak: {
        enabled: true,
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
    features: ["1 set", "6 juegos por set", "Sin tie-break"],
    format: {
      type: "SINGLE_SET",
      setsToWin: 1,
      gamesToWinSet: 6,
    },
    rules: {
      gameScoring: "NO_AD",
      starPoint: {
        enabled: false,
        advantagesBeforeStarPoint: 0,
      },
      tieBreak: {
        enabled: false,
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
    features: ["1 set", "6 juegos por set", "Con tie-break"],
    format: {
      type: "SINGLE_SET",
      setsToWin: 1,
      gamesToWinSet: 6,
    },
    rules: {
      gameScoring: "PREMIER",
      starPoint: {
        enabled: false,
        advantagesBeforeStarPoint: 0,
      },
      tieBreak: {
        enabled: true,
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
