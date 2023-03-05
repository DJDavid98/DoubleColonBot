/**
 * Get the plural version of a string with an optional number prefix
 * @param noun Name of the thing
 * @param count Number of things
 * @param prepend Whether to prepend `count` in front of the string
 */
export const plural = (noun: string, count: number, prepend = true) => {
  let finalNoun: string;
  switch (noun) {
    case 'people': {
      finalNoun = noun;
      break;
    }
    default: {
      finalNoun = noun.endsWith('y') ? noun.replace(/y$/, 'ies') : `${noun}s`;
    }
  }
  return prepend ? `${count} ${finalNoun}` : finalNoun;
};
