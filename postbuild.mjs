import fs from 'fs'

const { include } = JSON.parse(fs.readFileSync('./tsconfig.cjs.json'))

for (const file of include) {
    const buildFile = `build/${file.slice('src/'.length, -3)}.js`
    fs.renameSync(buildFile, `${buildFile.slice(0, -3)}.cjs`)
    fs.renameSync(`${buildFile.slice(0, -3)}.d.ts`, `${buildFile.slice(0, -3)}.cjs.d.ts`)
}
