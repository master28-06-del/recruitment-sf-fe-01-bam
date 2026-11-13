# Gut Run and Fireplace Ads

Two standalone advertising concepts built with plain HTML, CSS, and JavaScript.

## Run locally

From the repository root, start a local server:

```sh
python -m http.server 8000
```

Open `http://localhost:8000/variant-a-game/` for Gut Run or `http://localhost:8000/variant-b-fireplace/preview.html` for the Fireplace preview. Audio in Gut Run starts after the first interaction.

## Projects

- **Gut Run** is a mobile tap-to-jump game. It uses a fixed 360x640 design stage, scales uniformly to the visible viewport, and uses each of the 15 obstacle assets once per run.
- **Fireplace** contains separate `top.html`, `left.html`, and `right.html` creatives, plus a synchronized `preview.html`. The preview scales the 1684x1018 composition to fit the browser.

See [DECISIONS.md](DECISIONS.md) for implementation choices.

## Known issues and publication status

- `dist/ads.zip` is the release bundle: 2,741,287 bytes (2.61 MiB) across 62 files, below the 3,000,000-byte limit. It includes both runtime creatives and excludes non-runtime `design/` references and the unused Fireplace `box.png` and `cta.png` sources.
- The Fireplace panel backgrounds were re-encoded as JPEGs at quality 40; their dimensions are unchanged. The original, unused `bg-big.jpg` was removed because the creatives use the per-panel crops.
- Fireplace uses the supplied per-panel background crops. Seam alignment and pixel-level placement still need visual verification in a browser at the target desktop size.
- The Fireplace preview has custom iframe padding; verify the visible bounds after any padding or layout changes.
- Clickouts use the brief's `https://example.com/landing` placeholder. Set `window.clickTag` in the ad environment to provide the campaign URL.
- Browser behavior has not been verified across the full target device and viewport matrix. The JavaScript files pass Node syntax checks, but this is not a substitute for in-browser testing.

## Next steps

1. Test the game on real mobile viewport sizes and test the Fireplace alignment and seams in a desktop browser.
2. Replace the placeholder clickout, then publish `dist/ads.zip` and verify the uploaded bundle size.

## AI note

GitHub Copilot CLI was used to inspect and edit the HTML, CSS, and JavaScript; Node was used for JavaScript syntax checks. One initial preview-sizing approach centered the unscaled layout after applying a CSS transform, which could clip the right side on smaller viewports. The preview was changed to calculate the scale and center the scaled bounds explicitly.
