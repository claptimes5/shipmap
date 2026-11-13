// node --test   (runs init.mjs against throwaway project dirs)
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

const init = new URL("./init.mjs", import.meta.url).pathname
const snippet = readFileSync(new URL("./AGENTS.snippet.md", import.meta.url), "utf8")
const project = (files = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "shipmap-"))
  for (const [f, s] of Object.entries(files)) writeFileSync(join(dir, f), s)
  return dir
}
// stdin "ignore" = no TTY, the way an agent or CI runs it
const run = (dir, ...args) => execFileSync("node", [init, dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
const read = (dir, f) => readFileSync(join(dir, f), "utf8")

test("empty project + --yes: creates features.json and AGENTS.md", () => {
  const dir = project()
  run(dir, "--yes")
  assert.ok(JSON.parse(read(dir, "features.json")).features.length)
  assert.equal(read(dir, "AGENTS.md"), snippet)
  assert.ok(!existsSync(join(dir, "CLAUDE.md")))
})

test("appends to every existing agent file with a blank line between", () => {
  const dir = project({ "AGENTS.md": "# A\nrule", "CLAUDE.md": "# C\n" })
  run(dir, "--yes")
  assert.equal(read(dir, "AGENTS.md"), `# A\nrule\n\n${snippet}`)
  assert.equal(read(dir, "CLAUDE.md"), `# C\n\n${snippet}`)
})

test("re-running changes nothing", () => {
  const dir = project({ "CLAUDE.md": "# C\n" })
  run(dir, "--yes")
  const once = read(dir, "CLAUDE.md")
  assert.match(run(dir, "--yes"), /already has/)
  assert.equal(read(dir, "CLAUDE.md"), once)
})

test("no TTY, no --yes: edits nothing, prints the rules", () => {
  const dir = project({ "AGENTS.md": "# A\n" })
  const out = run(dir)
  assert.equal(read(dir, "AGENTS.md"), "# A\n")
  assert.ok(out.includes(snippet))
  assert.ok(existsSync(join(dir, "features.json")))
})

test("leaves an existing features.json alone", () => {
  const dir = project({ "features.json": "{\"mine\":1}" })
  run(dir, "--yes")
  assert.equal(read(dir, "features.json"), "{\"mine\":1}")
})
