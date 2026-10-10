import assert from "node:assert/strict";
import test from "node:test";
import matchModes from "../../../config/matchModes.js";
import {createGetMatchModesUseCase} from "../get-match-modes.use-case.js";

test("returns predefined match modes and a customizable mode", async () => {
  const predefinedModes = {
    TRADITIONAL: {
      id: "TRADITIONAL",
      name: "Profesional",
      format: {setsToWin: 2},
      rules: {setEndingStrategy: "TIE_BREAK"},
    },
    QUICK: {
      id: "QUICK",
      name: "Rápido",
      format: {setsToWin: 1},
      rules: {setEndingStrategy: "FIRST_TO_SIX"},
    },
    FRIENDLY: {
      id: "FRIENDLY",
      name: "Amistoso",
      format: {setsToWin: 1},
      rules: {setEndingStrategy: "TWO_GAME_LEAD"},
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

test("includes a readable scoring strategy in each selectable mode", async () => {
  const getMatchModes = createGetMatchModesUseCase(matchModes);
  const modes = await getMatchModes();

  assert.ok(modes[0].features.includes("Ventajas y punto de oro tras 2 ventajas"));
  assert.ok(modes[0].features.includes("Tie-break en 6-6"));
  assert.ok(modes[1].features.includes("Primero en llegar a 6 juegos (sin tie-break)"));
  assert.ok(modes[2].features.includes("Sin tie-break; gana con 2 juegos de diferencia"));
  assert.equal(modes[0].rules.setEndingStrategy, "TIE_BREAK");
  assert.equal(modes[1].rules.setEndingStrategy, "FIRST_TO_SIX");
  assert.equal(modes[2].rules.setEndingStrategy, "TWO_GAME_LEAD");
  assert.deepEqual(modes[3].features, [
    "1 o 3 sets",
    "6 juegos por set",
    "Punto decisivo, ventajas o punto de oro",
    "Tie-break, primero a 6 o diferencia de 2 juegos",
  ]);
});

test("assigns consistent feature icon categories to every match mode", async () => {
  const getMatchModes = createGetMatchModesUseCase(matchModes);
  const modes = await getMatchModes();

  for (const mode of modes) {
    assert.equal(mode.features.length, mode.featureTypes.length);
  }
  assert.deepEqual(modes[0].featureTypes, [
    "sets",
    "games",
    "advantages",
    "ending",
  ]);
  assert.deepEqual(modes[3].featureTypes, [
    "sets",
    "games",
    "advantages",
    "ending",
  ]);
});
