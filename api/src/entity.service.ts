import { findUniqueUuid } from './app.utils'

export interface ModelBase {
  id: string
  key: string
}

export interface EntityBuilder<Entity> {
  toModel(): Entity

  toJson(): object
}

export abstract class EntityService<Entity extends ModelBase, Builder extends EntityBuilder<Entity>> {
  entitiesByIds = new Map<string, Entity>()
  entitiesByKeys = new Map<string, Entity>()

  abstract getBuilder(entity: Entity): Builder

  add(entity: Entity) {
    this.entitiesByIds.set(entity.id, entity)
    this.entitiesByKeys.set(entity.key, entity)
  }

  getAll() {
    return Array.from(this.entitiesByIds.values())
  }

  findById(id: string): Entity | null {
    return this.entitiesByIds.get(id) ?? null
  }

  findByKey(key: string): Entity | null {
    return this.entitiesByKeys.get(key) ?? null
  }

  updateByKey(key: string, mapper: (oldEntity: Builder) => Builder) {
    const entity = this.entitiesByKeys.get(key)

    if (entity) {
      throw new Error(`Invalid entity key: ${key}`)
    }

    this.entitiesByKeys.set(key, mapper(this.getBuilder(entity)).toModel())
  }

  updateWhere(
    mapper: (oldRoom: Builder) => Builder,
    predicate: (room: Entity) => boolean,
  ) {
    this.getAll().filter(predicate).forEach(room => {
      this.updateByKey(room.key, mapper)
    })
  }

  findUniqueId() {
    return findUniqueUuid(new Set(this.entitiesByIds.keys()))
  }

  findUniqueKey() {
    return findUniqueUuid(new Set(this.entitiesByKeys.keys()))
  }
}
