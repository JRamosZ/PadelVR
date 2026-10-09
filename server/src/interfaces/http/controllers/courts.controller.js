export function createCourtsController({getCourtById, getLatestMatchForCourt, getCourtSetup}) {
  return {
    getCourt: async (request, response, next) => {
      try {
        const court = await getCourtById(request.params.courtId);
        response.json({court});
      } catch (error) {
        next(error);
      }
    },

    getLatestMatch: async (request, response, next) => {
      try {
        const result = await getLatestMatchForCourt(request.params.courtId);
        response.json(result);
      } catch (error) {
        next(error);
      }
    },

    getSetup: async (request, response, next) => {
      try {
        const result = await getCourtSetup(request.params.courtId);
        response.json(result);
      } catch (error) {
        next(error);
      }
    },
  };
}
