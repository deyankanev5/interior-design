# Palette Studio

An interior-design palette tool for colour **and material** schemes: walls, floors, joinery,
worktops, textiles and accents, worked out against real supplier decor ranges rather than
free-floating hex codes.

The interaction model is deliberately close to [coolors.co](https://coolors.co) — full-height
columns, spacebar to generate, lock what you have decided — but every slot carries a role in a
room, and wherever possible an orderable product reference instead of a colour swatch.

```bash
npm install
npm run dev
```

---

## What it does

**Slots have roles, not just colours.** Each column is a *surface* — ceiling, wall, floor,
furniture, worktop, textile or accent — and the role constrains what can fill it. A decorative
board can be joinery or wall panelling; it can never be proposed as a floor. Each role also
carries a lightness and chroma envelope, which is why the generator will not hand you a
near-black ceiling or a fully saturated 20 m² wall.

**Locks are hard constraints.** Lock the two decors you have already committed to and press
Space: everything else regenerates around them, and they are identical in every result,
including across the eight-up Variations grid.

**Any number of slots, 2 to 10.** Shrinking the palette drops unlocked slots first — a locked
decision is never silently discarded.

**Suggestions are ranked, not sampled.** Open a slot and you get the best candidates for that
one surface, each scored against the rest of the scheme with the other slots held fixed, with a
short reason. That is the part that beats pressing space repeatedly: you change one element
without rerolling the room.

**Variations shows eight complete schemes at once**, ranked. Rerolling one at a time is good
for exploring and poor for deciding.

**A design review, not just a score.** Eight weighted checks — hue harmony, light hierarchy,
surface separation, undertone coherence, chroma at scale, accent strength, material variety,
daylight/LRV — each with a plain-language finding you could paste into a client email.

**Reference import.** Drag-and-drop, `Ctrl+V` a screenshot, or a direct image URL. Colours are
extracted by k-means in Oklab and assigned to slots by role fit, then optionally snapped to the
nearest real material.

**Named rooms.** Save schemes as `Bedroom`, `Kitchen`, `Flat 3 — hallway`; load, rename, update
and export/import the whole set as JSON. The current scheme also lives in the URL, so the
address bar is a shareable link that reopens exactly what you see, locks included.

**Export** as a Markdown or CSV finish schedule (leading with the orderable reference, because
nobody on site can buy `#CFC0B3`), PNG, SVG, JSON, or CSS custom properties.

### Keyboard

| Key | Action |
| --- | --- |
| `Space` | Generate |
| `1`–`9` | Lock/unlock that slot |
| `Ctrl/⌘ Z` / `Ctrl/⌘ ⇧ Z` | Undo / redo |
| `Ctrl/⌘ K` | Material library |
| `Ctrl/⌘ V` | Paste a reference image (Import panel) |
| `Esc` | Close panel |

---

## The catalogue

563 entries, in three confidence tiers that are labelled on every row in the UI:

| Tier | What it is | Count |
| --- | --- | --- |
| **orderable** | Decor codes, names and textures scraped from the manufacturer's own published range. Quote directly to a supplier. | 441 |
| **standard** | RAL Classic. A published standard, so any paint, lacquer or powder-coat supplier in the EU can match it — and it still means the same thing in five years. | 75 |
| **representative** | A finish *family* rather than a specific SKU: honed travertine, bouclé wool, brushed brass. Tile and textile ranges turn over too fast, and vary too much by importer, for a fixed SKU list to stay honest. | 47 |

The orderable tier covers **EGGER** (the default reference range for furniture and fitted
joinery across the EU) and **Kronospan** (which manufactures in Veliko Tarnovo and Burgas, so
its decors carry the shortest lead time on the Bulgarian market and are usually the
cost-effective alternative to an equivalent EGGER decor).

### Where the colours come from

Not typed in by hand. `scripts/scrape-egger.mjs` and `scripts/scrape-kronospan.mjs` pull each
manufacturer's published decor list and download the manufacturer's own photograph of every
decor, then compute the **mean colour in Oklab**. Averaging perceptually rather than in raw
sRGB matters: the sRGB mean of a woodgrain skews dark and desaturated because the encoding is
non-linear, which is exactly the error that makes a generated palette feel muddy.

```bash
node scripts/scrape-egger.mjs        # 218 decors + EGGER's published pairings
node scripts/scrape-kronospan.mjs    # 214 decors
```

Both write `src/data/sources/*.generated.ts`. Neither needs a key. Behind an HTTP proxy, run
them with `NODE_USE_ENV_PROXY=1`.

The EGGER scraper additionally collects the decor combinations **EGGER itself publishes** on
each decor page. A manufacturer's own pairing advice beats anything the colour maths can infer,
so the generator weights those heavily — which is why locking `H3303 ST10 Natural Hamilton Oak`
reliably pulls `W1000 ST9 Premium White` onto the walls.

### Read this before you specify anything

**The hex values are representative, not colour-accurate.** They are the average of a
photograph of a printed, textured surface, rendered on an uncalibrated screen. Every colour
here is a shortlisting aid. Confirm against a physical sample, in the actual room, under the
lighting that will actually be installed, before anything is ordered — metamerism between a
2700 K lamp and daylight is the most common reason a signed-off scheme fails on site.

Decor ranges are also revised on a multi-year cycle. Re-run the scrapers periodically and check
availability with the supplier.

### Loading your own decor book

**Library → Load your own catalogue** takes a CSV or JSON export and layers it over the built-in
data. Download the template from the same panel; required columns are `brand`, `code`, `name`,
`hex`, and the useful optional ones are `texture`, `category`, `pattern`, `sheen`, `surfaces`
(pipe-separated), `collection`, `species`, `tags`, `lrv`.

```csv
brand,code,texture,name,hex,category,pattern,sheen,surfaces,collection,species,tags
EGGER,U702,ST9,Cashmere Grey,#CFC0B3,board,solid,matt,furniture|wall|accent,Decorative Collection,,uni|grey
```

Imported entries win on id collision, so you can correct a built-in decor by re-importing it.

---

## Design decisions

### Why a deterministic engine rather than an LLM

The generator is colour science, not a language model, and that is a deliberate choice rather
than a cost saving.

The engine can only ever propose a product that exists in the catalogue. A language model asked
to pick decors will, sooner or later, produce a confident, plausible-looking decor code that no
supplier has ever manufactured — and this tool's output is a document somebody orders from.
That failure mode is not acceptable at any hallucination rate. The deterministic path is also
instant, reproducible (the same locks and settings behave the same way tomorrow), works
offline, and can *explain itself*: every finding in the design review traces to a specific
measurable quantity, which is what makes it defensible in front of a client.

It also handles the multi-suggestion requirement better. "Show me several good options for this
slot at once" is a ranking problem over a known candidate set — exactly what a scoring function
does well and what a chat completion does awkwardly and slowly.

An AI layer was built and then removed. It only ever did two language things —
turning a written brief into engine settings, and drafting a client-facing paragraph — and
neither was load-bearing. Removing it means no keys to manage, no per-use billing and no server,
which is what lets the whole app run as free static hosting.

### Why Oklab everywhere

Every perceptual comparison — "is this floor meaningfully darker than that wall?", "will these
two greiges read as one surface?" — runs in Oklab, where numeric distance corresponds to what
the eye reports. HSL lightness does not: `hsl(60 100% 50%)` and `hsl(240 100% 50%)` claim
identical lightness and differ by roughly 75 LRV in reality. That single choice is what lets the
reviewer warn you that a wall and a floor will blur together *before* you see them next to each
other.

LRV is reported throughout because it is the number that actually predicts how a room will feel:
the same quantity paint fan decks print and daylight calculations consume.

### The accent, and what it does to everything else

The accent occupies the least area and carries the most chroma, and that is precisely why it
works. Its job is to give the room a focal point and to declare the scheme's intent — the same
greige walls read as "warm minimal" beside brushed brass and as "coastal" beside petrol blue.

So the engine resolves the accent **first**, and tunes every other surface underneath it.
Reversing that order is how you end up with a wall colour that leaves the accent no room to
breathe. Concretely, once an accent is fixed:

- large surfaces have their chroma held down, so nothing competes with it;
- the neutrals' undertones are pulled into a defined relationship with the accent hue rather
  than drifting to an unrelated third hue — which is exactly what makes a scheme look muddy;
- the accent is checked against the surface it will sit on, because an accent that does not
  separate from its backing disappears instead of punctuating.

The relationship itself follows from the harmony scheme, and each one behaves differently:

| Relationship | Offset | Character |
| --- | --- | --- |
| Complementary | 180° | Maximum tension. Keep under ~8% of visible surface or the room vibrates. |
| Split-complementary | ~155° | Nearly the same separation, far more forgiving in artificial light. The safest high-contrast accent for a home. |
| Triadic | 120° | Playful; only works if the two non-dominant hues stay small *and unequal*. |
| Analogous | ~35° | Emphasis rather than contrast. Tolerates more area — good when the accent is joinery, not an object. |
| Tonal | 0° | The dominant hue, darker and more saturated. For schemes where texture does the work. |

The 60-30-10 split is treated as a *starting point* rather than a rule. What the reviewer
actually enforces is the thing underneath it: one surface must clearly dominate, and the accent
must clearly not.

### Why these slot roles

The set is `ceiling · wall · floor · furniture · worktop · textile · accent`, chosen so that
each role implies a genuinely different constraint — the only good reason for a role to exist:

- **ceiling** and **wall** differ by envelope: a ceiling is near-white and near-neutral so it
  disappears and bounces daylight.
- **floor** is separate from wall because it is the darkest large surface by convention and the
  hardest thing to change later, and it draws from entirely different product categories.
- **worktop** is separate from furniture because it is a narrow eye-level band that reads as a
  *line*: its contrast against the fronts matters more than its own colour.
- **textile** is separate from furniture because fabric carries far more chroma than any hard
  surface at the same area.
- **accent** is separate from everything because it is defined by *area*, not by material.

"Decoration" was considered as a role and deliberately folded into **accent** and **textile**.
Decorative objects are the accent in almost every real scheme, and giving them their own slot
tempted the generator into producing two competing focal points — which the reviewer then has to
flag as a fault. Roles are per-slot and freely changeable, and several slots may share a role
(two furniture slots for carcase and fronts is the common case), so nothing is lost by keeping
the set tight.

---

## Architecture

```
src/
  color/convert.ts        sRGB ↔ Oklab/OkLCh, ΔE, LRV, WCAG contrast, gamut-safe adjustment
  domain/                 types + per-surface design envelopes
  data/
    sources/              EGGER + Kronospan (generated), RAL Classic, representative finishes
    catalog.ts            index, tolerant search, nearest-match
    import.ts             CSV/JSON catalogue loader
  engine/
    harmony.ts            scheme offsets, mood bias, the accent model
    score.ts              the eight review checks and the weighted total
    generate.ts           constrained generation, variations, per-slot suggestions
  state/                  store with undo/redo, named presets, URL codec
  features/               UI, one folder per panel
scripts/                  catalogue scrapers, Pages check, end-to-end smoke test
```

There is no server. Everything runs in the browser, which is why the app can be hosted as
static files for free and works offline once loaded.

### Reference import

Clipboard paste, drag-and-drop and direct image URLs, with colours extracted by k-means in
Oklab. Pinterest *pin links* are not supported: Pinterest serves neither its pages nor its
images with CORS headers, so a browser cannot read them and no client-side workaround exists.
Copying the image and pasting it works, and the panel says so rather than failing silently.

## Putting it online

**[DEPLOY.md](DEPLOY.md)** is a step-by-step guide written for non-technical users. The short
version: make the repository public, set Settings → Pages → Source to **GitHub Actions**, and
merge to `main`. It publishes to `https://<user>.github.io/<repo>/` within a couple of minutes,
free, with no account or card required.

```bash
npm run check:pages    # build, then assert the deployment cannot silently break
```

That check catches the three things that produce a blank page rather than an error: a base path
that does not match the repository, a missing `.nojekyll`, and a missing `404.html` fallback.

## Tests

```bash
npm run typecheck
npm run build
npm run preview &
npm run smoke        # drives the built app in a real browser
```

`scripts/smoke.mjs` covers the behaviours that break silently: locks surviving repeated
generation and appearing identically across all eight variations, presets round-tripping, and
the URL codec decoding back to the same scheme. Set `CHROME_PATH` to reuse an already-installed
Chromium.
