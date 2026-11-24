# Magic Hall — Hybrid Gallery

Magic Hall is a gallery of fictional memories. Gold candles open paintings, blue candles play music, and each work links to its fictional source conversation.

This edition adds AI catalog tags to the artwork details. Firebase AI Logic prefers Chrome's on-device Gemini Nano, with a Gemini Developer API cloud fallback. Visitors can choose on-device-only inference. The artwork and its public caption are the only catalog data sent to the model. For hybrid requests, the interface labels results with the source reported by the SDK. On-device-only requests explicitly use the SDK's device-only mode. Results stay in the current page session.

## Run locally

```sh
python3 -m http.server --bind 127.0.0.1 4187
```

Open http://127.0.0.1:4187/ in desktop Chrome, enter the hall and open a painting. The original gallery works before Firebase is configured. The tag panel indicates when it needs a Firebase Web app.

## Configure Firebase AI Logic

1. Create a Firebase project on the Spark plan. Add a Web app and enable Firebase AI Logic with the Gemini Developer API backend.
2. Put the Web app's client configuration in `firebase-config.js` for your local or deployed copy. Keep deployment-specific Firebase configuration outside the public source repository. Deploy only public client identifiers.
3. For cloud fallback on a hosted site, register the Web app with App Check and set its public reCAPTCHA Enterprise site key as `appCheckSiteKey`. Keep App Check enforcement enabled.
4. For a local cloud test, open the app at `http://127.0.0.1:4187/?appCheckDebug` and register the browser-generated local debug token in Firebase App Check. Keep that token private and remove its registration when the test is over.
5. To use on-device inference, follow the Chrome setup in the Firebase guide below. Model initialization starts only after clicking **Generate tags**. The first on-device run can take several minutes if Chrome must download the model.

The Firebase JavaScript SDK is loaded from Google's CDN at version 13.4.0. No package installation or build step is required.

## Publish on GitHub Pages

Select GitHub Actions as the Pages source. Set the repository Actions secret
`FIREBASE_WEB_CONFIGURATION` to the deployment copy of `firebase-config.js`.
It should contain only the Web SDK's public project identifiers and App Check
public site key. Run the **Publish the gallery** workflow to package and deploy the configured site.

## Verify both inference paths

- **On-device**. In a supported desktop Chrome with the model available, open a painting. Choose **On-device only** and select **Generate tags**. Confirm tags and the **Chrome on-device · Gemini Nano** label.
- **Cloud fallback**. On a deployment with App Check configured, open a browser that does not support Chrome's on-device model. Choose **Prefer on-device** and select **Generate tags**. Confirm tags and the **Firebase cloud fallback** label.
- **Failure**. If the model, SDK, or service is unavailable, the panel reports the failure. The artwork, its fictional conversation, and the music remain accessible.

## Attribution

The original hall layout, candle interactions, fictional conversations, illustrative SVGs, and audio were imported from [the public Magic Hall demo](https://github.com/eyes5638026-cell/magic-hall-kiroween/tree/f07eca7). The Firebase integration, inference controls, and tag results are the changes for #BuildHybridAI. See [LICENSE](LICENSE) and [ASSET_LICENSES.md](ASSET_LICENSES.md).

[Firebase AI Logic web hybrid guide](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started) · [App Check setup](https://firebase.google.com/docs/ai-logic/app-check)
