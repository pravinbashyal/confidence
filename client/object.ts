export const invert = (value: { [index: string]: number }) => {
  const dict: { [index: number]: string[] } = {}
  Object.entries(value).forEach((entry) => {
    const key = entry[1]
    if (!dict[key]) {
      dict[key] = []
    }
    dict[key].push(entry[0])
  })
  return dict
}
