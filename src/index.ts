import * as vscode from 'vscode'

export const getActiveRegularEditor = () => {
    const editor = vscode.window.activeTextEditor
    if (editor === undefined || editor.viewColumn === undefined) return
    return editor
}

export const selectionToRange = (selection: vscode.Selection) => new vscode.Range(selection.start, selection.end)
export const rangeToSelection = (selection: vscode.Range) => new vscode.Selection(selection.start, selection.end)

export { ManifestType } from 'vscode-manifest'
