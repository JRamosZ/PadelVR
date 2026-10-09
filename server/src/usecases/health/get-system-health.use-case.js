export function createGetSystemHealthUseCase(healthRepository) {
  return async function getSystemHealth() {
    return {
      status: "ok",
      database: await healthRepository.getDatabaseStatus(),
    };
  };
}
