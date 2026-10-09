const customMode = {
  id: "CUSTOM",
  name: "Personalizar",
  description: "Configura las reglas como prefieras.",
  icon: "settings",
  isCustomizable: true,
  features: [
    "Sets y games",
    "Tie-break (opcional)",
    "Ventaja / Punto de oro (opcional)",
  ],
  format: null,
  rules: null,
};

export function createGetMatchModesUseCase(predefinedModes) {
  return async function getMatchModes() {
    return [
      ...Object.values(predefinedModes).map((mode) => ({
        ...mode,
        isCustomizable: false,
      })),
      {...customMode, features: [...customMode.features]},
    ];
  };
}
