import { join, resolve } from 'path'
import { existsSync, writeFileSync } from 'fs'
import { ensureDir } from 'fs-extra'
import { build, BuildOptions } from 'esbuild'
import { readPackageJsonFile, writeJsonFile } from 'typed-jsonfile'
import { PackageJson } from 'type-fest'
import { modifyJsonFile } from 'modify-json-file'

/**
 * @param entrypoint dir with src/index.ts and package.json if string
 */
export default async (
    entrypoint: string | { file: string },
    name?: string,
    outDir?: string,
    { enableBrowser, nodeShim, ...buildOptions }: BuildOptions & { enableBrowser?: boolean; nodeShim?: boolean } = {},
) => {
    let packageJson: { name?: string; version?: string } | undefined
    try {
        if (typeof entrypoint === 'string') packageJson = await readPackageJsonFile({ dir: entrypoint })
    } catch {}

    if (!name) {
        if (!packageJson) throw new Error('name must be specified when using not dir entrypoint or no package.json')
        name = packageJson.name!
    }

    outDir = resolve(outDir ?? `out/node_modules/${name}`)
    await ensureDir(outDir)
    const pkgOutput = {
        name,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        version: packageJson?.version || '0.0.0',
    } as PackageJson
    if (enableBrowser === undefined && process.argv.includes('--browser')) enableBrowser = true
    const nodeShimEntrypoint = 'index-node.js'
    let outputFile = 'index.js'
    if (enableBrowser) {
        buildOptions = { format: 'esm', platform: 'browser', ...buildOptions }
        outputFile = 'index.mjs'
        pkgOutput.browser = outputFile
        if (nodeShim) {
            pkgOutput.main = nodeShimEntrypoint
            writeFileSync(join(outDir, nodeShimEntrypoint), commonJsShim, 'utf8')
        }
    } else {
        pkgOutput.main = outputFile
    }

    const pkgJsonPath = join(outDir, 'package.json')
    if (!existsSync(pkgJsonPath)) await writeJsonFile(pkgJsonPath, {})
    await modifyJsonFile(pkgJsonPath, pkgOutput, { ifPropertyIsMissing: 'add' })

    const enableWatch = process.argv.includes('--watch')
    // TODO build twice, when no watch, like vscode-framework does
    // as in theory dynamic import can impact startup perf
    await build({
        bundle: true,
        platform: 'node',
        treeShaking: true,
        format: 'cjs',
        logLevel: 'info',
        watch: enableWatch,
        sourcemap: enableWatch,
        // for easier debuggin, even on prod
        keepNames: true,
        entryPoints: [resolve(...(typeof entrypoint === 'string' ? [entrypoint, 'src/index.ts'] : entrypoint.file))],
        outfile: join(outDir, outputFile),
        // fix for jsonc-parser
        mainFields: ['module', 'main'],
        ...buildOptions,
    })
}

const commonJsShim = /* js */ `
// It was an experiment to try not to patch esbuild output
// or create second bundle and make extension 2x larger
// The only issue here is that import delay

module.exports = (rootInput) => {
    let initConfig
    let onConfigurationChanged
    let info
    // Set up decorator object
    const proxy = Object.create(null)

    import('./index.mjs').then((mod) => {
        const {create, onConfigurationChanged: _onConfigurationChanged} = mod.default(rootInput)
        onConfigurationChanged = _onConfigurationChanged
        Object.assign(proxy, create({ ...info, config: initConfig }))
    })
    return {
        create(_info) {
            info = _info
            initConfig = info.config
            for (const k of Object.keys(info.languageService)) {
                const x = info.languageService[k]
                // @ts-expect-error - JS runtime trickery which is tricky to type tersely
                proxy[k] = (...args) => x.apply(info.languageService, args)
            }
            // avg delay between setting up the proxy is 700ms
            return proxy
        },
        onConfigurationChanged(config) {
            if (onConfigurationChanged) onConfigurationChanged(config)
            else initConfig = config
        }
    }
}

`
