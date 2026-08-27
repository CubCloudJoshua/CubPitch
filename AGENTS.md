# Working in this repository

Conventions for coding agents and humans. Read this before your first change.

## Ground rules

1. **Run the checks.** `pnpm build && pnpm test` before calling anything done.
   Both are fast and neither needs a browser.
2. **The slide type set is closed.** Adding a type means a schema entry, a
   default, a React component, a PowerPoint drawing branch, and a review case.
   The dispatcher is exhaustive over the union, so a missing renderer is a build
   error, not a blank slide in front of an investor. Before adding one, check
   whether a methodology step can point at an existing type with its own label.
3. **Adding a methodology is data, not code.** Append to `METHODOLOGIES` in
   `packages/core/src/methodology.ts`. If it needs a new slide type, rule 2
   applies.
4. **Parsing rejects; review warns.** `parseDeck` decides whether a document is
   legal. `reviewDeck` decides whether it is any good and must never block a
   save. Do not move a quality judgement into the schema.
5. **Exports are derived.** The HTML renderer and the PowerPoint exporter both
   read the deck document. Never let either hold state the deck does not.
6. **Measure layout, do not eyeball it.** Whether text fits depends on the font,
   the wrapping, and the box. Use `findOverflow`, and run
   `CUBPITCH_MEASURE=1 pnpm test` after touching a type scale or a slide layout.
7. **One slide pixel is 1/144 inch; one point is two slide pixels.** Every
   conversion in the exporter is that identity. If you find yourself introducing
   a second scale factor, something is wrong.
8. **Deck text is untrusted input.** It lands in an HTML document, an XML
   archive, and a model prompt. Render it through the existing primitives, which
   escape it, and fence it with `wrapUntrusted` before it reaches a prompt.
9. **A deck id is an identifier, not a path.** Anything that turns an id into a
   filesystem path goes through `assertSafeId` first. A `..` in a deck id was an
   arbitrary file write and a recursive delete; three layers stop it now and
   none of them is redundant.
10. **The PDF renderer fetches nothing unless asked.** An image URL in a deck is
    an outbound request made by the server. Route it through the network policy
    in `packages/export/src/browser.ts`.

## Layering

```
core  ←  theme  ←  render  ←  export
      ←  storage
```

- `core` — the deck document, methodologies, review. No I/O, no React, no DOM.
- `theme` — tokens and CSS emission. No knowledge of slide types.
- `render` — React components and standalone HTML. No file system.
- `export` — Chromium and pptxgenjs. The only package that spawns anything.
- `storage` — persistence. No business logic.
- `apps/*` — wiring and presentation only.

A cycle means the change belongs somewhere else.

## Style

- TypeScript, ESM, `strict` plus `noUncheckedIndexedAccess`. No `any`; use
  `unknown` and narrow.
- Comments explain **why**, not what. If a line looks wrong but is right, say
  why. Delete comments that restate the code.
- Prose in the product (slide briefs, review messages, CLI output) follows the
  house voice: no em dashes, active voice, numbers over adjectives, no
  hedging filler, no tidy bow-tie conclusions. Review messages tell the author
  what is wrong and stop.

## Testing

- Tests live in `tests/`, named after the module under test.
- Test what would actually break. A review that stops ranking evidence costs an
  author the feedback they came for; an exporter that emits pictures instead of
  text boxes costs a partner the ability to edit the deck.
- **Verify exports by reading them.** Open the .pptx archive and assert on the
  XML. A file that opens to twelve blank slides passes a byte-count check.
- When you fix a bug, add the test that would have caught it, and say in the
  test what the failure cost.
- Harnesses that write artefacts rather than assert are gated behind an env var
  and named `_*.test.ts`.

## What not to do

- Don't add a chart library. Charts render in a browser, in a Node process with
  no DOM, and inside a PDF; inline SVG is the only thing that does all three,
  and PowerPoint gets native charts so the numbers stay editable.
- Don't rasterise a slide into PowerPoint. The reason to emit .pptx at all is
  that someone can change a number in it.
- Don't name a font in a PowerPoint export that Office does not ship. A .pptx
  carries no fonts, so a missing face is substituted silently and the layout
  moves. Themes declare `pptxDisplay` and `pptxBody` separately for this.
- Don't clamp a font size once and then scale from it. Re-apply the
  methodology's floor wherever a size is derived, via `scaleStyle`.
- Don't let the tool break the advice it just gave. If a methodology promises
  ten slides, the starter deck ships ten.
- Don't add a placeholder whose own text trips a review rule. A fresh deck that
  scolds the user for words the tool wrote reads as broken.
