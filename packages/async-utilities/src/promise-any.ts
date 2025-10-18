/**
 * Resolve on first success, defer errors until all error.
 */
export function PromiseAny(promises: Promise<any>[]) {
  return Promise.all(
    promises.map(p => {
      // If a request fails, count that as a resolution so it will keep
      // waiting for other possible successes. If a request succeeds,
      // treat it as a rejection so Promise.all immediately bails out.
      return p.then(
        (val: any) => Promise.reject(val),
        (err: any) => Promise.resolve(err),
      )
    }),
  ).then(
    // If '.all' resolved, we've just got an array of errors.
    errors => Promise.reject(errors),
    // If '.all' rejected, we've got the result we wanted.
    val => Promise.resolve(val),
  )
}
