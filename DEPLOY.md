# Putting Palette Studio online

This publishes the app to **GitHub Pages** — free hosting run by GitHub, at an
address like:

```
https://deyankanev5.github.io/interior-design/
```

It costs nothing, there is no card to enter, and there is nothing that can run
up a bill. The whole app runs inside the visitor's browser, so there is no
server to pay for.

**Total time: about five minutes, almost all of it clicking.**

---

## Step 1 — Make the repository public

GitHub Pages is only free on public repositories, and public repositories also
get unlimited build minutes — which is what makes the automatic publishing work.

1. Go to <https://github.com/deyankanev5/interior-design/settings>
2. Scroll all the way to the bottom, to the red box marked **Danger Zone**
3. Click **Change visibility**
4. Choose **Make public**, then type the repository name to confirm

> **Is that safe?** The repository contains the app's code, the material
> catalogue and these instructions. There are no passwords, no keys and no
> client information in it. Anyone could read the code, but nobody can change it
> or publish to your site.

---

## Step 2 — Turn Pages on

1. Go to <https://github.com/deyankanev5/interior-design/settings/pages>
2. Under **Build and deployment**, find the dropdown labelled **Source**
3. Change it from *Deploy from a branch* to **GitHub Actions**

That's the only setting. Nothing to save — it applies immediately.

---

## Step 3 — Merge the changes

The app currently lives on a branch. Publishing happens from `main`.

1. Open <https://github.com/deyankanev5/interior-design/pulls>
2. Open the pull request
3. Click **Merge pull request**, then **Confirm merge**

---

## Step 4 — Watch it publish

1. Go to <https://github.com/deyankanev5/interior-design/actions>
2. The top entry should say **Deploy to GitHub Pages** with a spinning amber dot
3. Wait for it to turn into a green tick — usually one to two minutes

Then open:

```
https://deyankanev5.github.io/interior-design/
```

If you get a 404 immediately after the green tick, wait a minute and refresh.
The very first publish sometimes takes a moment to become reachable.

**From now on it is automatic.** Any change merged into `main` republishes the
site within a couple of minutes.

---

## Step 5 — Check it actually works

Three quick things, which between them prove the whole thing is sound:

1. **Press the spacebar.** The colours should change.
2. **Press spacebar a few times, copy the web address from the address bar,
   then open it in a new tab.** The exact same scheme should reappear. This is
   how you send a scheme to a client or a colleague.
3. **Click Library in the toolbar and type `u702`.** EGGER U702 ST9 Cashmere
   Grey should be the first result.

If the page is blank or shows a 404, see *If something goes wrong* below.

---

## Importing a picture

Three ways in, all of which work with no server:

| How | When to use it |
| --- | --- |
| **Copy the image, then press Ctrl+V (⌘V) in the Import panel** | Fastest. Works with Pinterest. |
| **Drag an image file onto the Import panel** | If you have saved the picture. |
| **Paste a direct link to an image file** | Only for hosts that permit it. |

**Pinterest links do not work, and cannot.** Pinterest deliberately blocks other
websites from reading its pages and images. That is a decision on their side,
not a limitation of this app, and no website can get around it.

The way that does work: right-click the pin, choose **Copy image**, then press
**Ctrl+V** in the Import panel. The result is identical. The app tells you this
if you paste a pin link.

---

## What it costs

Nothing, ever.

GitHub Pages is free for public repositories, with generous limits: 100 GB of
traffic per month and a 1 GB site. This app is about **107 KB** per first-time
visitor, and returning visitors download almost nothing because their browser
keeps a copy. You would need roughly a million visits a month to approach the
limit.

There is no server, no database and no paid service involved.

---

## Using your own web address

If you would rather have `palette.yourcompany.com`:

1. At your domain provider, add a **CNAME** record pointing to
   `deyankanev5.github.io`
2. Go to <https://github.com/deyankanev5/interior-design/settings/pages>
3. Enter your domain under **Custom domain** and save
4. Tick **Enforce HTTPS** once it becomes available

Then tell me the domain — a one-line change is needed so the app knows it is no
longer served from a subfolder, and it will look broken until that is done.

---

## If something goes wrong

**The page is completely blank**

Almost always the base path. The app is built expecting to live at
`/interior-design/`. If you renamed the repository, the name no longer matches.
Tell me the new name and I will correct it in one line.

**404 — There isn't a GitHub Pages site here**

Either Step 2 was missed (Source must be **GitHub Actions**, not *Deploy from a
branch*), or the first publish has not finished. Check the Actions tab.

**The Actions run fails immediately with no explanation**

That is the symptom of the repository still being private and out of build
minutes. Step 1 fixes it.

**Everything works but a scheme link opens the wrong scheme**

Send me the link and I will look at it — that would be a real bug.

**Anything else** — send me the exact message and a screenshot.

---

<details>
<summary><strong>Technical reference</strong> — click to expand</summary>

## What was removed

The AI layer (Brief panel, `/api/ai`, the Azure AI Foundry proxy) and all
server-side code are gone, along with the Azure Functions app, the Bicep
templates and the Static Web Apps workflow. The app is now a pure static bundle
with no runtime dependencies.

Consequence: Pinterest *pin-URL* resolution is gone with it, since it required a
server-side proxy to work around Pinterest's lack of CORS headers. Clipboard
paste, drag-and-drop and direct image URLs are unaffected and are what the panel
now steers people toward.

## Pages specifics

Three things decide whether a Pages deployment silently breaks, and all three
are asserted by `scripts/check-pages.mjs`:

- **Base path.** Project sites are served from `/<repo>/`, so `vite.config.ts`
  sets `base` accordingly. Override with `BASE_PATH=/` for a custom domain or a
  user site.
- **`.nojekyll`.** Without it, Pages runs the output through Jekyll, which drops
  files beginning with an underscore. Kept as an empty `public/.nojekyll`.
- **`404.html`.** Pages has no rewrite rules, so a deep link is a real 404. The
  build copies `index.html` to `404.html`; requests then land on the app, which
  reads state from the URL fragment as usual.

```bash
npm run check:pages   # build, then assert all of the above; exits non-zero on failure
```

The check also fails if any `fetch('/api/...')` survives in the bundle, since
Pages cannot host functions and such a call would fail silently at runtime.

## Verifying locally the way Pages serves it

Serving `dist/` at the site root will pass while the real deployment fails. Serve
it from the subpath instead:

```bash
npm run build
mkdir -p /tmp/pages && cp -r dist /tmp/pages/interior-design
cd /tmp/pages && python3 -m http.server 4180
# then open http://localhost:4180/interior-design/
```

The end-to-end test accepts that address:

```bash
SMOKE_URL=http://localhost:4180/interior-design npm run smoke
```

It asserts locks survive repeated generation and stay identical across all eight
variations, presets round-trip, the URL codec decodes back to the same scheme,
no Brief button remains, and a pasted Pinterest link produces an explanation
rather than a silent failure.

## Workflow

`.github/workflows/pages.yml` typechecks, lints, builds and runs the Pages
check, then publishes via `actions/deploy-pages`. Pull requests run the build
and checks but do not publish. No secrets are required — it authenticates with
the `id-token` permission.

</details>
