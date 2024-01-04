import * as vscode from 'vscode'

export const getActiveRegularEditor = () => {
    const editor = vscode.window.activeTextEditor
    if (editor === undefined || editor.viewColumn === undefined) return
    return editor
}

export const selectionToRange = (selection: vscode.Selection) => new vscode.Range(selection.start, selection.end)
export const rangeToSelection = (selection: vscode.Range) => new vscode.Selection(selection.start, selection.end)

type RegisterTextEditorCommand = (
    command: keyof import('vscode-framework').RegularCommands,
    callback: (editor: vscode.TextEditor, edit: vscode.TextEditorEdit, ...args: any[]) => void,
) => vscode.Disposable
export const registerTextEditorCommand: RegisterTextEditorCommand = (command, callback) => vscode.commands.registerTextEditorCommand(command, callback)

export { ManifestType } from 'vscode-manifest'
