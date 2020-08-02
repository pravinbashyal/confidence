export function sum(values: number[]): number {
  return values.reduce((total, c) => total + c, 0)
}

export function round(value: number, precision = 1): number {
  return (
    Math.round(value * Math.pow(10, precision) + Number.EPSILON) /
    Math.pow(10, precision)
  )
}

export function average(values: number[]): number {
  return sum(values) / values.length
}
