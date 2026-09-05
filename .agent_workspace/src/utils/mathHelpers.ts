/**
 * Calculates the sum of an array of numbers.
 * @param numbers An array of numbers.
 * @returns The sum of the numbers. Returns 0 for an empty array.
 */
export function sum(numbers: number[]): number {
  if (!numbers || numbers.length === 0) {
    return 0;
  }
  return numbers.reduce((acc, current) => acc + current, 0);
}

/**
 * Calculates the average of an array of numbers.
 * @param numbers An array of numbers.
 * @returns The average of the numbers. Returns 0 for an empty array to avoid division by zero.
 */
export function average(numbers: number[]): number {
  if (!numbers || numbers.length === 0) {
    return 0;
  }
  return sum(numbers) / numbers.length;
}

/**
 * Clamps a number between a minimum and maximum value.
 * If min is greater than max, they are swapped to ensure correct clamping.
 * @param value The number to clamp.
 * @param min The minimum allowed value.
 * @param max The maximum allowed value.
 * @returns The clamped number.
 */
export function clamp(value: number, min: number, max: number): number {
  // Ensure min is always less than or equal to max
  const actualMin = Math.min(min, max);
  const actualMax = Math.max(min, max);

  return Math.max(actualMin, Math.min(value, actualMax));
}
