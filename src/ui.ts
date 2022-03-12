import * as vscode from 'vscode'

// General UI actions (except quickpick)

export const notificationConfirmAction = async (message: string, confirmButton: string) => {
    const selectedAction = await vscode.window.showInformationMessage(message, confirmButton)
    return selectedAction === confirmButton
}
