import mongoose from "mongoose";

const {Schema, model} = mongoose;

const SIDES = ["A", "B"];

// ---------- JUGADORES Y EQUIPOS ----------

const playerSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    photo: {
      type: String,
      default: "",
      maxlength: 1400000,
    },
  },
  {_id: false},
);

const teamSchema = new Schema(
  {
    id: {
      type: String,
      enum: SIDES,
      required: true,
    },
    players: {
      type: [playerSchema],
      required: true,
      validate: {
        validator: (players) => players.length === 2,
        message: "Cada equipo debe tener exactamente dos jugadores.",
      },
    },
  },
  {_id: false},
);

// ---------- FORMATO DEL PARTIDO ----------

const formatSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["BEST_OF_THREE", "SINGLE_SET"],
      default: "BEST_OF_THREE",
      required: true,
    },
    setsToWin: {
      type: Number,
      enum: [1, 2],
      default: 2,
      required: true,
    },
    gamesToWinSet: {
      type: Number,
      enum: [6],
      default: 6,
      required: true,
    },
  },
  {_id: false},
);

// ---------- REGLAS ----------

const rulesSchema = new Schema(
  {
    scoringStrategy: {
      type: String,
      enum: ["ADVANTAGE", "NO_AD", "STAR_POINT"],
      default: "STAR_POINT",
      required: true,
    },

    advantagesBeforeStarPoint: {
      type: Number,
      enum: [1, 2],
      default() {
        return this.scoringStrategy === "STAR_POINT" ? 2 : undefined;
      },
      required() {
        return this.scoringStrategy === "STAR_POINT";
      },
    },

    setEndingStrategy: {
      type: String,
      enum: ["TIE_BREAK", "FIRST_TO_SIX", "TWO_GAME_LEAD"],
      default: "TIE_BREAK",
      required: true,
    },

    tieBreak: {
      triggerAtGames: {
        type: Number,
        enum: [6],
        default: 6,
        required: true,
      },
      pointsToWin: {
        type: Number,
        enum: [7],
        default: 7,
        required: true,
      },
      winByPoints: {
        type: Number,
        enum: [2],
        default: 2,
        required: true,
      },
    },

    sideChange: {
      enabled: {
        type: Boolean,
        default: true,
        required: true,
      },
      // Defines the supported end-change policy for the Match Engine.
      policy: {
        type: String,
        enum: ["STANDARD"],
        default: "STANDARD",
        required: true,
      },
    },
  },
  {_id: false},
);

// ---------- ESTRUCTURAS DEL MARCADOR ----------

const teamScoreSchema = new Schema(
  {
    A: {type: Number, min: 0, default: 0, required: true},
    B: {type: Number, min: 0, default: 0, required: true},
  },
  {_id: false},
);

const pointOpportunitySchema = new Schema(
  {
    played: {
      type: teamScoreSchema,
      default: () => ({}),
      required: true,
    },
    won: {
      type: teamScoreSchema,
      default: () => ({}),
      required: true,
    },
  },
  {_id: false},
);

const statisticsSchema = new Schema(
  {
    pointsWon: {
      type: teamScoreSchema,
      default: () => ({}),
      required: true,
    },
    breakPoints: {
      type: pointOpportunitySchema,
      default: () => ({}),
      required: true,
    },
    starPoints: {
      type: pointOpportunitySchema,
      default: () => ({}),
      required: true,
    },
  },
  {_id: false},
);

const gamePointSchema = new Schema(
  {
    A: {
      type: String,
      enum: ["0", "15", "30", "40", "AD1", "AD2", "SP"],
      default: "0",
      required: true,
    },
    B: {
      type: String,
      enum: ["0", "15", "30", "40", "AD1", "AD2", "SP"],
      default: "0",
      required: true,
    },
  },
  {_id: false},
);

const serverSchema = new Schema(
  {
    team: {
      type: String,
      enum: SIDES,
      required: true,
    },
    playerId: {
      type: String,
      required: true,
    },
  },
  {_id: false},
);

const currentGameSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["REGULAR", "TIEBREAK"],
      default: "REGULAR",
      required: true,
    },

    points: {
      type: gamePointSchema,
      required: true,
    },

    tieBreakPoints: {
      type: teamScoreSchema,
      default: null,
    },
    advantagesPlayed: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    tieBreakFirstServer: {
      type: String,
      enum: ["A-1", "A-2", "B-1", "B-2"],
      default: null,
    },
  },
  {_id: false},
);

const currentSetSchema = new Schema(
  {
    number: {
      type: Number,
      min: 1,
      max: 3,
      required: true,
    },
    games: {
      type: teamScoreSchema,
      required: true,
    },
  },
  {_id: false},
);

// ---------- HISTORIAL DE SETS ----------

const completedSetSchema = new Schema(
  {
    number: {
      type: Number,
      min: 1,
      max: 3,
      required: true,
    },
    games: {
      type: teamScoreSchema,
      required: true,
    },
    tieBreakPoints: {
      type: teamScoreSchema,
      default: null,
    },
    winner: {
      type: String,
      enum: SIDES,
      required: true,
    },
  },
  {_id: false},
);

// ---------- ESTADO DEL PARTIDO ----------

const matchStateSchema = new Schema(
  {
    setsWon: {
      type: teamScoreSchema,
      required: true,
    },

    currentSet: {
      type: currentSetSchema,
      required: true,
    },

    currentGame: {
      type: currentGameSchema,
      required: true,
    },

    statistics: {
      type: statisticsSchema,
      default: () => ({}),
      required: true,
    },

    server: {
      type: serverSchema,
      required: true,
    },

    serviceOrder: {
      type: [{type: String, enum: ["A-1", "A-2", "B-1", "B-2"]}],
      default: () => ["A-1", "B-1", "A-2", "B-2"],
      required: true,
      validate: {
        validator: (order) =>
          order.length === 4 && new Set(order).size === 4,
        message: "La rotación de saque debe incluir a los cuatro jugadores una vez.",
      },
    },

    undoHistory: {
      type: [Schema.Types.Mixed],
      default: [],
    },

    // Indica si ya se realizó el cambio de lado
    // correspondiente al estado actual.
    sideChange: {
      enabled: {
        type: Boolean,
        required: true,
      },
      currentSides: {
        A: {
          type: String,
          enum: ["LEFT", "RIGHT"],
          required: true,
        },
        B: {
          type: String,
          enum: ["LEFT", "RIGHT"],
          required: true,
        },
      },
      pending: {
        type: Boolean,
        default: false,
        required: true,
      },
    },
  },
  {_id: false},
);

// ---------- DOCUMENTO PRINCIPAL ----------

const matchSchema = new Schema(
  {
    courtId: {
      type: Schema.Types.ObjectId,
      ref: "Court",
      required: true,
    },

    status: {
      type: String,
      enum: ["READY", "IN_PROGRESS", "PAUSED", "FINISHED", "CANCELLED"],
      default: "READY",
      required: true,
    },

    revision: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },

    format: {
      type: formatSchema,
      default: () => ({}),
      required: true,
    },

    rules: {
      type: rulesSchema,
      default: () => ({}),
      required: true,
    },

    teams: {
      type: [teamSchema],
      required: true,
      validate: {
        validator: (teams) => teams.length === 2 && SIDES.every((side) => teams.some((team) => team.id === side)),
        message: "El partido debe tener los equipos A y B.",
      },
    },

    state: {
      type: matchStateSchema,
      required: true,
    },

    history: {
      completedSets: {
        type: [completedSetSchema],
        default: [],
      },
    },

    startedAt: {
      type: Date,
      default: null,
    },

    finishedAt: {
      type: Date,
      default: null,
    },
  },
  {timestamps: true},
);

matchSchema.pre("init", function migrateLegacyScoringRules(document) {
  const rules = document.rules;
  if (!rules) return;

  if (!rules.scoringStrategy && rules.gameScoring) {
    if (
      rules.gameScoring === "NO_AD" ||
      (rules.starPoint?.enabled && rules.starPoint.advantagesBeforeStarPoint === 0)
    ) {
      rules.scoringStrategy = "NO_AD";
    } else if (rules.starPoint?.enabled) {
      rules.scoringStrategy = "STAR_POINT";
      rules.advantagesBeforeStarPoint = rules.starPoint.advantagesBeforeStarPoint;
    } else {
      rules.scoringStrategy = "ADVANTAGE";
    }

    delete rules.gameScoring;
    delete rules.starPoint;
  }

  if (!rules.setEndingStrategy && rules.tieBreak) {
    rules.setEndingStrategy = rules.tieBreak.enabled ? "TIE_BREAK" : "TWO_GAME_LEAD";
    delete rules.tieBreak.enabled;
  }
});

const Match = model("Match", matchSchema);

export default Match;
