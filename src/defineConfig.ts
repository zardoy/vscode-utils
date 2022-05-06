import { readFileSync } from 'fs'
import { UserConfig } from 'vscode-framework/build/config'
import { mergeDeepRight } from 'rambda'
import untildify from 'untildify'
import { pickObj } from '@zardoy/utils'

interface GlobalConfigBase {
    disableExtensions: boolean
    forceExecutable: string
    alwaysActivationEvent: boolean
    openDevtools: boolean
    revealOutputChannel: boolean
    closeWindowOnExit: boolean
    autoReload: boolean
    developmentCommands: boolean
}

export interface GlobalConfig extends GlobalConfigBase {
    vscode: GlobalConfigBase
    insiders: GlobalConfigBase
}

export const defineConfig = (config: UserConfig): UserConfig => {
    let globalConfig: string | undefined
    try {
        globalConfig = readFileSync(untildify('~/.vscode-framework.json'), 'utf-8')
    } catch {}

    const defaultConfig: UserConfig = {
        esbuild: {
            production: {
                defineEnv: {
                    //@ts-expect-error same as undefined?
                    EXTENSION_BOOTSTRAP_CONFIG: null,
                },
            },
            mainFields: ['module', 'main'],
        },
        development: {
            extensionBootstrap: {},
        },
    }

    const isInsiders = process.env.TERM_PROGRAM === 'vscode' && process.env.TERM_PROGRAM_VERSION?.endsWith('insider')
    let forceExecutable: string | undefined
    // TODO! NOT TESTED!
    if (globalConfig) {
        const globalConfigParsed: GlobalConfig = JSON.parse(globalConfig)
        const configMerged = { ...globalConfigParsed, ...(isInsiders ? globalConfigParsed.insiders : globalConfigParsed.vscode) }
        forceExecutable = configMerged.forceExecutable
        Object.assign(defaultConfig.development, pickObj(configMerged, 'alwaysActivationEvent', 'disableExtensions', 'openDevtools'))
        Object.assign(
            defaultConfig.development!.extensionBootstrap,
            pickObj(configMerged, 'autoReload', 'closeWindowOnExit', 'developmentCommands', 'revealOutputChannel'),
        )
    }

    if (isInsiders) defaultConfig.development!.executable = 'code-insiders'
    const merged: UserConfig = mergeDeepRight(defaultConfig, config)
    if (forceExecutable) merged.development!.executable = forceExecutable as any
    return merged
}
