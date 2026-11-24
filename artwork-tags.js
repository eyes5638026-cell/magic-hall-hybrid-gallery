import { firebaseConfigured, generateArtworkTags, loadArtworkModels } from './firebase-artwork.js';

const copy = {
  en: {
    title: 'Artwork tags',
    path: 'Inference',
    hybrid: 'Prefer on-device',
    local: 'On-device only',
    generate: 'Generate tags',
    guidance: 'Hybrid mode may send this sample artwork and its caption to Firebase.',
    localGuidance: 'The sample artwork and caption stay in this browser.',
    pending: 'Reading the artwork…',
    download: 'Downloading the Chrome model',
    onDevice: 'Chrome on-device · Gemini Nano',
    cloud: 'Firebase cloud fallback',
    unknown: 'Inference source unavailable',
    connecting: 'Connecting to Firebase…',
    setup: 'Connect a Firebase Web app to enable AI tags.',
    localOnly: 'Cloud fallback needs App Check. On-device only is available.',
    failed: 'The model could not return tags. Try again.',
    unavailable: 'The on-device model is unavailable. Use supported desktop Chrome or try hybrid mode.',
    sdkError: 'Firebase AI Logic could not load. Reload to retry.'
  },
  zh: {
    title: '画作标签',
    path: '推理方式',
    hybrid: '优先使用设备端',
    local: '仅使用设备端',
    generate: '生成标签',
    guidance: '混合模式可能将这幅示例画作和说明发送给 Firebase。',
    localGuidance: '示例画作和说明留在本机浏览器。',
    pending: '正在读取画作…',
    download: '正在下载 Chrome 模型',
    onDevice: 'Chrome 设备端 · Gemini Nano',
    cloud: 'Firebase 云端回退',
    unknown: '推理来源不可用',
    connecting: '正在连接 Firebase…',
    setup: '连接 Firebase 网页应用后，就能生成 AI 标签。',
    localOnly: '云端回退需要配置 App Check。目前可使用设备端。',
    failed: '模型暂未生成标签，请重试。',
    unavailable: '当前设备的本地模型不可用。请使用支持的桌面 Chrome，或改用混合模式。',
    sdkError: 'Firebase AI Logic 未能加载。请刷新后重试。'
  }
};

export function createArtworkTags() {
  const panel = document.getElementById('artworkTags');
  const mode = panel.querySelector('select');
  const button = panel.querySelector('button');
  const message = panel.querySelector('[role="status"]');
  const results = panel.querySelector('ul');
  const source = panel.querySelector('.tag-source');
  const hybridOption = mode.querySelector('[value="hybrid"]');
  const cache = new Map();
  let artwork = null;
  let models = null;
  let pending = null;
  let sdkFailed = false;

  const cacheKey = () => artwork.id + '/' + mode.value;

  function render() {
    if (!artwork) return;

    const labels = copy[document.documentElement.lang.startsWith('zh') ? 'zh' : 'en'];
    for (const text of panel.querySelectorAll('[data-tags-text]')) {
      text.textContent = labels[text.dataset.tagsText];
    }

    const key = cacheKey();
    const state = cache.get(key);
    const cloudReady = models?.cloudConfigured;
    hybridOption.disabled = Boolean(models && !cloudReady);
    button.disabled = !models || Boolean(pending);
    mode.disabled = Boolean(pending);
    results.setAttribute('aria-busy', String(pending?.key === key));
    panel.querySelector('.tag-guidance').textContent =
      labels[mode.value === 'local' ? 'localGuidance' : 'guidance'];

    let status = '';
    if (!firebaseConfigured) status = labels.setup;
    else if (!models) status = labels[sdkFailed ? 'sdkError' : 'connecting'];
    else if (!cloudReady) status = labels.localOnly;
    if (pending?.key === key) {
      status = pending.progress === null
        ? labels.pending
        : labels.download + ' · ' + pending.progress + '%';
    } else if (state?.error) {
      status = labels[state.error];
    }
    message.textContent = status;

    results.replaceChildren();
    const tags = state?.tags ?? [];
    for (const tag of tags) {
      const chip = document.createElement('li');
      chip.textContent = tag;
      results.append(chip);
    }

    source.hidden = !tags.length;
    source.textContent = tags.length ? labels[
      state.source === 'on_device' ? 'onDevice' :
      state.source === 'in_cloud' ? 'cloud' : 'unknown'
    ] : '';
  }

  button.addEventListener('click', async () => {
    if (!artwork || !models || pending) return;
    const currentMode = mode.value;
    const currentArt = artwork;
    const key = cacheKey();
    const request = { key, progress: null };
    pending = request;
    cache.delete(key);
    render();

    try {
      const result = await generateArtworkTags(models[currentMode], currentMode, currentArt, (value) => {
        if (pending !== request || !(value >= 0 && value < 1)) return;
        const percentage = Math.round(value * 100);
        if (request.progress === percentage) return;
        request.progress = percentage;
        render();
      });
      cache.set(key, result);
    } catch (error) {
      const unavailable = currentMode === 'local' && /unavailable|unsupported|not supported/i.test(error?.message);
      cache.set(key, { error: unavailable ? 'unavailable' : 'failed' });
    } finally {
      pending = null;
      render();
      if (artwork === currentArt && mode.value === currentMode && panel.closest('dialog').open) {
        panel.scrollIntoView({ block: 'nearest' });
      }
    }
  });

  mode.addEventListener('change', render);

  if (firebaseConfigured) {
    loadArtworkModels().then((ready) => {
      models = ready;
      if (!models.cloudConfigured) mode.value = 'local';
      render();
    }).catch(() => {
      sdkFailed = true;
      render();
    });
  }

  return (item) => {
    artwork = item;
    render();
  };
}
