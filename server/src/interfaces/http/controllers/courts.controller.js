export function createCourtsController({
  getCourtById,
  getLatestMatchForCourt,
  getCourtSetup,
  getMatchForScoreboard,
  createMatch,
  listCourts,
}) {
  return {
    list: async (_request, response, next) => {
      try {
        response.json({courts: await listCourts()});
      } catch (error) {
        next(error);
      }
    },

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

    getMatchForScoreboard: async (request, response, next) => {
      try {
        const result = await getMatchForScoreboard(
          request.params.courtId,
          request.params.matchId,
        );
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

    createMatch: async (request, response, next) => {
      try {
        const match = await createMatch(request.params.courtId, request.body);
        response.status(201).json({match});
      } catch (error) {
        next(error);
      }
    },
  };
}
