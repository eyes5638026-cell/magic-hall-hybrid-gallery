import { appCheckSiteKey, firebaseConfig } from './firebase-config.js';

export const firebaseConfigured = Boolean(
  firebaseConfig?.apiKey && firebaseConfig?.appId && firebaseConfig?.projectId
);

const localPreview = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const debugEnabled = localPreview && new URLSearchParams(location.search).has('appCheckDebug');

export async function loadArtworkModels() {
  const [appSDK, aiSDK, appCheckSDK] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.4.0/firebase-ai.js'),
    import('https://www.gstatic.com/firebasejs/13.4.0/firebase-app-check.js')
  ]);

  const app = appSDK.initializeApp(firebaseConfig);
  if (appCheckSiteKey || debugEnabled) {
    if (debugEnabled) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

    const provider = appCheckSiteKey
      ? new appCheckSDK.ReCaptchaEnterpriseProvider(appCheckSiteKey)
      : new appCheckSDK.CustomProvider({
          getToken: async () => { throw new Error('App Check debug setup is incomplete'); }
        });
    appCheckSDK.initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true });
  }

  const ai = aiSDK.getAI(app, { backend: new aiSDK.GoogleAIBackend() });
  return {
    hybrid: aiSDK.getGenerativeModel(ai, { mode: aiSDK.InferenceMode.PREFER_ON_DEVICE }),
    local: aiSDK.getGenerativeModel(ai, { mode: aiSDK.InferenceMode.ONLY_ON_DEVICE }),
    cloudConfigured: Boolean(appCheckSiteKey || debugEnabled)
  };
}

async function artworkPart(src) {
  const url = new URL(src, document.baseURI);
  const artworkFolder = new URL('./assets/art/', document.baseURI);
  if (!url.href.startsWith(artworkFolder.href) || !url.pathname.endsWith('.svg')) {
    throw new Error('Only the bundled example artwork can be tagged');
  }

  const picture = new Image();
  picture.src = url.href;
  await picture.decode();

  const scale = Math.min(1, 640 / Math.max(picture.naturalWidth, picture.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
  canvas.getContext('2d').drawImage(picture, 0, 0, canvas.width, canvas.height);

  return {
    inlineData: {
      mimeType: 'image/png',
      data: canvas.toDataURL('image/png').split(',')[1]
    }
  };
}

export function parseArtworkTags(output) {
  const value = output.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const items = JSON.parse(value);
  if (!Array.isArray(items)) throw new Error('Unexpected tag format');

  const unique = new Map();
  for (const item of items) {
    if (typeof item !== 'string') continue;
    const tag = item.trim().replace(/\s+/g, ' ');
    if (tag && tag.length <= 45) unique.set(tag.toLowerCase(), tag);
  }
  const tags = [...unique.values()].slice(0, 3);
  if (!tags.length) throw new Error('No usable tags returned');
  return tags;
}

export async function generateArtworkTags(model, mode, artwork, onProgress) {
  // Start this during the click, before waiting for image conversion or a network request.
  const initialized = model.initializeDeviceModel(onProgress);
  if (mode === 'local') {
    await initialized;
  } else {
    // The SDK can use the cloud while the device model is unavailable or still downloading.
    initialized.catch(() => {});
  }

  const prompt = [
    'You are cataloguing a fictional painting for an art gallery.',
    'Read the picture and return exactly three distinct English tags for subjects, palette, or mood.',
    'Use one to three words per tag. Return only a JSON array of three strings. No explanation.',
    'Catalog context: ' + artwork.title.en + '. ' + artwork.description.en
  ].join('\n');

  const image = await artworkPart(artwork.src);
  const { response } = await model.generateContent([prompt, image]);
  return { tags: parseArtworkTags(response.text()), source: response.inferenceSource };
}
