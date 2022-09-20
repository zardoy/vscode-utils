import { join, resolve } from 'path'
import { writeFileSync } from 'fs'
import { ensureDir } from 'fs-extra'
import { build, BuildOptions } from 'esbuild'
import { readPackageJsonFile, writePackageJsonFile } from 'typed-jsonfile'
import { PackageJson } from 'type-fest'

/**
 * @param entrypoint dir with src/index.ts and package.json if string
 */
export default async (
    entrypoint: string | { file: string },
    name?: string,
    outDir?: string,
    { enableBrowser, ...buildOptions }: BuildOptions & { enableBrowser?: boolean } = {},
) => {
    let packageJson: { name?: string; version?: string } | undefined
    if (typeof entrypoint === 'string') packageJson = await readPackageJsonFile({ dir: entrypoint })
    if (!name) {
        if (!packageJson) throw new Error('name must be specified when using not dir entrypoint')
        name = packageJson.name!
    }

    outDir = resolve(outDir ?? `out/node_modules/${name}`)
    await ensureDir(outDir)
    const pkgOutput = {
        name,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        version: packageJson?.version || '0.0.0',
        main: 'index.js',
    } as PackageJson
    const nodeShimEntrypoint = 'index-node.js'
    if (enableBrowser) {
        pkgOutput.browser = 'index.mjs'
        pkgOutput.main = nodeShimEntrypoint
    }

    await writePackageJsonFile({ dir: outDir }, pkgOutput)
    if (enableBrowser) {
        buildOptions = { format: 'esm', platform: 'browser', ...buildOptions }
        writeFileSync(join(outDir, nodeShimEntrypoint), commonJsShim, 'utf8')
    }

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
        entryPoints: [resolve(...(typeof entrypoint === 'string' ? [entrypoint, 'src/index.ts'] : entrypoint.file))],
        outfile: join(outDir, enableBrowser ? 'index.mjs' : 'index.js'),
        mainFields: ['module', 'main'],
        ...buildOptions,
    })
}

const commonJsShim = /* js */ `
// I don't want to patch esbuild output so using this
// or create second bundle and make extension 2x larger

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
