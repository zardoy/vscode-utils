import * as vscode from 'vscode'
import { getExtensionSetting, getExtensionSettingId, Settings } from 'vscode-framework'

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

type WatchExtensionSetting = <T extends SettingKey>(keys: T, handler: (newValue: Settings[T]) => any, scope?: vscode.ConfigurationScope) => void

export const watchExtensionSetting: WatchExtensionSetting = (key: SettingKey, handler: (newValue: SettingKey) => any, scope?: vscode.ConfigurationScope) => {
    vscode.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
        if (!affectsConfiguration(getExtensionSettingId(key), scope)) return
        handler(getExtensionSetting(key))
    })
}

export const conditionallyRegister = (
    settingKey: SettingKey,
    registerFn: () => vscode.Disposable,
    acceptSettingValue: () => boolean = () => !!getExtensionSetting(settingKey),
) => {
    let disposable: vscode.Disposable | undefined
    const changeRegisterState = () => {
        const registerState = acceptSettingValue()
        if (registerState) {
            if (!disposable) disposable = registerFn()
        } else {
            disposable?.dispose()
            disposable = undefined
        }
    }

    changeRegisterState()
    watchExtensionSettings([settingKey], changeRegisterState)
}
