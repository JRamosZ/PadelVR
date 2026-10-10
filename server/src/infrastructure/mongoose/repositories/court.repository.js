import CourtModel from "../models/court.model.js";

export function createCourtRepository() {
  return {
    async findAll() {
      const courts = await CourtModel.find({})
        .select("_id name status")
        .sort({name: 1, _id: 1})
        .lean();

      return courts.map((court) => ({
        id: court._id.toString(),
        name: court.name,
        status: court.status,
      }));
    },

    async findById(courtId) {
      const court = await CourtModel.findById(courtId)
        .select("_id name status")
        .lean();

      if (!court) return null;

      return {
        id: court._id.toString(),
        name: court.name,
        status: court.status,
      };
    },

    async findBySensorId(sensorId, session) {
      let query = CourtModel.find({"sensorModules.sensorId": sensorId})
        .select("_id name status sensorModules")
        .lean();
      if (session) query = query.session(session);
      const courts = await query;

      return courts.map((court) => ({
        id: court._id.toString(),
        name: court.name,
        status: court.status,
        sensorModules: court.sensorModules
          .filter((module) => module.sensorId === sensorId)
          .map((module) => ({
            sensorId: module.sensorId,
            side: module.side,
            esp32Id: module.esp32Id,
          })),
      }));
    },

    async findByIdWithSensors(courtId) {
      const court = await CourtModel.findById(courtId)
        .select("_id sensorModules")
        .lean();
      if (!court) return null;
      return {
        id: court._id.toString(),
        sensorModules: court.sensorModules.map(({sensorId, side}) => ({sensorId, side})),
      };
    },

    async existsById(courtId) {
      return Boolean(await CourtModel.exists({_id: courtId}));
    },

    async existsAny() {
      return Boolean(await CourtModel.exists({}));
    },

    async create(courtData) {
      return CourtModel.create(courtData);
    },
  };
}
