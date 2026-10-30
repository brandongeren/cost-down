# Cost Down: project rules

- **Keep `DESIGN.md` current.** Whenever a decision changes the design (a new or dropped feature, a new supported site,
  a new data source, a resolved open question, a phase reordered), update `DESIGN.md` in the same commit as the change.
  Record verified facts in "Verified facts" with the date, and move items out of "Still open" once they're settled.
  If code and `DESIGN.md` disagree, fix whichever is wrong rather than leaving both.
- This is a personal project, separate from work tooling: never copy or reference it in `~/.claude`. The `~/.claude`
  rules about Amazon systems, SQL quiet hours, on-call, etc. don't apply here.
- Sister project: Chaos Catalog (`~/claude/chaos-catalog`). Cost Down reads its published price data and may copy its
  deck-format code; any change Cost Down needs on the Chaos Catalog side is made and committed in that repo, under its
  own rules (`chaos-catalog/CLAUDE.md`).
- Be gentle with the data sources: the extension never calls TCGCSV or the YGOPRODeck API; it reads Chaos Catalog's
  published files at most once a day.
- Commits: identity is set per repo (`Brandon Geren`, `7003889+brandongeren@users.noreply.github.com`). Creating the
  GitHub repo, pushing and publishing to the extension stores need the user's OK.
- Explain things in plain words; ask the user before choices that are theirs, and give a short action list when they
  owe steps.
