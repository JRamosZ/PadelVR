import assert from "node:assert/strict";
import test from "node:test";
import {createGetMatchModesUseCase} from "../get-match-modes.use-case.js";

test("returns predefined match modes and a customizable mode", async () => {
  const predefinedModes = {
    TRADITIONAL: {
      id: "TRADITIONAL",
      name: "Torneo",
      format: {setsToWin: 2},
      rules: {tieBreak: {enabled: true}},
    },
    QUICK: {
      id: "QUICK",
      name: "Rápido",
      format: {setsToWin: 1},
      rules: {tieBreak: {enabled: false}},
    },
    FRIENDLY: {
      id: "FRIENDLY",
      name: "Amistoso",
      format: {setsToWin: 1},
      rules: {tieBreak: {enabled: true}},
    },
  };
  const getMatchModes = createGetMatchModesUseCase(predefinedModes);

  const modes = await getMatchModes();

  assert.deepEqual(
    modes.map(({id}) => id),
    ["TRADITIONAL", "QUICK", "FRIENDLY", "CUSTOM"],
  );
  assert.deepEqual(modes[0].format, predefinedModes.TRADITIONAL.format);
  assert.equal(modes[3].isCustomizable, true);
  assert.equal(modes[3].format, null);
  assert.equal(modes[3].rules, null);
});
