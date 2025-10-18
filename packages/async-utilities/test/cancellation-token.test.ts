import { describe, expect, it } from 'vitest'

import { CancellationReason, CancellationToken, UnanimousCancellationToken } from '../src/cancellation-token'

export class CustomTimeoutError {
  // By marking these, this counts as a CancellationReason
  isCancellation = true
  token: CancellationToken
  description: string

  constructor(description: string, cancellationToken: CancellationToken) {
    this.token = cancellationToken
    this.description = description
  }
}

describe('CancellationToken', () => {
  it(`cancels when told to`, async () => {
    const token = new CancellationToken()

    expect(token.isCancelled()).toBe(false)
    token.cancel()
    expect(token.isCancelled()).toBe(true)
  })
  it(`only calls subscribers once when cancelling twice`, async () => {
    const token = new CancellationToken()

    let cancelCount = 0

    const handler = () => {
      cancelCount++
    }
    token.subscribe(handler)

    expect(cancelCount).toBe(0)
    token.cancel()
    expect(cancelCount).toBe(1)
    token.cancel()
    expect(cancelCount).toBe(1)
  })
  it(`supports an unsubscribe handler`, async () => {
    const token = new CancellationToken()

    let cancelCount = 0

    const handler = () => {
      cancelCount++
    }
    const unsub = token.subscribe(handler)

    unsub()

    expect(cancelCount).toBe(0)
    token.cancel()
    expect(cancelCount).toBe(0)
  })
  it(`supports custom errors 'caused' by a CancellationToken, and the 'caused' method still works`, () => {
    const cancellationToken = new CancellationToken()

    const error = new CustomTimeoutError('custom error', cancellationToken)

    expect(cancellationToken.caused(error)).toBeTruthy()
    expect(error.description).toBe('custom error')
  })
})

describe('UnanimousCancellationToken', () => {
  it(`cancels when all internal cancellation tokens cancel`, async () => {
    const a = new CancellationToken()
    const b = new CancellationToken()

    const uni = new UnanimousCancellationToken()
    uni.addToken(a)
    uni.addToken(b)

    expect(uni.getToken().isCancelled()).toBe(false)
    a.cancel()
    expect(uni.getToken().isCancelled()).toBe(false)
    b.cancel()
    expect(uni.getToken().isCancelled()).toBe(true)
  })
  it(`calls cancellation subscribers when all internal cancellation tokens cancel`, async () => {
    const a = new CancellationToken()
    const b = new CancellationToken()

    const uni = new UnanimousCancellationToken()
    uni.addToken(a)
    uni.addToken(b)

    let didCancel: CancellationReason | null = null

    const handler = (reason: CancellationReason) => {
      didCancel = reason
    }
    uni.getToken().subscribe(handler)

    expect(uni.getToken().isCancelled()).toBe(false)
    a.cancel()
    expect(uni.getToken().isCancelled()).toBe(false)
    b.cancel()

    expect(uni.getToken().caused(didCancel)).toBe(true)
    expect(didCancel).not.toBe(null)
  })
  it(`tokens can be added and removed`, async () => {
    const a = new CancellationToken()
    const b = new CancellationToken()

    const uni = new UnanimousCancellationToken()
    uni.addToken(a)
    uni.addToken(b)

    let didCancel: CancellationReason | null = null

    const handler = (reason: CancellationReason) => {
      didCancel = reason
    }
    uni.getToken().subscribe(handler)

    expect(uni.getToken().isCancelled()).toBe(false)
    a.cancel()
    expect(uni.getToken().isCancelled()).toBe(false)

    uni.removeToken(b)

    expect(a.isCancelled()).toBe(true)
    expect(b.isCancelled()).toBe(false)
    expect(uni.getToken().caused(didCancel)).toBe(true)
    expect(didCancel).not.toBe(null)
  })
})
