const INITIAL_COURT_ID = "6ac972ff5813587ea2796fe0"; // Replace with the desired initial court ID

export function createSeedInitialCourtUseCase(courtRepository) {
  return async function seedInitialCourt() {
    const existingCourt = await courtRepository.existsAny();

    if (existingCourt) {
      return;
    }

    await courtRepository.create({
      _id: INITIAL_COURT_ID,
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
