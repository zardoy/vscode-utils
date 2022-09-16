import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Import local package from repo */
const importFromRepo = async (importPath: string) => {
  const resolvedImportPath = pathToFileURL(`${process.cwd()}/node_modules/${importPath}`).toString()
  return import(resolvedImportPath)
}

export default async () => {
  const { runConfigurationGenerator } = await importFromRepo('vscode-framework/build/cli/configurationFromType.js')
  if (fs.existsSync('src/configurationType.ts') && !fs.existsSync('src/configurationTypeCache.jsonc')) await runConfigurationGenerator('')
}
