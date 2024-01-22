const oneHourMS = 3600e6;
const oneMinuteMS = 60e3;
const oneSecondMS = 1e3;

const roundToOneDecimal = (value: number) => Math.ceil(value * 10) / 10;

export const formatTime = (durationMs: number): string => {
  if (durationMs > oneHourMS) {
    return roundToOneDecimal(durationMs / oneHourMS) + 'h';
  }
  if (durationMs > oneMinuteMS) {
    return roundToOneDecimal(durationMs / oneMinuteMS) + 'm';
  }

  return roundToOneDecimal(durationMs / oneSecondMS) + 's';
};
