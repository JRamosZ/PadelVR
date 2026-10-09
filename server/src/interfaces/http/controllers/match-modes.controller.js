export function createMatchModesController(getMatchModes) {
  return async function getModes(_request, response, next) {
    try {
      response.json({matchModes: await getMatchModes()});
    } catch (error) {
      next(error);
    }
  };
}
