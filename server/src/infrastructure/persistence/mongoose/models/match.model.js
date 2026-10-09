import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const teamSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      enum: ["A", "B"],
      required: true,
    },
    players: {
      type: [playerSchema],
      required: true,
    },
  },
  { _id: false },
);

const matchSchema = new mongoose.Schema({
  courtId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Court",
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  format: {
    type: new mongoose.Schema(
      {
        type: {
          type: String,
          required: true,
        },
        setsToWin: {
          type: Number,
          required: true,
          min: 1,
        },
      },
      { _id: false },
    ),
    required: true,
  },
  rules: {
    type: new mongoose.Schema(
      {
        gamesPerSet: {
          type: Number,
          required: true,
          min: 1,
        },
        tieBreak: {
          type: Boolean,
          required: true,
        },
        advantage: {
          type: Boolean,
          required: true,
        },
        goldenPoint: {
          type: Boolean,
          required: true,
        },
        sideChange: {
          type: Boolean,
          required: true,
        },
      },
      { _id: false },
    ),
    required: true,
  },
  teams: {
    type: [teamSchema],
    required: true,
  },
  score: {
    type: new mongoose.Schema(
      {
        sets: {
          type: new mongoose.Schema(
            {
              A: { type: Number, required: true, min: 0 },
              B: { type: Number, required: true, min: 0 },
            },
            { _id: false },
          ),
          required: true,
        },
        currentSet: {
          type: new mongoose.Schema(
            {
              A: { type: Number, required: true, min: 0 },
              B: { type: Number, required: true, min: 0 },
            },
            { _id: false },
          ),
          required: true,
        },
        currentGame: {
          type: new mongoose.Schema(
            {
              A: { type: mongoose.Schema.Types.Mixed, required: true },
              B: { type: mongoose.Schema.Types.Mixed, required: true },
            },
            { _id: false },
          ),
          required: true,
        },
      },
      { _id: false },
    ),
    required: true,
  },
  server: {
    type: new mongoose.Schema(
      {
        team: {
          type: String,
          enum: ["A", "B"],
          required: true,
        },
        player: {
          type: Number,
          required: true,
          min: 0,
          validate: Number.isInteger,
        },
      },
      { _id: false },
    ),
    required: true,
  },
  currentSetNumber: {
    type: Number,
    required: true,
    min: 1,
    validate: Number.isInteger,
  },
  startedAt: {
    type: Date,
    required: true,
  },
  finishedAt: {
    type: Date,
    default: null,
  },
});

const Match = mongoose.model("Match", matchSchema);

export default Match;