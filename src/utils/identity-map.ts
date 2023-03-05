export const identityMap = <T extends string>(keys: T[]): { [k in T]: k } => keys.reduce((acc, key) => {
  acc[key] = key;
  return acc;
}, {} as { [k in T]: k });

export type IdentityMap<T extends object> = keyof T;
