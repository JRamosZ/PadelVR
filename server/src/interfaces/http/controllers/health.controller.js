export function createHealthController(getSystemHealth) {
  return async function getHealth(_request, response, next) {
    try {
      response.json(await getSystemHealth());
    } catch (error) {
      next(error);
    }
  };
}
