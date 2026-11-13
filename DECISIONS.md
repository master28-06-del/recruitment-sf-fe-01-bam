# Decision log

## Gut Run

- **Rendering:** Use DOM elements and the supplied layered images rather than a canvas. This keeps the ad lightweight and lets the provided artwork remain intact.
- **Viewport:** Keep a 360x640 logical stage and scale it uniformly using the visible viewport dimensions. This avoids distortion and prioritizes keeping the full playfield visible; unused space may remain on screens with a different aspect ratio.
- **Gameplay:** Keep the player at a fixed horizontal position while translating the gut and obstacles with transforms. Shuffle one deck containing `bac1`-`bac6` and `txt1`-`txt9`, so every obstacle appears once per run.
- **Collision:** Use an ellipse around the player and alpha masks from obstacle images, rather than treating transparent image bounds as solid.
- **Audio and lifecycle:** Start music in response to the first pointer interaction, provide a mute control, and pause/resume audio and the animation loop when the document or ad is hidden.

## Fireplace

- **Creative structure:** Keep the top, left, and right ads as separate HTML documents with their specified design sizes. Use `preview.html` only to compose and synchronize them for review.
- **Backgrounds:** Use the supplied per-panel `bg.jpg` crops, not `bg-big.jpg`, so each delivered creative can load independently. Their seam alignment still needs visual verification against the reference.
- **Preview scaling:** Use a 1684x1018 composition and scale it uniformly to fit the available browser viewport. The panel positions and borders are defined in the preview; iframe padding must be considered when validating the visible bounds.
- **Animation:** Animate image transforms and opacity. The preview sends a shared start timestamp to the three iframe documents; decorative motion is disabled for reduced-motion preferences.
- **Transparent artwork:** Keep the originals and use derived transparent copies for the box and CTA, removing pure-black pixels while preserving the other pixel colors.

## Delivery

- **Payload:** Package the two runtime creatives in `dist/ads.zip`, excluding design references and unused source artwork. Re-encode the three Fireplace panel backgrounds at JPEG quality 40; the release archive is 2,741,287 bytes, under the 3,000,000-byte limit.
- Clickouts retain the brief's example URL as a fallback and accept `window.clickTag` from the ad environment.
