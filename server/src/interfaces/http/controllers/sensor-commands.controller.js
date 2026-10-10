export function createSensorCommandsController(recordSensorCommand) {
  return {
    record: async (request, response, next) => {
      try {
        const result = await recordSensorCommand(request.body);
        response.status(200).json({
          accepted: true,
          ...result,
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
