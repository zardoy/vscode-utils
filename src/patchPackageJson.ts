import fs from 'fs'
import { watch } from 'chokidar'
import { ManifestType, ContributesConfigurationType } from 'vscode-manifest'
import { Settings } from 'vscode-framework'

type MaybePromise<T> = T | Promise<T>

type Config = Partial<{
    changeToMarkdownDescription: boolean
    changeToMarkdownDeprecated: boolean
    changeToMarkdownEnumDescription: boolean
    rawPatchManifest<T extends ManifestType>(manifest: T): MaybePromise<T | void>
    patchSettings(configuration: Settings): MaybePromise<Settings>
}>

export const patchPackageJson = ({
    changeToMarkdownDeprecated = true,
    changeToMarkdownDescription = true,
    changeToMarkdownEnumDescription = true,
    rawPatchManifest,
    patchSettings,
}: Config) => {
    const outPackageJson = 'out/package.json'
    const watcher = watch([outPackageJson]).on('change', async () => {
        let manifest = JSON.parse(fs.readFileSync(outPackageJson, 'utf-8'))
        const { properties } = manifest.contributes.configuration as ContributesConfigurationType
        for (const [, property] of Object.entries(properties)) {
            if (changeToMarkdownDescription && property.description) {
                property.markdownDescription = property.description
                delete property.description
            }

            if (changeToMarkdownDeprecated && property.deprecationMessage) {
                property.markdownDeprecationMessage = property.deprecationMessage
                delete property.deprecationMessage
            }

            if (changeToMarkdownEnumDescription && property.enumDescriptions) {
                property.markdownEnumDescriptions = property.enumDescriptions
                delete property.enumDescriptions
            }
        }

        if (patchSettings) {
            let prefix: string
            manifest.contributes.configuration.properties = Object.fromEntries(
                Object.entries(
                    await patchSettings(
                        Object.fromEntries(
                            Object.entries(properties).map(([setting, value]) => {
                                const parts = setting.split('.')
                                prefix = parts[0]!
                                return [parts.slice(1).join('.'), value]
                            }),
                        ),
                    ),
                ).map(([key, value]) => [`${prefix}.${key}`, value]),
            )
        }

        const userPatched = await rawPatchManifest?.(manifest)
        if (userPatched) manifest = userPatched
        fs.writeFileSync(outPackageJson, JSON.stringify(manifest, undefined, 4), 'utf-8')
        if (process.argv[2] === 'build') watcher.close()
    })
}
