const MONGO_ID_PATTERN = /^[a-f\d]{24}$/i;

export function isMongoObjectId(value) {
  return MONGO_ID_PATTERN.test(value);
}
