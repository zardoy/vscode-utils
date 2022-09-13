import * as vscode from 'vscode'

// export let useCompletionNiceLook

// export const prepareNiceLookingCompletinon = () => {}
export const niceLookingCompletion = (ext: string, isFolderKind = false, fallbackKind = vscode.CompletionItemKind.Property) =>
    vscode.workspace.getConfiguration('workbench', null).get('iconTheme') === 'vscode-icons'
        ? {
              kind: isFolderKind ? vscode.CompletionItemKind.Folder : vscode.CompletionItemKind.File,
              detail: ext,
          }
        : {
              kind: fallbackKind,
          }
