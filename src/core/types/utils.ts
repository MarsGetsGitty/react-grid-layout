/**
 * Makes all properties in T mutable (removes readonly).
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Deep partial - all properties and nested properties are optional.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract the element type from an array type.
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;
