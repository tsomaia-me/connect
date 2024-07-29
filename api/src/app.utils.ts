import { v4 as uuid } from 'uuid'

export function findUniqueUuid(map: Set<string>) {
  let key: string

  do {
    key = uuid()
  } while (map.has(key))

  return key
}
