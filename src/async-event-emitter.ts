
type ArgumentsOf<T> = [T] extends [(...args: infer U) => any]
    ? U
    : [T] extends [void] ? [] : [T]

interface BaseEvents {
    [E: string]: (...args: any[]) => any;
}

export interface AsyncEventEmitterI<Events extends BaseEvents> {
    addListener<E extends keyof Events>(event: E, listener: Events[E]): this;
    on<E extends keyof Events>(event: E, listener: Events[E]): this;
    once<E extends keyof Events>(event: E, listener: Events[E]): this;
    prependListener<E extends keyof Events>(event: E, listener: Events[E]): this;
    prependOnceListener<E extends keyof Events>(event: E, listener: Events[E]): this;

    removeAllListeners<E extends keyof Events>(event: E): this;
    removeListener<E extends keyof Events>(event: E, listener: Events[E]): this;

    listeners<E extends keyof Events>(event?: E): Function[];

    emit<E extends keyof Events>(event: E, ...args: ArgumentsOf<Events[E]>): boolean;
    emitAndGetReturnValue<E extends keyof Events>(event: E, ...args: ArgumentsOf<Events[E]>): Promise<ReturnType<Events[E]>>;
    emitAndGetAllReturnValues<E extends keyof Events>(event: E, ...args: ArgumentsOf<Events[E]>): Promise<ReturnType<Events[E]>[]>;

    eventNames(): (keyof Events)[];
}

export class AsyncEventEmitter<Events extends BaseEvents> implements AsyncEventEmitterI<Events> {

    private listenerMap: Map<(keyof Events), Events[keyof Events][]>

    constructor() {
        this.listenerMap = new Map()
    }

    private OnceListenerWrapper<E extends keyof Events>(event: E, listener: Events[E]) {
        // @ts-ignore
        const _listener: Events[E] = (...args: ArgumentsOf<Events[E]>): ReturnType<Events[E]> => {
            this.removeListener(event, _listener)
            return listener(...args)
        }
        return _listener
    }

    addListener<E extends keyof Events>(event: E, listener: Events[E]) {
        if (!this.listenerMap.has(event)) {
            this.listenerMap.set(event, [])
        }

        this.listenerMap.get(event).push(listener)

        return this
    }

    prependListener<E extends keyof Events>(event: E, listener: Events[E]) {
        if (!this.listenerMap.has(event)) {
            this.listenerMap.set(event, [])
        }

        this.listenerMap.get(event).unshift(listener)

        return this
    }

    /**
     * @alias addListener
     */
    on<E extends keyof Events>(event: E, listener: Events[E]) {
        return this.addListener(event, listener)
    }

    once<E extends keyof Events>(event: E, listener: Events[E]) {
        return this.on(event, this.OnceListenerWrapper(event, listener))
    }

    prependOnceListener<E extends keyof Events>(event: E, listener: Events[E]) {
        return this.prependListener(event, this.OnceListenerWrapper(event, listener))
    }

    removeListener<E extends keyof Events>(event: E, listener: Events[E]) {
        const listeners = this.listenerMap.get(event)

        if (listeners && listeners.length > 0) {
            this.listenerMap.set(event, listeners.filter((cb) => {
                return cb !== listener
            }))
        }

        return this
    }

    removeAllListeners<E extends keyof Events>(event: E) {
        this.listenerMap.set(event, [])
        return this
    }

    listeners<E extends keyof Events>(event?: E): Function[] {
        if (!event) {
            return [...this.listenerMap.keys()].map((e) => this.listeners(e)).reduce((p, c) => p.concat(c), [])
        } else {
            if (!this.listenerMap.has(event)) {
                return []
            } else {
                return this.listenerMap.get(event)
            }
        }
    }

    emit<E extends keyof Events>(event: E, ...args: ArgumentsOf<Events[E]>) {
        const listeners = this.listenerMap.get(event)

        if (listeners && listeners.length > 0) {
            listeners.forEach(async (listener) => {
                listener(...args)
            })
            return true
        }

        return false
    }

    async emitAndGetReturnValue<E extends keyof Events>(event: E, ...args: ArgumentsOf<Events[E]>) {
        const returnValues = await this.emitAndGetAllReturnValues(event, ...args)
        for (const x of returnValues) {
            if (typeof x !== "undefined") {
                return x
            }
        }
    }

    async emitAndGetAllReturnValues<E extends keyof Events>(event: E, ...args: ArgumentsOf<Events[E]>) {
        const listeners = this.listenerMap.get(event)

        if (listeners && listeners.length > 0) {
            return Promise.all(
                listeners.map(async (listener) => {
                    return listener(...args)
                })
            )
        }
    }

    eventNames() {
        return [...this.listenerMap.keys()]
    }

}

export default AsyncEventEmitter
