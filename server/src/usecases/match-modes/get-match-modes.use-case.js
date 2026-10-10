const customMode = {
  id: "CUSTOM",
  name: "Personalizar",
  description: "Configura las reglas como prefieras.",
  icon: "settings",
  isCustomizable: true,
  features: [
    "Sets y games",
    "Cierre del set: tie-break, primero a 6 o diferencia de 2 juegos",
    "Puntuación: punto decisivo, ventajas ilimitadas o punto de oro",
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
