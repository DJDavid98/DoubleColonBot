export const oneHourMS = 3600e3;
export const oneMinuteMS = 60e3;
export const oneSecondMS = 1e3;

const roundToOneDecimal = (value: number) => Math.ceil(value * 10) / 10;

export const formatTime = (durationMs: number): string => {
  if (durationMs >= oneHourMS) {
    return roundToOneDecimal(durationMs / oneHourMS) + 'h';
  }
  if (durationMs >= oneMinuteMS) {
    return roundToOneDecimal(durationMs / oneMinuteMS) + 'm';
  }
  if (durationMs >= oneSecondMS) {
    return roundToOneDecimal(durationMs / oneSecondMS) + 's';
  }
  return roundToOneDecimal(durationMs) + 'ms';
};
