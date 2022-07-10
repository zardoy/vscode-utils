import * as vscode from 'vscode'

export const findCurrentOutlineItem = (items: vscode.DocumentSymbol[], pos: vscode.Position): vscode.DocumentSymbol | undefined => {
    let itemIndex = -1
    for (const [i, item] of items.entries()) {
        if (item.children.length > 0) {
            const foundItem = findCurrentOutlineItem(item.children, pos)
            if (foundItem) return foundItem
        }

        if (item.range.contains(pos)) itemIndex = i
    }

    if (itemIndex === -1) return
    return items[itemIndex]!
}

export const makeOutlineChainFromPos = (rootItems: vscode.DocumentSymbol[], pos: vscode.Position): vscode.DocumentSymbol[] => {
    const chain: vscode.DocumentSymbol[] = []
    const findMe = (items: vscode.DocumentSymbol[]) => {
        let itemIndex = -1
        for (const [i, item] of items.entries()) {
            if (item.range.contains(pos)) chain.push(item)

            if (item.children.length > 0) {
                const foundItem = findMe(item.children)
                if (foundItem) return foundItem
            }

            if (item.range.contains(pos)) itemIndex = i
        }

        if (itemIndex === -1) return
        return items[itemIndex]!
    }

    findMe(rootItems)
    return chain
}

// null - any
// export const findFirstOutlineItem = (items: vscode.DocumentSymbol[], comporator: (Pick<vscode.DocumentSymbol, 'name' | 'detail' | 'kind'> | null)[], pos?: vscode.Position, depth?: {max?: number, min?: number} | {exact?: number})
