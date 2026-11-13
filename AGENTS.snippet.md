## Feature map

`features.json` lists every user-facing feature with its status (`stable@<version>`, `main`,
`experiment:<flag>`, `branch:<name>`, `review:#<pr>`), platforms, shortcuts, config keys and
docs. A PR that adds, removes, renames or changes the status of a user-facing feature updates
it in the same PR. A release changes every `"status": "main"` to `"stable@<version>"` in the
release PR.
