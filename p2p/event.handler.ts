export class EventHandler<EventMap extends object> {
  private listeners: Map<string, Function[]> = new Map()

  on<T extends keyof EventMap>(type: T, callback: (message: EventMap[T]) => void) {
    const listeners = this.listeners.get(type) ?? []

    this.listeners.set(type, [
      ...listeners,
      callback,
    ])
  }

  off<T extends keyof EventMap>(type: T, callback: (message: EventMap[T]) => void) {
    if (this.listeners.has(type)) {
      const listeners = this.listeners.get(type)

      this.listeners.set(type, listeners.filter(c => c !== callback))
    }
  }

  trigger<T extends keyof EventMap>(type: T, message: EventMap[T]): () => void {
    if (this.listeners.has(type)) {
      const listeners = this.listeners.get(type)

      return listeners.reduce((dispose, callback) => {
        const off = callback(message)

        return off ? () => {
          off()
          callback(message)
        } : dispose
      }, noop)
    }

    return noop
  }
}

const noop = () => {}
