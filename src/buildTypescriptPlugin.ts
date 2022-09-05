import { join, resolve } from 'path'
import { ensureDir } from 'fs-extra'
import { build, BuildOptions } from 'esbuild'
import { readPackageJsonFile, writePackageJsonFile } from 'typed-jsonfile'

/**
 * @param entrypoint dir with src/index.ts and package.json if string
 */
export default async (entrypoint: string | { file: string }, name?: string, outDir?: string, buildOptions: BuildOptions = {}) => {
    let packageJson: { name?: string; version?: string } | undefined
    if (typeof entrypoint === 'string') packageJson = await readPackageJsonFile({ dir: entrypoint })
    if (!name) {
        if (!packageJson) throw new Error('name must be specified when using not dir entrypoint')
        name = packageJson.name!
    }

    outDir = resolve(outDir ?? `out/node_modules/${name}`)
    await ensureDir(outDir)
    await writePackageJsonFile(
        { dir: outDir },
        {
            name,
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            version: packageJson?.version || '0.0.0',
            main: 'index.js',
        },
    )
    await build({
        bundle: true,
        platform: 'node',
        treeShaking: true,
        format: 'cjs',
        entryPoints: [resolve(...(typeof entrypoint === 'string' ? [entrypoint, 'src/index.ts'] : entrypoint.file))],
        outfile: join(outDir, 'index.js'),
        mainFields: ['module', 'main'],
        ...buildOptions,
    })
}
