export class AcceptabilityRule<ConnectionMetadata> {
  constructor(
    /** */
    public isAcceptable: (metadata: ConnectionMetadata) => boolean,
    /**
     * Optionally, pass the list of connection metadata keys used in the calculation
     * of the previous isAcceptable argument.
     *
     * This is automatically detected, if the keys are read in different branches, that
     * automatic detection might be inaccurate.
     * */
    public keys?: (keyof ConnectionMetadata & string)[],
  ) {}
}

export function getAcceptabilityRuleKeys<ConnectionMetadata>(
  rule: AcceptabilityRule<ConnectionMetadata>,
): Set<keyof ConnectionMetadata> {
  if (rule.keys) {
    return new Set(rule.keys)
  }

  const used = new Set<string>()
  const cache = new Map<string | symbol | null, any>()

  const make = (rootKey: string | symbol | null): any => {
    if (cache.has(rootKey)) return cache.get(rootKey)

    const proxy = new Proxy(function () {}, {
      // Property reads track top-level access and always return a proxy (or safe primitive for special cases).
      get(_t, prop: string | symbol) {
        // Avoid being thenable to prevent Promise behavior
        if (prop === 'then') return undefined

        // Primitive coercions support (e.g., arithmetic/concat)
        if (prop === Symbol.toPrimitive) {
          return (hint: 'default' | 'string' | 'number') => {
            return hint === 'string' ? '' : 0
          }
        }
        if (prop === 'valueOf') return () => 0
        if (prop === 'toString') return () => ''

        // Iteration support: for..of, spread, etc. -> empty iterator
        if (prop === Symbol.iterator) {
          // Return an empty generator
          return function* () {}
        }

        // For array accesses
        if (prop === 'length') return 0

        // At the top level, the first property accessed is the key.
        if (rootKey == null) {
          // Only cache string keys, ignore any engine stuff.
          if (typeof prop === 'string') {
            used.add(prop)
          }
          // Return a nested proxy bound to this new key
          return make(prop)
        }

        // For any deeper access, keep attributing to the original key
        return make(rootKey)
      },
      // Function call: return another placeholder
      apply() {
        return make(rootKey)
      },
      // new Placeholder() - sure, why not
      construct() {
        return make(rootKey)
      },
      // in operator: say everything exists
      has() {
        return true
      },
      // Object.keys() is empty
      ownKeys() {
        return []
      },
      // Property descriptors
      getOwnPropertyDescriptor() {
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value: undefined,
        }
      },
      // Ignore any assignments
      set() {
        return true
      },
    })

    cache.set(rootKey, proxy)
    return proxy
  }

  const probe = make(null)

  try {
    // Execute the accessor against the probe. Any exceptions are swallowed since
    // we only care about which top-level keys were read.
    rule.isAcceptable(probe)
  } catch {
    // ignore
  }

  return used as Set<keyof ConnectionMetadata>
}
