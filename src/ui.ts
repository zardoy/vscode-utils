import * as vscode from 'vscode'

// General UI actions (except quickpick)

const typeConfirmAction = {
    info: 'showInformationMessage',
    warn: 'showWarningMessage',
    error: 'showErrorMessage',
}

export const notificationConfirmAction = async (message: string, confirmButtonText: string, type: keyof typeof typeConfirmAction = 'info') => {
    const selectedAction = await vscode.window[typeConfirmAction[type]](message, confirmButtonText)
    return selectedAction === confirmButtonText
}
