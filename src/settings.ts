// tests: https://github.com/zardoy/github-manager/tree/main/test/normalizeRegex.test.ts
/** For *regex* type settings that are actually strings allows to specify flags e.g. test or /test/i */
export const normalizeRegex = (input: string) => {
    const regexMatch = /^\/.+\/(.*)$/.exec(input)
    if (!regexMatch) return input
    const pattern = input.slice(1, -regexMatch[1]!.length - 1)
    const flags = regexMatch[1]
    return new RegExp(pattern, flags)
}
