import SensorEventModel from "../models/sensorEvent.model.js";

export function createSensorEventRepository() {
  return {
    async findByCommandOrSequence({commandId, sensorId, sequence, session}) {
      let query = SensorEventModel.findOne({
        $or: [{commandId}, {sensorId, sequence}],
      }).lean();
      if (session) query = query.session(session);
      return query;
    },

    async findLatestSequence(sensorId, session) {
      let query = SensorEventModel.findOne({sensorId})
        .sort({sequence: -1})
        .select("sequence")
        .lean();
      if (session) query = query.session(session);
      const latest = await query;
      return latest?.sequence ?? null;
    },

    async create(event, session) {
      const [created] = await SensorEventModel.create([event], {session});
      return created;
    },
  };
}
