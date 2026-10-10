/** A suspended tab resumes at the elapsed deadline, rather than replaying ticks. */
export function restRemaining(deadline: number, now: number = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
