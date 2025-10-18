import { Deferred } from './deferred'

let idleCallback: (callback: () => void) => void

try {
  idleCallback =
    (window as any) && typeof (window as any).requestIdleCallback === 'function'
      ? (window as any).requestIdleCallback
      : (callback: () => void) => setTimeout(callback, 0)
} catch (e) {
  idleCallback = (callback: () => void) => setTimeout(callback, 0)
}

export class LazyPromise<T> {
  private hasRun = false
  private deferred = new Deferred<T>()

  constructor(private factory: () => Promise<T>) {
    this.get = this.get.bind(this)
    this.calculateValue = this.calculateValue.bind(this)
    this.ready = this.ready.bind(this)

    // Schedule our calculation
    idleCallback(this.calculateValue)
  }

  private async calculateValue() {
    if (this.hasRun) {
      return
    }

    this.hasRun = true

    // Calculate our value
    this.factory()
      .then(res => {
        this.deferred.resolve(res)
      })
      .catch(err => {
        this.deferred.reject(err)
      })
  }

  public async get() {
    if (this.hasRun) {
      return this.deferred.promise
    }

    // otherwise kick it off now
    await this.calculateValue()

    return this.deferred.promise
  }

  public ready() {
    return this.hasRun
  }
}

export class Lazy<T> {
  private hasRun = false
  private value!: T

  constructor(private factory: () => T) {
    this.get = this.get.bind(this)
    this.calculateValue = this.calculateValue.bind(this)
    this.ready = this.ready.bind(this)

    // Schedule our calculation
    idleCallback(this.calculateValue)
  }

  private calculateValue() {
    if (this.hasRun) {
      return
    }

    this.value = this.factory()
    this.hasRun = true
  }

  public get() {
    if (!this.hasRun) {
      this.calculateValue()
    }

    return this.value as T
  }

  public ready() {
    return this.hasRun
  }
}
