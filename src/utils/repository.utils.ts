import { DeepPartial, Repository } from 'typeorm';

export async function findOrCreate<T>(
  repository: Repository<T>,
  conditions: DeepPartial<T>,
  createData: DeepPartial<T> = conditions,
): Promise<T> {
  const entity = await repository.findOne({
    where: conditions as any,
  });

  if (!entity) {
    return await repository.save(createData);
  }

  return entity;
}
