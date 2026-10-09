export function createListCourtsUseCase(courtRepository) {
  return async function listCourts() {
    const courts = await courtRepository.findAll();

    return courts.map(({id, name, status}) => ({id, name, status}));
  };
}
