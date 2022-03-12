import { equals } from 'rambda'
import { ensureArray } from '@zardoy/utils'

export const defaultJsSupersetLangs = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact']
export const defaultJsSupersetLangsWithVue = [...defaultJsSupersetLangs, 'vue']
export const defaultLanguageSupersets = {
    js: ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'],
    react: ['javascriptreact', 'typescriptreact'],
    ts: ['typescript', 'typescriptreact'],

    styles: ['css', 'scss', 'sass', 'source.css.styled'],
}

// mainly used in better-snippets

export const normalizeLanguages = (language: string | string[], loadedLanguageSupersets: { [langSuperset: string]: string[] }) =>
    ensureArray(language).flatMap(language => loadedLanguageSupersets[language] ?? language)

export const areLangsEquals = (a: string[], b: string[]) => equals(a.sort(), b.sort())
