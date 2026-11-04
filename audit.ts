// Build-time checks. Shape errors fail the build; the rest show on the page
// under "Needs a look". The newest release is the newest semver git tag.
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { parseStatus, shapeErrors, type Data, type Feature } from "./features.ts"

/** An experiment older than this should be shipped or dropped. */
export const EXPERIMENT_WEEKS = 6
/** A PR open longer than this needs a decision. */
export const REVIEW_DAYS = 14

export type Issue = { feature?: string; text: string }
export type Audit = { release: { version: string; date: string }; today: string; errors: string[]; issues: Issue[] }

const DAY = 86_400_000
export const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY)

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return (pa[i] ?? 0) - (pb[i] ?? 0)
  return 0
}

// Newest vX.Y.Z / X.Y.Z tag and its date. Empty when there is no git or no tag.
export function latestRelease(repo: string): { version: string; date: string } {
  try {
    const out = execFileSync("git", ["-C", repo, "tag", "--list", "--sort=-v:refname", "--format=%(refname:short) %(creatordate:short)"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    for (const line of out.split("\n")) {
      const m = line.match(/^v?(\d+\.\d+\.\d+) (\d{4}-\d{2}-\d{2})$/)
      if (m) return { version: m[1], date: m[2] }
    }
  } catch {}
  return { version: "", date: "" }
}

// GitHub's heading anchors: lower case, punctuation dropped, spaces to hyphens.
export function anchors(markdown: string): Set<string> {
  const out = new Set<string>()
  let fenced = false
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) fenced = !fenced
    const h = !fenced && line.match(/^#{1,6} (.+)$/)
    if (h) out.add(h[1].trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, "").replace(/ /g, "-"))
  }
  return out
}

function docIssues(f: Feature, repo: string): Issue[] {
  const issues: Issue[] = []
  for (const doc of f.docs ?? []) {
    const [path, anchor] = doc.split("#")
    const file = join(repo, path)
    if (!existsSync(file)) issues.push({ feature: f.id, text: `links ${path}, which isn't in the repo` })
    else if (anchor && !anchors(readFileSync(file, "utf8")).has(anchor)) issues.push({ feature: f.id, text: `links ${doc}, but ${path} has no such heading` })
  }
  return issues
}

export function audit(data: Data, repo: string, now = new Date()): Audit {
  const release = latestRelease(repo)
  const today = now.toLocaleDateString("en-CA")
  const errors = shapeErrors(data)
  const issues: Issue[] = []
  if (errors.length) return { release, today, errors, issues }

  const allPlatforms = data.meta.platforms.length
  for (const f of data.features) {
    const status = parseStatus(f.status)
    issues.push(...docIssues(f, repo))
    if (status.kind === "stable") {
      if (release.version && compareVersions(status.version, release.version) > 0) issues.push({ feature: f.id, text: `says stable@${status.version}, but the newest release is ${release.version}` })
      if (f.platforms.length < allPlatforms && !f.note) issues.push({ feature: f.id, text: "is stable but missing a platform, with no note saying why" })
    }
    if (status.kind === "main" && f.added && release.date && f.added < release.date) issues.push({ feature: f.id, text: `landed ${f.added}, before ${release.version} (${release.date}); stable@${release.version}?` })
    if (status.kind === "experiment" && f.added && days(f.added, today) > EXPERIMENT_WEEKS * 7) issues.push({ feature: f.id, text: `has been an experiment for ${Math.floor(days(f.added, today) / 7)} weeks; ship it or drop it` })
    if (status.kind === "review" && f.added && days(f.added, today) > REVIEW_DAYS) issues.push({ feature: f.id, text: `PR #${status.pr} has been open ${days(f.added, today)} days` })
  }
  return { release, today, errors, issues }
}
