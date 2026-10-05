import Court from "../models/court.model.js";

export async function seedCourts() {
  const existingCourt = await Court.exists({});

  if (existingCourt) {
    return;
  }

  await Court.create({
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
}
