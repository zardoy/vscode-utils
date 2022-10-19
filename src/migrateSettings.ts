/* eslint-disable no-await-in-loop */
// eslint-disable-next-line unicorn/import-style
import { ConfigurationTarget, window, workspace, WorkspaceConfiguration } from 'vscode'
import { Settings } from 'vscode-framework'
import { LiteralUnion } from 'type-fest'

type MaybePromise<T> = T | Promise<T>
type SettingKey = keyof Settings

type SettingMigrateData =
    | {
          rename: {
              //
              old: string
              new: LiteralUnion<SettingKey, string>
              /** Wether user setting value must be primitive */
              mustBePrimitive: boolean
          }
      }
    | {
          detect(configuration: WorkspaceConfiguration): MaybePromise<boolean>
          handle(configuration: WorkspaceConfiguration): MaybePromise<string>
      }

export const migrateExtensionSettings = async (migrators: SettingMigrateData[], extContributionPrefix: string) => {
    const configuration = workspace.getConfiguration(extContributionPrefix, null)
    const migratedSettings: string[] = []
    for (const migrator of migrators) {
        let handle
        if ('rename' in migrator) {
            const {
                rename: { old, new: newId, mustBePrimitive },
            } = migrator
            const userGlobalValue = configuration.inspect(old)?.globalValue
            if (userGlobalValue === undefined || (mustBePrimitive && typeof userGlobalValue === 'object')) continue
            await configuration.update(old, undefined, ConfigurationTarget.Global)
            await configuration.update(newId, userGlobalValue, ConfigurationTarget.Global)
            migratedSettings.push(old)
        } else {
            const { detect, handle } = migrator
            const shouldMigrate = await detect(configuration)
            if (!shouldMigrate) continue
            const migratedSetting = await handle(configuration)
            migratedSettings.push(migratedSetting)
        }
    }

    if (migratedSettings.length > 0) void window.showInformationMessage(`Migrated global settings: ${migratedSettings.join(', ')}`)
}
