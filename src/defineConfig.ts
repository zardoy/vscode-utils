import { chmodSync, readFileSync, writeFileSync } from 'fs'
import os from 'os'
import { join } from 'path'
import execa from 'execa'
import { UserConfig } from 'vscode-framework/build/config'
import { mergeDeepRight } from 'rambda'
import untildify from 'untildify'
import { pickObj } from '@zardoy/utils'

interface GlobalConfigBase {
    disableExtensions?: boolean | string[]
    // have higher priority
    enableExtensions?: string[]
    forceExecutable?: string
    alwaysActivationEvent?: boolean
    openDevtools?: boolean
    revealOutputChannel?: boolean
    closeWindowOnExit?: boolean
    autoReload?: boolean
    developmentCommands?: boolean
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
    let globalConfigMerged: GlobalConfig | undefined
    // TODO! NOT TESTED!
    if (globalConfig) {
        const globalConfigParsed = JSON.parse(globalConfig)
        const configMerged = { ...globalConfigParsed, ...(isInsiders ? globalConfigParsed.insiders : globalConfigParsed.vscode) }
        globalConfigMerged = configMerged
        forceExecutable = configMerged.forceExecutable
        Object.assign(defaultConfig.development!, pickObj(configMerged, 'alwaysActivationEvent', 'disableExtensions', 'openDevtools'))
        Object.assign(
            defaultConfig.development!.extensionBootstrap!,
            pickObj(configMerged, 'autoReload', 'closeWindowOnExit', 'developmentCommands', 'revealOutputChannel'),
        )
    }

    if (isInsiders) defaultConfig.development!.executable = 'code-insiders'
    if (process.env.VSC_FRAMEWORK_EXEC) defaultConfig.development!.executable = process.env.VSC_FRAMEWORK_EXEC as any
    const merged: UserConfig = mergeDeepRight(defaultConfig, config)
    if (
        process.platform !== 'win32' &&
        !merged.development!.disableExtensions &&
        ((globalConfigMerged?.disableExtensions as { length?: number } | undefined)?.length || globalConfigMerged?.enableExtensions?.length)
    ) {
        const enableExtensions = globalConfigMerged?.enableExtensions?.length ? globalConfigMerged.enableExtensions : undefined
        let disableExtensions
        const exec = merged.development!.executable ?? 'code'
        if (enableExtensions) {
            const { stdout } = execa.sync(exec, ['--list-extensions'])
            disableExtensions = stdout.split('\n').filter(ext => !enableExtensions.includes(ext))
        } else {
            disableExtensions = globalConfigMerged?.disableExtensions
        }

        const launchFile = join(os.tmpdir(), 'vscode-framework-launch.sh')
        disableExtensions = disableExtensions.map(ext => `--disable-extension "${ext}"`)
        writeFileSync(launchFile, `#!/bin/bash\n${exec} ${disableExtensions.join(' ')} "$@"`, 'utf-8')
        chmodSync(launchFile, 0o755)
        merged.development!.executable = launchFile as any
        merged.development!.disableExtensions = false
    }

    if (forceExecutable) merged.development!.executable = 'forceExecutable' as any
    return merged
}
