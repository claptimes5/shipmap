// Sets shipmap up in a project: creates features.json and offers to add the
// keep-it-true rules to the project's AGENTS.md / CLAUDE.md.
//   node tools/shipmap/init.mjs [project-root] [--yes]
import { appendFileSync, copyFileSync, existsSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url"

const args = process.argv.slice(2)
const yes = args.includes("--yes") || args.includes("-y")
const root = resolve(args.find((a) => !a.startsWith("-")) ?? ".")
const kit = dirname(fileURLToPath(import.meta.url))
const snippet = readFileSync(join(kit, "AGENTS.snippet.md"), "utf8")
const marker = snippet.split("\n")[0] // "## Feature map"

const rl = process.stdin.isTTY && !yes ? createInterface({ input: process.stdin, output: process.stdout }) : null
const ask = async (q) => yes || (rl !== null && /^y/i.test(await rl.question(`${q} [y/N] `)))

const features = join(root, "features.json")
if (existsSync(features)) console.log("features.json exists, leaving it alone")
else {
  copyFileSync(join(kit, "features.example.json"), features)
  console.log("created features.json from the example; edit it to list your features")
}

const found = ["AGENTS.md", "CLAUDE.md"].filter((f) => existsSync(join(root, f)))
const targets = found.length ? found : ["AGENTS.md"]
let added = false
for (const f of targets) {
  const path = join(root, f)
  if (existsSync(path) && readFileSync(path, "utf8").includes(marker)) {
    console.log(`${f} already has the feature map rules`)
    added = true
    continue
  }
  const verb = existsSync(path) ? "Append the feature map rules to" : "Create"
  if (await ask(`${verb} ${f}${existsSync(path) ? "" : " with the feature map rules"}?`)) {
    const prev = existsSync(path) ? readFileSync(path, "utf8") : ""
    appendFileSync(path, (prev && !prev.endsWith("\n\n") ? (prev.endsWith("\n") ? "\n" : "\n\n") : "") + snippet)
    console.log(`updated ${f}`)
    added = true
  }
}
rl?.close()
if (!added) console.log(`\nAdd this to your agent instructions yourself:\n\n${snippet}`)

const build = relative(root, join(kit, "build.tsx")) || "build.tsx"
console.log(`
Next:
  build:   npx tsx ${build} features.json dist/map-<random>/index.html .
  release: add "change every \\"status\\": \\"main\\" to \\"stable@<version>\\"" to your release checklist`)
