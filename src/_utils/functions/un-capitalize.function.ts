export type UnCapitalizeFirstLetter<T extends string> = T extends `${infer First}${infer Rest}`
  ? `${Lowercase<First>}${Rest}`
  : T;

export type CapitalizeFirstLetter<T extends string> = T extends `${infer First}${infer Rest}`
  ? `${Uppercase<First>}${Rest}`
  : T;

export function transformFirstLetter<T extends string>(str: T, capitalize: true): CapitalizeFirstLetter<T>;
export function transformFirstLetter<T extends string>(str: T, capitalize: false): UnCapitalizeFirstLetter<T>;
export function transformFirstLetter<T extends string>(str: T, capitalize: boolean): string {
  if (capitalize) return str.charAt(0).toUpperCase() + str.slice(1);
  else return str.charAt(0).toLowerCase() + str.slice(1);
}
