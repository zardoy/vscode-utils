import * as vscode from 'vscode'
import { Utils as URIUtils } from 'vscode-uri'
import { fsExists } from './fs'

type Alias = {
    name: string
    path: string
    uri: vscode.Uri
}

export type WebpackConfigResult = {
    /** doesn't preserve order */
    aliases: Alias[]
    cacheVersion: number
}

const cachedWebpackConfigs = new Map<string, [number, WebpackConfigResult]>()

// ideally should look for closest webpack config, but would take more time to resolve
// not accurate and not specific
/**
 * opinionated, resolve or join (__dirname, ...) based (for roots)
 * @argument normalizeNames remove trailing / in alias name
 */
export const readWebpackAliases = async (
    webpackUri?: vscode.Uri,
    normalizeNames = true,
    ignoreAliasEnding = ['.css', '.scss'],
): Promise<WebpackConfigResult | undefined> => {
    if (!webpackUri) {
        const firstWorkspace = vscode.workspace.workspaceFolders?.[0]
        const activeDocumentUri = vscode.window.activeTextEditor?.document.uri
        const workspace =
            activeDocumentUri && activeDocumentUri.scheme !== 'untitled'
                ? vscode.workspace.getWorkspaceFolder(activeDocumentUri) ?? firstWorkspace
                : firstWorkspace
        if (!workspace) return
        webpackUri = vscode.Uri.joinPath(workspace.uri, 'webpack.config.js')
    }

    if (!(await fsExists(webpackUri))) return
    const document = await vscode.workspace.openTextDocument(webpackUri)
    const stringUri = document.uri.toString()
    const cachedConfig = cachedWebpackConfigs.get(stringUri)
    if (cachedConfig && cachedConfig[0] === document.version) return cachedConfig[1]
    const outline: vscode.DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri)
    const aliasIndex = /alias: ?{/.exec(document.getText())?.index
    if (aliasIndex === undefined) return
    const aliasPos = document.positionAt(aliasIndex)
    const tryToFindAliases = (items: vscode.DocumentSymbol[]): vscode.DocumentSymbol | void => {
        items.sort((a, b) => a.range.end.compareTo(b.range.end))
        for (const item of items) {
            if (item.name === 'alias' && item.range.contains(aliasPos)) return item
            const itemFromChildren = tryToFindAliases(item.children)
            if (itemFromChildren) return itemFromChildren
        }
    }

    const aliasOutline = tryToFindAliases(outline)
    if (!aliasOutline) return

    const getAliasData = (alias: vscode.DocumentSymbol): void | Alias => {
        // TODO to utils: parse object outline
        let name = document.getText(alias.selectionRange)
        if (/["']/.test(name)) name = name.slice(1, -1)
        if (normalizeNames && name.endsWith('/')) name = name.slice(0, -1)
        const content = document.getText(alias.range.with(alias.selectionRange.end)).slice(1).trim()
        const guessedImport = /(?:path.)?(?:resolve|join)\(__dirname, (.+)\)/.exec(content)?.[1]
        if (!guessedImport) return
        const guessedPath = guessedImport
            .split(/,\s?/)
            .map(str => str.slice(1, -1))
            .join('/')

        if (ignoreAliasEnding.some(ext => guessedPath.endsWith(ext))) return

        return { name, path: guessedPath, uri: vscode.Uri.joinPath(URIUtils.dirname(webpackUri!), guessedPath) }
    }

    return cachedWebpackConfigs.set(stringUri, [
        document.version,
        {
            aliases: aliasOutline.children.map(alias => getAliasData(alias)!).filter(Boolean),
            cacheVersion: document.version,
        },
    ])[1]
}

export const getTsconfigWithWebpackAliases = async (
    webpackUri?: vscode.Uri,
    ignoreAliasEnding?: string[],
): Promise<{ compilerOptions?: { baseUrl: './'; paths: Record<string, string[]> } }> => {
    const webpackAliases = await readWebpackAliases(webpackUri, true, ignoreAliasEnding)
    const jsFileEndings = ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx', '.json']
    if (!webpackAliases) return {}
    return {
        compilerOptions: {
            baseUrl: './',
            paths: Object.fromEntries(
                webpackAliases.aliases.map(({ name, path }) => {
                    const isFile = path.split('/').at(-1)!.includes('.') && jsFileEndings.some(ext => path.endsWith(ext))
                    // ensure is relative (to baseUrl)
                    if (!path.startsWith('./')) path = `./${path}`
                    return [isFile ? name : `${name}/*`, [isFile ? path : `${path}/*`]]
                }),
            ),
        },
    }
}
