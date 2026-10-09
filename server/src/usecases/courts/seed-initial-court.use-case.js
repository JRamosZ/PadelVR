export function createSeedInitialCourtUseCase(courtRepository) {
  return async function seedInitialCourt() {
    const existingCourt = await courtRepository.existsAny();

    if (existingCourt) {
      return;
    }

    await courtRepository.create({
      name: "Cancha 1",
      status: "AVAILABLE",
      sensorModules: [
        {
          sensorId: "sensor-left",
          side: "LEFT",
          esp32Id: "ESP32-001",
        },
        {
          sensorId: "sensor-right",
          side: "RIGHT",
          esp32Id: "ESP32-002",
        },
      ],
    });

    console.info("Initial court seeded.");
  };
}
