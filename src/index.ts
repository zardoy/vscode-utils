import * as vscode from 'vscode'

export const getActiveRegularEditor = () => {
    const editor = vscode.window.activeTextEditor
    if (editor === undefined || editor.viewColumn === undefined) return
    return editor
}
