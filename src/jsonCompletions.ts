import * as vscode from 'vscode'
import { Location } from 'jsonc-parser'

export function getJsonCompletingInfo(
    location: Location,
    document: vscode.TextDocument,
    pos: vscode.Position,
): false | { insideStringRange: vscode.Range | undefined } {
    if (location.isAtPropertyKey) return false

    const { previousNode } = location
    if (previousNode) {
        const offset = document.offsetAt(pos)
        const insideNode = offset >= previousNode.offset && offset <= previousNode.offset + previousNode.length
        if (!insideNode) return false
        // perhaps string
        const nodeStart = previousNode.offset + 1
        const nodeEnd = nodeStart + previousNode.length - 2
        return {
            insideStringRange:
                previousNode.type === 'string' && offset >= nodeStart && offset <= nodeEnd
                    ? new vscode.Range(document.positionAt(nodeStart), document.positionAt(nodeEnd))
                    : undefined,
        }
    }

    return { insideStringRange: undefined }
}

export const jsonPathEquals = (path: Array<string | number>, toCompare: string[], endsWithNumber = false) => {
    if (endsWithNumber) {
        if (typeof path.slice(-1)[0] !== 'number') return false
        path = path.slice(0, -1)
    }

    for (const [i, val] of toCompare.entries())
        if (val === '*') {
            if (path[i] === undefined) return false
        } else if (path[i] !== val) {
            return false
        }

    return true
}

export const jsonValuesToCompletions = (items: string[], range: vscode.Range) =>
    items.map(
        (item): vscode.CompletionItem => ({
            label: item,
            kind: vscode.CompletionItemKind.Value,
            range,
        }),
    )
