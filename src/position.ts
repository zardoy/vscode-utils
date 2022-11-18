// also mb include fns for range

import * as vscode from 'vscode'

export const offsetPosition = (document: vscode.TextDocument, position: vscode.Position, offset: number) =>
    document.positionAt(Math.max(document.offsetAt(position) + offset, 0))

export const expandPosition = (document: vscode.TextDocument, position: vscode.Position, offset: number) =>
    new vscode.Range(position, offsetPosition(document, position, offset))
