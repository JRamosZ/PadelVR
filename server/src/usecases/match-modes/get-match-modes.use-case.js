const customMode = {
  id: "CUSTOM",
  name: "Personalizar",
  description: "Configura las reglas como prefieras.",
  icon: "settings",
  isCustomizable: true,
  features: [
    "1 o 3 sets",
    "6 juegos por set",
    "Punto decisivo, ventajas o punto de oro",
    "Tie-break, primero a 6 o diferencia de 2 juegos",
  ],
  featureTypes: ["sets", "games", "advantages", "ending"],
  format: null,
  rules: null,
};

export function createGetMatchModesUseCase(predefinedModes) {
  return async function getMatchModes() {
    return [
      ...Object.values(predefinedModes).map((mode) => ({
        ...mode,
        featureTypes: mode.featureTypes ? [...mode.featureTypes] : undefined,
        isCustomizable: false,
      })),
      {
        ...customMode,
        features: [...customMode.features],
        featureTypes: [...customMode.featureTypes],
      },
    ];
  };
}
