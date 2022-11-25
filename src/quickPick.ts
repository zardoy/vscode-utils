/* eslint-disable unicorn/consistent-destructuring */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode'
import { Except } from 'type-fest'
import { VSCodeQuickPickItem } from 'vscode-framework'
import { pickObj } from '@zardoy/utils'

type QuickPickCallbackOptions = Pick<vscode.QuickPick<any>, 'onDidChangeValue' | 'onDidTriggerButton'>

type QuickPickMethods = {
    [K in keyof QuickPickCallbackOptions]?: QuickPickCallbackOptions[K] extends vscode.Event<infer U> ? (this: vscode.QuickPick<any>, event: U) => void : never
}

export type ThisQuickPick<T> = Omit<vscode.QuickPick<VSCodeQuickPickItem<T>>, 'dispose'> & {
    /** @deprecated Use `hide()` instead*/
    dispose: vscode.QuickPick<any>['dispose']
}

// TODO allow to accept promise
/** Shows a selection list. {@linkcode vscode.window.createQuickPick} wrapper. Enhenced version of {@linkcode vscode.window.showQuickPick} */
export const showQuickPick = async <T, M extends boolean = false>(
    items: Array<VSCodeQuickPickItem<T>>,
    options: Except<vscode.QuickPickOptions, 'onDidSelectItem'> &
        QuickPickMethods & {
            canPickMany?: M
            /** Initially active item (not selected) */
            initialSelectedIndex?: number
            onDidChangeActive?: (this: ThisQuickPick<T>, items: ReadonlyArray<VSCodeQuickPickItem<T>>, index: number) => any
            onDidChangeFirstActive?: (this: ThisQuickPick<T>, item: VSCodeQuickPickItem<T>, index: number) => any
            onDidTriggerItemButton?: (this: ThisQuickPick<T>, button: vscode.QuickPickItemButtonEvent<VSCodeQuickPickItem<T>>) => any
            onDidShow?: (this: ThisQuickPick<T>) => any
            initialValue?: string
            // eslint-disable-next-line @typescript-eslint/ban-types
        } & (M extends true ? { onDidChangeSelection?: (items: ReadonlyArray<VSCodeQuickPickItem<T>>) => any; initialAllSelected?: boolean } : {}) = {},
): Promise<(M extends true ? T[] : T) | undefined> => {
    const quickPick = vscode.window.createQuickPick<VSCodeQuickPickItem<any>>()
    quickPick.items = items
    if (!options.canPickMany) {
        const preselectedItemIndex = quickPick.items.findIndex(({ picked }) => picked)
        if (preselectedItemIndex >= 0) quickPick.activeItems = [quickPick.items[preselectedItemIndex]!]
    }

    Object.assign(quickPick, pickObj(options, 'ignoreFocusOut', 'matchOnDescription', 'matchOnDetail', 'placeHolder', 'title'))
    quickPick.placeholder = options.placeHolder
    quickPick.canSelectMany = options.canPickMany!
    if (options.initialValue) quickPick.value = options.initialValue
    const { initialSelectedIndex, onDidChangeActive, onDidChangeFirstActive } = options
    const initialSelectedItem = initialSelectedIndex && items[initialSelectedIndex]
    if (initialSelectedItem) quickPick.activeItems = [initialSelectedItem]
    if ('initialAllSelected' in options && options.initialAllSelected) {
        quickPick.selectedItems = quickPick.items
    }

    if (onDidChangeActive) {
        quickPick.onDidChangeActive(newActiveItems => {
            const index = items.indexOf(newActiveItems[0]!)
            onDidChangeActive.call(quickPick, newActiveItems, index)
        })
    }

    if (onDidChangeFirstActive) {
        quickPick.onDidChangeActive(newActiveItems => {
            const firstItem = newActiveItems[0]
            if (!firstItem) return
            const index = items.indexOf(firstItem)
            onDidChangeFirstActive.call(quickPick, firstItem, index)
        })
    }

    const ignoreBindingCallbacks = new Set<string>(['onDidChangeActive', 'onDidShow', 'onDidChangeFirstActive'])
    // bind callbacks
    for (const [name, callback] of Object.entries(options)) {
        if (name.startsWith('onDid') && !ignoreBindingCallbacks.has(name)) quickPick[name]((callback as any).bind(quickPick))
    }

    const selectedValues = await new Promise<(M extends true ? T[] : T) | undefined>(resolve => {
        quickPick.onDidHide(() => {
            resolve(undefined)
            quickPick.dispose()
        })
        quickPick.onDidAccept(() => {
            // align with default showQuickPick behavior
            if (quickPick.items.length === 0) return
            const { selectedItems } = quickPick
            resolve(options.canPickMany ? selectedItems?.map(item => item.value) : selectedItems[0]?.value)
            quickPick.hide()
        })
        quickPick.show()
        options.onDidShow?.call(quickPick)
    })

    return selectedValues
}
