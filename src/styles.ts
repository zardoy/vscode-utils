import * as vscode from 'vscode'
import { findCurrentOutlineItem, makeOutlineChainFromPos } from './outline'
import { getNormalizedVueOutline } from './vue'

const stylesLangs = new Set(['css', 'scss', 'less'])
// not including svelte as it is really slow
const langsSupportOutline = new Set(['html', 'vue'])

let missingDepWarning = false
/** Appliable for document.etText */
export const getStylesRange = async (document: vscode.TextDocument, position: vscode.Position) => {
    if (stylesLangs.has(document.languageId)) return new vscode.Range(0, 0, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)
    if (langsSupportOutline.has(document.languageId)) {
        if (document.languageId === 'vue') {
            const outline = await getNormalizedVueOutline(document.uri)
            if (!outline) {
                if (!missingDepWarning) {
                    console.warn('No default vue outline. Install Volar or Vetur')
                    missingDepWarning = true
                }

                return
            }

            // eg style scoped
            const stylesOutlineItem = outline.find(item => item.name.startsWith('style'))
            return stylesOutlineItem?.range.contains(position) ? stylesOutlineItem.range : undefined
        }

        const outline: vscode.DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri)
        const outlineChain = makeOutlineChainFromPos(outline, position)
        if (outlineChain[2]?.name === 'style') {
            const { range } = outlineChain[2]
            return range.with(range.start.translate(0, '<style>'.length), range.end.translate(0, -'</style>'.length))
        }

        return
    }

    return undefined
}

// const getDocumentFullRange = (document: vscode.TextDocument) => {
//     const lastLinePos = document.lineAt(document.lineCount - 1).range.end
//     return new vscode.Range(new vscode.Position(0, 0), lastLinePos)
// }
