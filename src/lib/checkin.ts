export const CHECKIN_DISTANCE_THRESHOLD_M = 300;
export const CHECKIN_MAX_ACCURACY_M = 100;

export interface CheckinEligibility {
  eligible: boolean;
  reason: 'ok' | 'too-far' | 'low-accuracy' | 'no-position';
}

export function evaluateCheckin(
  distanceM: number | null,
  accuracyM: number | null,
): CheckinEligibility {
  if (distanceM === null || accuracyM === null) {
    return { eligible: false, reason: 'no-position' };
  }
  if (accuracyM > CHECKIN_MAX_ACCURACY_M) {
    return { eligible: false, reason: 'low-accuracy' };
  }
  if (distanceM > CHECKIN_DISTANCE_THRESHOLD_M) {
    return { eligible: false, reason: 'too-far' };
  }
  return { eligible: true, reason: 'ok' };
}
