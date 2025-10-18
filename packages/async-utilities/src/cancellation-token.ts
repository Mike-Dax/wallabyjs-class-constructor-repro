import {} from '@electricui/build-rollup-config'
import { timing } from '@electricui/timing'
import d from 'debug'
import { debug } from './debug'

const debugLog = d('electricui-core:cancellation-token')

// A disposable unsubscribe handle compatible with TypeScript's `using`.
export type UnsubscribeDisposable = (() => void) & {
  [Symbol.dispose](): void
}

export type UnsubscribeAsyncDisposable = (() => Promise<void>) & {
  [Symbol.asyncDispose](): Promise<void>
}

/** Throwing the CancellationReason allows us to extend  */
export type CancellationReason = {
  isCancellation: true
  token: CancellationToken
  description?: string
  creationTrace?: string
  cancellationTrace?: string
  subscriptionTraces?: Map<CancellationCallback, string>
}

export type CancellationCallback = (token: CancellationReason) => void

export function isCancellationToken(thing: unknown): thing is CancellationToken {
  if (typeof thing !== 'object' || thing === null) return false
  const candidate = thing as { isCancellationToken?: unknown }
  return candidate.isCancellationToken === true
}

export function isCancellationReason(thing: unknown): thing is CancellationReason {
  if (typeof thing !== 'object' || thing === null) return false
  const candidate = thing as { isCancellation?: unknown }
  return candidate.isCancellation === true
}

export class CancellationToken {
  public isCancellationToken = true as const
  private cancelled: boolean = false
  public reason: CancellationReason
  private subscribers: Array<CancellationCallback> = []
  private cleanupSubscribers: Array<() => void> = []
  private deadlineTimer: NodeJS.Timeout | null = null
  public deadlineTime: number | null = null
  public deadlineDuration: number | null = null

  constructor(description: string = '') {
    this.reason = {
      isCancellation: true,
      description,
      token: this,
    }

    if (debugLog.enabled || debug.cancellationTokenCreationTrace) {
      this.reason.creationTrace = new Error().stack
    }
    if (debugLog.enabled || debug.cancellationTokenSubscriptionTrace) {
      this.reason.subscriptionTraces = new Map()
    }

    this.cancel = this.cancel.bind(this)
    this.isCancelled = this.isCancelled.bind(this)
    this.haltIfCancelled = this.haltIfCancelled.bind(this)
    this.subscribe = this.subscribe.bind(this)
    this.caused = this.caused.bind(this)
    this.deadline = this.deadline.bind(this)
    this.scoped = this.scoped.bind(this)
  }

  toString() {
    if (this.reason.description) {
      return `Cancellation of token: "${this.reason.description}"`
    }
    return `A CancellationToken fired`
  }

  /**
   * Cancel this token, notify all subscribers of the cancellation
   */
  public cancel() {
    // Can only cancel once
    if (this.cancelled) {
      return
    }

    this.reason.cancellationTrace = new Error().stack

    if (debugLog.enabled || debug.cancellationTokenCancellationTrace) {
      this.reason.cancellationTrace = new Error().stack
    }

    this.cancelled = true

    // copy the array before we clean it up
    const subscribers = this.subscribers.slice()

    // clean up
    this.cleanup()

    // finally notify the subscribers to avoid any infinite loops
    subscribers.forEach(cb => cb(this.reason))
  }

  /**
   * Synchronously check if this token is cancelled
   */
  public isCancelled() {
    return this.cancelled
  }

  /**
   * Halt the call stack if this token is cancelled
   */
  public haltIfCancelled() {
    if (this.isCancelled()) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw this.reason
    }
  }

  /**
   * Calls each of the subscribers with the token upon cancellation.
   *
   * Returns a callable unsubscribe handle which also implements
   * [Symbol.dispose] so it can be used with TypeScript's `using` for
   * automatic unsubscription on scope exit.
   */
  public subscribe(cb: CancellationCallback): UnsubscribeDisposable {
    this.subscribers.push(cb)

    if (debugLog.enabled || debug.cancellationTokenSubscriptionTrace) {
      if (this.reason.subscriptionTraces) {
        this.reason.subscriptionTraces.set(cb, new Error().stack ?? 'Unknown trace')
      }
    }

    const unsubscribe: UnsubscribeDisposable = (() => {
      this.subscribers = this.subscribers.filter(c => c !== cb)

      if (debugLog.enabled || debug.cancellationTokenSubscriptionTrace) {
        this.reason.subscriptionTraces?.delete(cb)
      }
    }) as UnsubscribeDisposable

    // Attach the dispose property
    unsubscribe[Symbol.dispose] = unsubscribe

    return unsubscribe
  }

  /**
   * Unsubscribe a callback from cancellation
   */
  public unsubscribe(cb: CancellationCallback) {
    this.subscribers = this.subscribers.filter(c => c !== cb)

    if (debugLog.enabled || debug.cancellationTokenSubscriptionTrace) {
      if (this.reason.subscriptionTraces) {
        this.reason.subscriptionTraces.delete(cb)
      }
    }

    return this
  }

  /**
   * Check if a CancellationReason was triggered by this CancellationToken.
   *
   * This allows us to create nicely named errors
   */
  public caused(e: any) {
    if (isCancellationReason(e)) {
      return e.token === this
    }

    return false
  }

  /**
   * Set a deadline _timeout_ milliseconds in the future
   */
  public deadline(timeout: number) {
    if (this.deadlineTimer) {
      clearTimeout(this.deadlineTimer)
    }

    this.deadlineTimer = setTimeout(this.cancel, timeout)
    this.deadlineTime = timing.now() + timeout
    this.deadlineDuration = timeout

    return this
  }

  /**
   * Returns a new CancellationToken that cancels when `this` one does.
   *
   * If it goes out of scope it also cancels, and cleans up
   *
   * Create a child CancellationToken scoped to this token.
   *
   * The returned token will be cancelled when this token cancels.
   * It optionally accepts a description and a deadline in milliseconds.
   *
   * The returned token has a [Symbol.dispose] method which, unsubscribes from the parent token and cancels the child token.
   */
  public scoped(description?: string, deadline?: number): CancellationToken & { [Symbol.dispose](): void } {
    const child = new CancellationToken(description)

    if (typeof deadline === 'number') {
      child.deadline(deadline)
    }

    // If the parent is already cancelled, immediately cancel the child.
    if (this.isCancelled()) {
      child.cancel()
    }

    // When the parent cancels, cancel the child.
    const unsubscribeParent = this.subscribe(() => {
      child.cancel()
    })

    // Clean up the parent subscription when the child is cleaned up.
    child.cleanupSubscribe(() => {
      unsubscribeParent()
    })

    const childWithDispose = child as CancellationToken & { [Symbol.dispose](): void }

    // Disposal should unsubscribe from the parent and cancel the child.
    childWithDispose[Symbol.dispose] = () => {
      unsubscribeParent()
      child.cancel()
    }

    return childWithDispose
  }

  /**
   * Subscribe to the cleanup of this token
   */
  public cleanupSubscribe(cb: () => void) {
    this.cleanupSubscribers.push(cb)
  }

  /**
   * Cleanup the token.
   */
  public cleanup() {
    // Copy the cleanup subscribers
    const cleanup = this.cleanupSubscribers.slice()

    this.cleanupSubscribers = []
    this.subscribers = []
    if (this.deadlineTimer) {
      clearTimeout(this.deadlineTimer)
      this.deadlineTimer = null
    }

    // Call the cleanup handlers
    cleanup.forEach(cb => cb())
  }
}

/**
 * Used to aggregate multiple cancellation tokens, only
 * cancelling once all of them cancel
 */
export class UnanimousCancellationToken {
  private unanimousCancellationToken = new CancellationToken()
  private tokens: Set<CancellationToken> = new Set()

  constructor() {
    this.getDeadlineTime = this.getDeadlineTime.bind(this)
    this.getDeadlineDuration = this.getDeadlineDuration.bind(this)
    this.addToken = this.addToken.bind(this)
    this.getToken = this.getToken.bind(this)
    this.check = this.check.bind(this)
    this.cleanup = this.cleanup.bind(this)
  }

  /**
   * The deadlineTime for a UnanimousCancellationToken is the latest deadlineTime
   * of all its constituents. If any do not have a deadline time, then the result is null.
   */
  public getDeadlineTime() {
    const max = this.tokens.values().reduce((acc, token) => {
      return Math.max(token.deadlineTime ?? Infinity, acc)
    }, -Infinity)

    // At least one didn't have a deadline
    if (max === Infinity) {
      return null
    }

    return max
  }
  /**
   * The deadlineDuration for a UnanimousCancellationToken is the longest deadlineDuration
   * of all its constituents, including Infinity.
   */
  public getDeadlineDuration() {
    const max = this.tokens.values().reduce((acc, token) => {
      return Math.max(token.deadlineDuration ?? Infinity, acc)
    }, -Infinity)

    // At least one didn't have a deadline
    if (max === Infinity) {
      return null
    }

    return max
  }

  public addToken(cancellationToken: CancellationToken) {
    // If we already have this one, do nothing
    if (this.tokens.has(cancellationToken)) {
      return
    }

    // Add the token
    this.tokens.add(cancellationToken)

    // If it cancels, check
    cancellationToken.subscribe(this.check)
  }

  public removeToken(cancellationToken: CancellationToken) {
    // If we don't have this token, do nothing
    if (!this.tokens.has(cancellationToken)) {
      return
    }

    // Remove the token
    this.tokens.delete(cancellationToken)

    // Unsubscribe from it
    cancellationToken.unsubscribe(this.check)

    // Check if we've now cancelled
    this.check()
  }

  public getToken() {
    return this.unanimousCancellationToken
  }

  private check() {
    const allTokens = Array.from(this.tokens.values())

    // If every token is now cancelled
    if (this.tokens.values().every(token => token.isCancelled())) {
      // cancel the unanimous token
      this.unanimousCancellationToken.cancel()
    }
  }

  /**
   * Cleans up all cancellation tokens, including the unanimous one.
   */
  public cleanup() {
    for (const token of this.tokens.values()) {
      token.cleanup()
    }
  }
}
