// The feature map's data model. features.json is the only source; the page and
// the audit read it through these types. Extracted from Scrawl (MIT, Kit Langton).

export type Status =
  | { kind: "stable"; version: string }
  | { kind: "main" }
  | { kind: "experiment"; flag: string }
  | { kind: "branch"; branch: string }
  | { kind: "review"; pr: number }

export const STATUS_KINDS = ["stable", "main", "experiment", "branch", "review"] as const

export type Shortcut = { keys: string; does: string }
export type ConfigKey = { key: string; value: string; does: string }

export type Feature = {
  id: string
  group: string
  name: string
  /** One sentence: what the user gets. */
  says: string
  /** stable@1.2.3 | main | experiment:<flag> | branch:<name> | review:#<pr> */
  status: string
  /** Ids from meta.platforms. */
  platforms: string[]
  /** When it landed (YYYY-MM-DD); required unless stable. */
  added?: string
  /** Why a platform is missing, or another caveat. */
  note?: string
  /** A branch's experiment flag, for features not on main. */
  flag?: string
  pr?: number
  shortcuts?: Shortcut[]
  config?: ConfigKey[]
  /** Repo paths, optionally with a #heading anchor. */
  docs?: string[]
}

export type Meta = {
  /** Shown in the header and <title>. */
  name: string
  /** e.g. https://github.com/you/project; links docs, branches and PRs. */
  repo: string
  /** Default branch for doc links. */
  branch?: string
  /** Path of features.json in the repo, for the "built from" link. */
  source?: string
  /** Optional header icon URL. */
  icon?: string
  platforms: { id: string; label: string }[]
  /** Heading note for the config table, e.g. "~/.config/app/config.json". */
  configFile?: string
}

export type Group = { id: string; title: string }
export type FlowStep = { title: string; detail: string; group: string }
export type Data = { meta: Meta; groups: Group[]; flow?: FlowStep[]; features: Feature[] }

export function parseStatus(status: string): Status {
  if (status === "main") return { kind: "main" }
  const stable = status.match(/^stable@(\d+\.\d+\.\d+)$/)
  if (stable) return { kind: "stable", version: stable[1] }
  const experiment = status.match(/^experiment:([A-Za-z][\w.-]*)$/)
  if (experiment) return { kind: "experiment", flag: experiment[1] }
  const branch = status.match(/^branch:([\w./-]+)$/)
  if (branch) return { kind: "branch", branch: branch[1] }
  const review = status.match(/^review:#(\d+)$/)
  if (review) return { kind: "review", pr: Number(review[1]) }
  throw new Error(`unknown status "${status}"`)
}

/** Shape problems that would make the page wrong. The build fails on any. */
export function shapeErrors({ meta, groups, flow = [], features }: Data): string[] {
  const errors: string[] = []
  if (!meta?.name || !meta?.repo || !meta?.platforms?.length) errors.push("meta needs name, repo and platforms")
  const platformIds = new Set((meta?.platforms ?? []).map((p) => p.id))
  const groupIds = new Set(groups.map((g) => g.id))
  const ids = new Set<string>()
  for (const f of features) {
    const at = `feature "${f.id}"`
    if (!/^[a-z0-9-]+$/.test(f.id ?? "")) errors.push(`${at}: id must be kebab-case`)
    if (ids.has(f.id)) errors.push(`${at}: duplicate id`)
    ids.add(f.id)
    if (!groupIds.has(f.group)) errors.push(`${at}: unknown group "${f.group}"`)
    if (!f.name || !f.says) errors.push(`${at}: needs a name and says`)
    let status: Status | null = null
    try {
      status = parseStatus(f.status)
    } catch (e) {
      errors.push(`${at}: ${(e as Error).message}`)
    }
    if (!f.platforms?.length || f.platforms.some((p) => !platformIds.has(p))) errors.push(`${at}: platforms must be some of ${[...platformIds].join(", ")}`)
    if (f.added !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(f.added)) errors.push(`${at}: added must be YYYY-MM-DD`)
    if (status && status.kind !== "stable" && !f.added) errors.push(`${at}: a ${status.kind} feature needs "added"`)
    if (status?.kind === "review" && f.pr !== status.pr) errors.push(`${at}: pr must match the review status`)
  }
  for (const step of flow) if (!groupIds.has(step.group)) errors.push(`flow "${step.title}": unknown group "${step.group}"`)
  return errors
}
