# Contributing to clothingDB

Thanks for helping. A few things keep the project easy to work on.

## Setup

```sh
bun install
bun run hooks   # installs the git hooks (run once after cloning)
cp .env.example .env
bun run dev
```

You also need [typos](https://github.com/crate-ci/typos) on your path for the
spelling check (`winget install Crate-CI.Typos`, `brew install typos-cli` or
`cargo install typos-cli`).

## Tools

| Tool                                       | What it does                                                          | Run it                               |
| ------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------ |
| [Biome](https://biomejs.dev)               | Formats and lints TypeScript, JSON and CSS                            | `bun run lint`, `bun run format`     |
| [Vitest](https://vitest.dev)               | Unit tests, next to the code as `*.test.ts`                           | `bun run test`, `bun run test:watch` |
| [typos](https://github.com/crate-ci/typos) | Spell checks code and docs                                            | `bun run typos`                      |
| [lefthook](https://lefthook.dev)           | Git hooks: Biome and typos on staged files, commitlint on the message | `bun run hooks`                      |
| [commitlint](https://commitlint.js.org)    | Checks commit messages against the rules below                        | runs on every commit                 |

On GitHub, Dependabot opens weekly update pull requests, pull request titles are
checked against the commit rules, and lychee checks the links in the docs.

## Before opening a pull request

```sh
bun run check   # typecheck, lint, tests and production build, the same as CI
```

- Keep changes focused: one fix or feature per pull request.
- Match the surrounding code: naming, comment style and file layout.
- Pages are server components; put interactivity in `'use client'` components
  under `src/components/`.
- Reusable UI goes in `src/components/ui/<name>/` with an `index.ts`.
- Visitor-facing copy stays plain and non-technical: picture, item, colour,
  address. No scripting snippets or native names.
- The site is dark only; use the design tokens in `src/styles.css` rather than
  raw colours.
- Never commit `.env`, keys, exported game files or rendered pictures.

## Docs

Docs pages are MDX files in `content/docs/`. Add the page name to
`content/docs/meta.json` to place it in the sidebar.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>): <summary>

<body: what changed and why, when it isn't obvious>

<footer: BREAKING CHANGE: …, Closes #123>
```

- **type** is one of:
  - `feat`: a new feature
  - `fix`: a bug fix
  - `docs`: documentation only
  - `style`: formatting, no code change
  - `refactor`: neither fixes a bug nor adds a feature
  - `perf`: performance
  - `test`: tests
  - `build`: dependencies, build setup
  - `ci`: workflows
  - `chore`: other housekeeping
  - `revert`: undoes an earlier commit
- **scope** is optional and names the area: `directory`, `studio`, `docs`,
  `homepage`, `changelog`, `render`, `exporter`, `cdn`, `ui`, `deps`.
- **summary** is imperative and lowercase, has no trailing period, and stays
  under 72 characters.
- A breaking change adds `!` after the type or scope (`feat(cdn)!: …`) and
  explains itself in a `BREAKING CHANGE:` footer.

Examples:

```
feat(studio): add an only-the-garment switch
fix(exporter): read masks from berd_ files
docs: document the picture pipeline
build(deps): drop the unused x package
refactor(homepage)!: rename UrlBuilder to PictureFinder
```

Pull request titles follow the same format, since they become the commit
message when a pull request is squash-merged.
