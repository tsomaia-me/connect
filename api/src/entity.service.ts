import { promises as fs } from 'fs'
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
  entityList: Entity[] = []
  entitiesByIds = new Map<string, Entity>()
  entitiesByKeys = new Map<string, Entity>()
  isLoaded = false

  abstract getSourceFilePath(): string

  abstract getBuilder(entity: Entity): Builder

  async add(entity: Entity, commit = true) {
    if (this.entitiesByIds.has(entity.id)) {
      throw new Error(`Entity with the ID ${entity.id} already exists`)
    }

    if (this.entitiesByKeys.has(entity.key)) {
      throw new Error(`Entity with the key ${entity.key} already exists`)
    }

    this.entityList.push(entity)
    this.entitiesByIds.set(entity.id, entity)
    this.entitiesByKeys.set(entity.key, entity)

    if (commit) {
      await this.commit()
    }
  }

  async getAll(): Promise<Entity[]> {
    await this.loadEntitiesIfNeeded()

    return this.entityList
  }

  async findById(id: string): Promise<Entity | null> {
    await this.loadEntitiesIfNeeded()

    return this.entitiesByIds.get(id) ?? null
  }

  async findByKey(key: string): Promise<Entity | null> {
    await this.loadEntitiesIfNeeded()

    return this.entitiesByKeys.get(key) ?? null
  }

  async updateByKey(key: string, mapper: (oldEntity: Builder) => Builder, commit = true): Promise<Entity> {
    const entity = this.entitiesByKeys.get(key)

    if (!entity) {
      throw new Error(`Invalid entity key: ${key}`)
    }

    const updatedEntity = mapper(this.getBuilder(entity)).toModel()

    this.entityList = this.entityList.map(entity => entity.key === key ? updatedEntity : entity)
    this.entitiesByIds.set(updatedEntity.id, updatedEntity)
    this.entitiesByKeys.set(key, updatedEntity)

    if (commit) {
      await this.commit()
    }

    return updatedEntity
  }

  async updateWhere(
    mapper: (oldRoom: Builder) => Builder,
    predicate: (room: Entity) => boolean,
    commit = true
  ): Promise<Entity[]> {
    const updatedRooms = await Promise.all(
      this.entityList.filter(predicate).map(room => {
        return this.updateByKey(room.key, mapper)
      })
    )

    if (commit) {
      await this.commit()
    }

    return updatedRooms
  }

  findUniqueId(): string {
    return findUniqueUuid(new Set(this.entitiesByIds.keys()))
  }

  findUniqueKey(): string {
    return findUniqueUuid(new Set(this.entitiesByKeys.keys()))
  }

  async commit() {
    await fs.writeFile(this.getSourceFilePath(), JSON.stringify(this.entityList, undefined, 2), 'utf-8')
  }

  private async loadEntitiesIfNeeded() {
    if (!this.isLoaded) {
      const rawData = await fs.readFile(this.getSourceFilePath(), 'utf-8')
      this.entityList = rawData
        ? JSON.parse(rawData)
        : []
      this.entitiesByIds = new Map(this.entityList.map(entity => [entity.id, entity]))
      this.entitiesByKeys = new Map(this.entityList.map(entity => [entity.key, entity]))
      this.isLoaded = true
    }
  }
}
