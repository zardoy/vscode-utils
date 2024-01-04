import * as vscode from 'vscode'
import { getExtensionCommandId } from 'vscode-framework'

type RegisterTextEditorCommand = (
    command: keyof import('vscode-framework').RegularCommands,
    callback: (editor: vscode.TextEditor, edit: vscode.TextEditorEdit, ...args: any[]) => void,
) => vscode.Disposable
export const registerTextEditorCommand: RegisterTextEditorCommand = (command, callback) =>
    vscode.commands.registerTextEditorCommand(getExtensionCommandId(command), callback)
