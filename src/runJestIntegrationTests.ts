/* eslint-disable @typescript-eslint/naming-convention */
import path from 'path'
import { runCLI } from 'jest'

interface ITestRunner {
    run(testsRoot: string, clb: (error?: Error, failures?: number) => void): void
}

const jestTestRunnerForVSCodeE2E = ({ noExit = false } = {}): ITestRunner => ({
    run(testsRoot, reportTestResults) {
        if (!noExit && process.env.NO_EXIT === '1') noExit = true
        const projectRootPath = process.cwd()
        const config = path.join(projectRootPath, 'jest.e2e.config.js')

        runCLI({ config } as any, [projectRootPath])
            .then(jestCliCallResult => {
                for (const testResult of jestCliCallResult.results.testResults) {
                    for (const { ancestorTitles, title, status } of testResult.testResults.filter(assertionResult => assertionResult.status === 'passed')) {
                        console.info(`  ● ${ancestorTitles.join(',')} > ${title} (${status})`)
                    }
                }

                for (const testResult of jestCliCallResult.results.testResults) {
                    if (testResult.failureMessage) {
                        console.log(testResult.failureMessage)
                    }
                }

                if (!noExit) reportTestResults(undefined, jestCliCallResult.results.numFailedTests)
            })
            .catch(error => {
                if (!noExit) reportTestResults(error, 0)
            })
    },
})

export default jestTestRunnerForVSCodeE2E
