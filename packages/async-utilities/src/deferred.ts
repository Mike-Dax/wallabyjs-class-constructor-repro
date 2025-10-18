import { CancellationToken } from './cancellation-token'
import { debug } from './debug'

function wrapPromiseWithThenTracker<T>(basePromise: Promise<T>, capturedAwaitPointStacks: string[]): Promise<T> {
  const handler: ProxyHandler<Promise<T>> = {
    get(target, prop, receiver) {
      // Intercept any await points
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        const stack = new Error('Deferred.then attached').stack ?? 'Unknown stack'
        capturedAwaitPointStacks.push(stack)

        const original = (target as any)[prop] as Function
        return function wrappedChain(this: unknown, ...args: any[]) {
          const next = original.apply(target, args)
          return wrapPromiseWithThenTracker(next, capturedAwaitPointStacks)
        }
      }

      const value = (target as any)[prop]
      return typeof value === 'function' ? value.bind(target) : value
    },
  }

  return new Proxy(basePromise, handler) as unknown as Promise<T>
}

export class Deferred<T> {
  promise!: Promise<T>
  resolve!: (val: T) => void
  reject!: (err: any) => void

  /**
   * Pass a cancellation token to automatically subscribe to it.
   */
  constructor(cancellationToken?: CancellationToken) {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })

    const awaitPoints: string[] = []

    if (debug.trackDeferredThenStacks) {
      this.promise = wrapPromiseWithThenTracker(this.promise, awaitPoints)
    }

    if (cancellationToken) {
      const unsub = cancellationToken.subscribe(token => {
        if (debug.trackDeferredThenStacks) {
          console.log(
            `Deferred for cT`,
            cancellationToken.reason.description,
            `was cancelled, here are the await points:`,
          )
          for (const stack of awaitPoints) {
            console.log(stack)
          }
        }
        this.reject(token)
      })

      // Unsubscribe on resolution either way, and emit any captured .then stacks on cancellation
      // The .finally must also be caught with a noop handler, since it creates an additional branch.
      void this.promise
        .finally(() => {
          unsub()
        })
        .catch(() => {})
    }
  }
}
