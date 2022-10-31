import * as vscode from 'vscode'
import { relative } from 'path-browserify'

/**
 * Get workspace of current opened editor or **first one** otherwise
 * @throws If no workspace is opened
 */
export const getCurrentWorkspaceRoot = () => {
    const firstWorkspace = vscode.workspace.workspaceFolders?.[0]
    if (!firstWorkspace) throw new Error('This action is available only in opened workspace (folder)')
    const activeDocumentUri = vscode.window.activeTextEditor?.document.uri
    return activeDocumentUri && activeDocumentUri.scheme !== 'untitled'
        ? vscode.workspace.getWorkspaceFolder(activeDocumentUri) ?? firstWorkspace
        : firstWorkspace
}

export const fsExists = async (uri: vscode.Uri, isFile?: boolean) => {
    const { fs } = vscode.workspace
    try {
        const stats = await fs.stat(uri)
        // eslint-disable-next-line no-bitwise
        return isFile === undefined ? true : isFile ? stats.type & vscode.FileType.File : stats.type & vscode.FileType.Directory
    } catch {
        return false
    }
}

export const firstExists = async <T>(
    paths: Array<{
        name: T
        uri: vscode.Uri
        isFile?: boolean
    }>,
) => {
    // not using Promise.race alternatives to ensure the order remains the same
    // eslint-disable-next-line no-await-in-loop
    for (const { uri, name, isFile } of paths) if (await fsExists(uri, isFile)) return name
    return undefined
}

export const vscodeReadFile = async (uri: vscode.Uri) => new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))

export const vscodeWriteFile = async (uri: vscode.Uri, content: string) => vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content))

export const vscodeFindUpMultiple = async (cwd: vscode.Uri, name: string, isFile?: boolean, stopAtWorkspace = true): Promise<vscode.Uri[]> => {
    const currentWorkspacePath = stopAtWorkspace ? vscode.workspace.getWorkspaceFolder(cwd) : null
    if (currentWorkspacePath === undefined) return []
    const foundUris: vscode.Uri[] = []

    let currentBaseUri = cwd
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const currentCheckUri = vscode.Uri.joinPath(currentBaseUri, name)
        // eslint-disable-next-line no-await-in-loop
        if (await fsExists(currentCheckUri, isFile)) foundUris.push(currentCheckUri)

        if (currentWorkspacePath) {
            if (relative(currentBaseUri.path, currentWorkspacePath.uri.path) === '') break
            currentBaseUri = vscode.Uri.joinPath(currentBaseUri, '..')
        } else {
            // stopAtWorkspace is false
            const oldUri = currentBaseUri
            currentBaseUri = vscode.Uri.joinPath(currentBaseUri, '..')
            // reached the disk root
            if (oldUri.path === currentBaseUri.path) break
        }
    }

    return foundUris
}
