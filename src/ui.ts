import * as vscode from 'vscode'
import { extensionCtx } from 'vscode-framework'

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

/** Type of notification that is not annoying */
export const friendlyNotification = async (
    message: string,
    // eslint-disable-next-line @typescript-eslint/default-param-last
    id = message,
    type: keyof typeof typeConfirmAction,
    timeout = 60_000 * 60,
    additionalButton?: string,
) => {
    const updateTimeout = timeout !== 0
    const currentDialog = updateTimeout ? extensionCtx.globalState.get<number | false | undefined>(`ui:dialog:${id}`) : undefined

    if (currentDialog === false) return
    if (currentDialog && Date.now() - currentDialog < timeout) return
    const doNotShowAgainButton = 'Do not show again'
    const selectedAction = await vscode.window[typeConfirmAction[type]](
        message,
        ...(additionalButton ? [additionalButton, doNotShowAgainButton] : [doNotShowAgainButton]),
    )
    if (selectedAction === doNotShowAgainButton) {
        await extensionCtx.globalState.update(`ui:dialog:${id}`, false)
    }

    if (updateTimeout) {
        await extensionCtx.globalState.update(`ui:dialog:${id}`, Date.now())
    }

    return selectedAction
}
