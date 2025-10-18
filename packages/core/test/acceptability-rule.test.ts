import { describe, expect, it } from 'vitest'
import { AcceptabilityRule, getAcceptabilityRuleKeys } from '../src/acceptability-rule'

type ConnectionMetadata = {
  packetLoss: number
  consecutiveHeartbeats: number
  a: number
  b: number
}

describe('getAcceptabilityRuleKeys', () => {
  it('extracts keys from destructuring in function signature', () => {
    const keys = getAcceptabilityRuleKeys(
      new AcceptabilityRule<ConnectionMetadata>(({ packetLoss, consecutiveHeartbeats }) => {
        return packetLoss < 0.1 && consecutiveHeartbeats > 3
      }),
    )
    expect(keys).toEqual(new Set(['packetLoss', 'consecutiveHeartbeats']))
  })

  it('extracts keys from assignment in function body', () => {
    const keys = getAcceptabilityRuleKeys(
      new AcceptabilityRule<ConnectionMetadata>(metadata => {
        const { packetLoss } = metadata
        const consecutiveHeartbeats = metadata.consecutiveHeartbeats
        return packetLoss < 0.1 && consecutiveHeartbeats > 3
      }),
    )

    console.log(keys)

    expect(keys).toEqual(new Set(['packetLoss', 'consecutiveHeartbeats']))
  })

  it('uses provided keys when branches access different keys', () => {
    const keys = getAcceptabilityRuleKeys(
      new AcceptabilityRule<ConnectionMetadata>(
        metadata => {
          if (metadata.a > 10) {
            return metadata.b > 20
          }
          return metadata.a > 5
        },
        ['a', 'b'],
      ),
    )
    expect(keys).toEqual(new Set(['a', 'b']))
  })
})
