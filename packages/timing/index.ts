let getNow: () => number
let getNowNoOffset: () => number
let timeOrigin = 0
let offset = 0

if (typeof performance !== 'undefined') {
  timeOrigin = performance.timeOrigin
  getNow = () => performance.now() + offset
  getNowNoOffset = () => performance.now()
} else {
  timeOrigin = Date.now()
  getNow = () => Date.now() - timeOrigin + offset
  getNowNoOffset = () => Date.now()
}

const setOffset = (o: number) => {
  offset = o
}

const getOffset = () => {
  return offset
}

const timing = {
  /**
   * Getter for the current time
   */
  now: getNow,
  /**
   * Getter for 'now' with no offsets applied. Used for duration calculations
   */
  nowNoOffset: getNowNoOffset,
  /**
   * The time in milliseconds since the unix timeOrigin at startup. Either Date.now() at startup or performance.timeOrigin.
   */
  timeOrigin: timeOrigin,
  /**
   * The offset is added to the time.
   */
  getOffset: getOffset,
  /**
   * User settable offset for clock synchronization
   */
  setOffset: setOffset,
  /**
   * Whether 'now' is realtime or historical.
   */
  isRealTime: true,
}

// This is exported as an object so in the future when we have timing contexts passed as React Contexts, they can naturally be destructured out.
export { timing }
