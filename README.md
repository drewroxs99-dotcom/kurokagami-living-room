# Kurokagami

Kurokagami is a canvas-based living room scene with hand-painted character plates, a detailed room illustration, adjustable pigments and patterns, and autonomous character interactions.

## Run locally

Requirements: Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by the development server. To check types, run `npm run typecheck`. To build, run `npm run build` (the existing build script also runs the project's database migration step).

## Hosting

The project is configured for Vercel's Vite/Nitro adapter. The repository includes `package-lock.json`; Vercel can detect npm and install both runtime and build dependencies automatically.

### Start a new GitHub repository

GitHub does not unpack a ZIP you upload. Extract this archive first. On GitHub, select **+ → New repository**, choose a name (for example, `kurokagami-living-room`) and visibility, and leave the options to add a README, `.gitignore`, or license unchecked. The project already includes its README and `.gitignore`.

On the empty repository page, select **Add file → Upload files**. Upload the extracted project folders one at a time, dragging each whole folder so its path is preserved: `attachments`, `migrations`, `public`, `screenshots`, `scripts`, `server`, and `src`. Commit each upload. Then upload the files from the project root in one batch, including the hidden `.gitignore` file, and commit. GitHub's browser uploader accepts up to 100 files per batch and 25 MiB per file; every folder here is below the batch limit and the largest file is about 17.4 MiB.

### Deploy on Vercel

1. Import the new GitHub repository into a Vercel project.
2. Keep Vercel's detected install and build settings. The build produces Vercel's `.vercel/output` bundle.
3. Deploy. The current app configuration does not require database or auth credentials.

Vercel's GitHub authorization is separate from ChatGPT's GitHub connection. You can connect the repository to Vercel even if the ChatGPT GitHub app is unavailable.

## What is included

- The complete application source and original assets, including the room artwork, character plates, screenshots, and supplied artwork archive.
- Existing room and household controls, color and pattern customization, character traits, and the built-in sitting, walking, tea, conversation, pipe, pet, and clothing behaviors.
- An **Artwork** panel for importing PNG, JPEG, WebP, and GIF images. Choose a character or all characters and show an overlay always or during sitting, walking, drinking, or smoking. The manual event can be turned on and off with the overlay toggle.
- A small event-aware asset registry. Overlays are fitted proportionally and drawn separately over the original character plate.

Imported images and their assignments are saved in IndexedDB in the current browser profile and site origin. They are not written into this source folder or included in the project ZIP. Use the same browser profile and origin to see those imports again.

## Adding more artwork

Open the house controls, choose **Artwork**, and import one or more images. Each image can be renamed, assigned to a character or the whole cast, connected to a scene action, disabled, or removed. Use transparent PNG or WebP artwork for overlays that should preserve the original plate beneath them. New built-in characters and pose families still require source changes; this panel manages overlays rather than editing the character artwork itself.

## Project notes

The source implements a 2D canvas scene with printed background and character artwork. It does not contain a ray-marching or fractal renderer. The source also does not include a full skeletal character editor, detailed hand-to-object attachment system, injury state machine, or user-defined event scripting. The uploaded-image pipeline is an extensible overlay layer, not a replacement for those larger features.

See [TESTING_REPORT.md](TESTING_REPORT.md) for the audit findings, changes, verification results, and limitations.
