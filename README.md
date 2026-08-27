# CubPitch

A pitch deck platform where the deck is a structured document, not a pile of
text boxes.

A slide has a type, and that type has fields named after the job the slide does.
A problem slide stores *who hurts*, *what they do today*, and *what it costs
them*. That is what lets one document re-theme completely, export to PowerPoint
as editable shapes rather than pictures, and be argued with by a reviewer that
understands what it is looking at.

Built for CubCloud, methodology-agnostic by design.

```
BRIEF → DECK DOCUMENT → REVIEW
                      → WEB / PRESENTER
                      → PDF (Chromium)
                      → PPTX (native shapes)
```

---

## What it does that a slide editor does not

**It knows the methodology.** There is no single right deck, so five ship as
data: the house framework, Sequoia, Y Combinator, Kawasaki 10/20/30, and a16z.
Y Combinator puts traction fourth because at seed it is the only fact in the
room; Sequoia puts "why now" there. Start a deck under either and it says so,
uses that methodology's language for each slide, and reviews the deck on its own
terms. Adding a sixth is a literal, not a patch.

**It argues with you.** The review ranks traction evidence (revenue over
retention over paid pilots over letters of intent, with "in talks" last), calls
a market number with no beachhead TAM theater, rejects "we have no competition"
outright, refuses an ask denominated in vibes, and tells you when a slide takes
more than ninety seconds to read aloud. Nothing it finds blocks a save.

**It measures the layout.** Whether text fits is not a word count: it depends on
the font, the wrapping, and the box. The exporter measures every slide in the
same engine that prints it and names the ones being clipped.

**Its PowerPoint is editable.** Native text boxes, tables, and charts with their
data attached. A deck exported as twelve screenshots is a PDF with the wrong
extension.

**Its AI refuses to make things up.** The drafter fills in the methodology's
slides from your brief and reports what it had to assume and what it still
needs, because a deck with a plausible invented revenue figure fails in the room
instead of in review. Critique reads the deck back to you before it says
anything, so an argument the reader could not reconstruct becomes the first
finding. Question prep drafts an answer only where the deck supports one and
names the gap where it does not.

---

## Status

| Area | State |
|---|---|
| Deck model, 26 typed slide kinds | Working — round-trips every type |
| Methodologies (5), pluggable | Working |
| Structural review + working rules | Working |
| Theme tokens, 4 themes, contrast-checked | Working |
| Renderer: browser, PDF, presenter | Working — zero overflow on the sample deck |
| PDF export | Working — verified page count and page size |
| PowerPoint export | Working — verified by reading the archive XML |
| Overflow measurement | Working |
| Storage: file + Postgres | Working — file store tested, Postgres untested against a live server |
| CLI | Working |
| Web editor | Working |
| AI: draft, rewrite, critique, Q&A prep | Working — tested against a fake provider; needs a key to run live |

Numbers come from the test suite, not from projections.

---

## Quick start

No database, no server, no API key.

```bash
pnpm install
pnpm build

# Start a deck in a methodology's flow
node apps/cli/dist/index.js new "CubCloud" --methodology house --theme cubcloud

# Fill in decks/<id>/deck.json, then
node apps/cli/dist/index.js review <id> --layout
node apps/cli/dist/index.js export <id> --out ./out
```

There is a complete worked deck at `examples/cubcloud-seed.json`:

```bash
node apps/cli/dist/index.js review examples/cubcloud-seed.json
node apps/cli/dist/index.js export examples/cubcloud-seed.json --out ./out
```

### Commands

| Command | What it does |
|---|---|
| `new <company>` | Start a deck in a methodology's flow |
| `list` | Decks in the store |
| `review <deck>` | Check the deck against its methodology (`--layout`, `--strict`) |
| `export <deck>` | Write PDF and PowerPoint (`--pdf`, `--pptx`, `--offline`) |
| `html <deck>` | Write a standalone HTML deck |
| `methodologies` | Frameworks available |
| `themes` | Themes available |
| `draft <brief>` | Draft a deck from a brief (needs `ANTHROPIC_API_KEY`) |
| `critique <deck>` | Read the deck as a partner would |
| `qa <deck>` | The questions they will ask, and the answers the deck supports |

---

## Layout

```
packages/
  core/       Deck document, 26 slide types, methodologies, review engine
  theme/      Design tokens, 4 themes, contrast checking, slide CSS
  render/     React slide components, inline SVG charts, standalone HTML
  export/     PDF via Chromium, PPTX via native shapes, overflow measurement
  storage/    DeckStore interface, file store, Postgres store + migrations
  ai/         Model provider abstraction, drafting, rewriting, critique, objection prep
apps/
  cli/        The cubpitch command
  web/        Editor: rail, canvas, inspector, review, presenter
examples/     A complete worked deck
tests/        108 tests
```

Dependencies point one way:

```
core  ←  theme  ←  render  ←  export
      ←  storage
      ←  ai
```

Nothing below `apps/` depends on the AI layer, and the AI layer depends only on
`core`. Every command that does not call a model works with no API key.

---

## The geometry

The canvas is 1920×1080 and PowerPoint's is 13.333×7.5 inches, so **one slide
pixel is exactly 1/144 inch and one point is exactly two slide pixels**. Every
conversion in the exporter is that identity and nothing else. Themes express
sizes as plain numbers in slide pixels because a token has to survive
translation into a world with no CSS.

---

## Requirements

- Node 22+
- pnpm 10+
- Chromium for PDF export. Playwright's bundled one is used when present; set
  `CUBPITCH_CHROMIUM_PATH` to point at another (CI images, containers, and
  Lambda layers rarely match Playwright's pinned revision).

Postgres is optional and only needed when more than one person edits a deck.
`DATABASE_URL` configures it; `PostgresDeckStore.migrate()` applies the schema.

---

## Testing

```bash
pnpm test                      # unit and export tests, no browser
CUBPITCH_E2E=1 pnpm test       # also renders real PDFs and PNGs
```

Test harnesses that write artefacts rather than assert are gated behind env
vars: `CUBPITCH_MEASURE=1` reports layout overflow per theme,
`CUBPITCH_SHOTS=1` renders slide screenshots, `CUBPITCH_EXAMPLE=1` regenerates
the example deck.

---

## Design principles

1. **The deck is a document.** Structure first; layout is derived from it.
2. **The slide type set is closed.** It keeps the renderer and both exporters
   finite. `bullets` and `image` are the escape hatches; reach for them last.
3. **Methodologies are data.** A tool that hardcodes one is arguing with its user.
4. **Parsing rejects, review only warns.** A half-written deck at 11pm is a
   normal state for a deck to be in.
5. **Exports are derived, never authored.** Nothing is editable in two places.
6. **Measure, do not assume.** Overflow, contrast, and page size are checked by
   the machine that renders them.
7. **The tool follows its own advice.** If a methodology promises ten slides and
   thirty-point type, the export delivers exactly that.
