import * as vscode from 'vscode'

export const insertEditorText = (text: string, editor = vscode.window.activeTextEditor) => {
    if (!editor) return
    void editor.edit((builder) => {
        for (const {active: pos} of editor.selections)
            builder.insert(pos, text)
    })
}
