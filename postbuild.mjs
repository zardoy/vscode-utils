import fs from 'fs'

const { include } = JSON.parse(fs.readFileSync('./tsconfig.cjs.json'))

const fromWatch = process.argv.includes('--watch')

for (const file of include) {
    const buildFile = `build/${file.slice('src/'.length, -3)}.js`
    try {
        fs.renameSync(buildFile, `${buildFile.slice(0, -3)}.cjs`)
        fs.renameSync(`${buildFile.slice(0, -3)}.d.ts`, `${buildFile.slice(0, -3)}.cjs.d.ts`)
    } catch (err) {
        if (!fromWatch) throw err
    }
}
