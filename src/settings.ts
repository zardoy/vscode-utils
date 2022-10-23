import * as vscode from 'vscode'
import { getExtensionSettingId, Settings } from 'vscode-framework'

// tests: https://github.com/zardoy/github-manager/tree/main/test/normalizeRegex.test.ts
/** For *regex* type settings that are actually strings allows to specify flags e.g. test or /test/i */
export const normalizeRegex = (input: string) => {
    const regexMatch = /^\/.+\/(.*)$/.exec(input)
    if (!regexMatch) return input
    const pattern = input.slice(1, -regexMatch[1]!.length - 1)
    const flags = regexMatch[1]
    return new RegExp(pattern, flags)
}

type SettingKey = keyof Settings

export const watchExtensionSettings = (keys: SettingKey[], handler: (changedSettingKey: SettingKey) => any, scope?: vscode.ConfigurationScope) => {
    vscode.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        const changedConfigKey = keys.find(key => affectsConfiguration(getExtensionSettingId(key), scope))
        if (changedConfigKey) handler(changedConfigKey)
    })
}
