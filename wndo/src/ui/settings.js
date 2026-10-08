// wndo :: settings schema, defaults, persistence
(() => {
  const W = window.W;

  // type: range | choice | toggle. scope: global (default) or scene (remembered per place)
  const SCHEMA = [
    { tab: 'View', items: [
      { key: 'aperture', label: 'Blur strength', type: 'range', min: 0.15, max: 1.6, step: 0.01, def: 0.75 },
      { key: 'blades', label: 'Bokeh shape', type: 'choice', options: [['0', 'round'], ['5', 'five'], ['6', 'six'], ['8', 'eight']], def: '0' },
      { key: 'bokehBright', label: 'Bokeh brightness', type: 'range', min: 0.2, max: 2.5, step: 0.01, def: 1 },
      { key: 'rim', label: 'Bubble edge', type: 'range', min: 0, max: 1, step: 0.01, def: 0.35 },
      { key: 'cat', label: "Cat's eye", hint: 'oval bokeh near the edges, like an old lens', type: 'range', min: 0, max: 1, step: 0.01, def: 0.3 },
      { key: 'ca', label: 'Colour fringe', type: 'range', min: 0, max: 1, step: 0.01, def: 0.3 },
      { key: 'halo', label: 'Glow in the air', type: 'range', min: 0, max: 2, step: 0.01, def: 1 },
      { key: 'parallax', label: 'Parallax', type: 'choice', options: [['off', 'off'], ['mouse', 'pointer'], ['motion', 'tilt']], def: 'mouse' },
      { key: 'parallaxAmt', label: 'Parallax depth', type: 'range', min: 0, max: 1.5, step: 0.01, def: 0.7 },
      { key: 'drift', label: 'Breathing drift', hint: 'tiny idle movement, like someone sitting by the window', type: 'toggle', def: true },
    ] },
    { tab: 'Weather', items: [
      { key: 'rain', label: 'Rain', type: 'range', min: 0, max: 1, step: 0.01, def: 0.6, scope: 'scene' },
      { key: 'wind', label: 'Wind', type: 'range', min: 0, max: 1, step: 0.01, def: 0.3, scope: 'scene' },
      { key: 'fog', label: 'Mist', type: 'range', min: 0, max: 1, step: 0.01, def: 0.3, scope: 'scene' },
      { key: 'cond', label: 'Condensation', type: 'range', min: 0, max: 1, step: 0.01, def: 0.2, scope: 'scene' },
      { key: 'frost', label: 'Frost', type: 'range', min: 0, max: 1, step: 0.01, def: 0, scope: 'scene' },
      { key: 'lightning', label: 'Lightning', type: 'choice', options: [['0', 'none'], ['1', 'rare'], ['2', 'often']], def: '0', scope: 'scene' },
      { key: 'traffic', label: 'Traffic', type: 'range', min: 0, max: 1, step: 0.01, def: 0.6, scope: 'scene', only: ['city'] },
      { key: 'snow', label: 'Snowfall', type: 'range', min: 0, max: 1, step: 0.01, def: 0.6, scope: 'scene', only: ['snow'] },
      { key: 'waves', label: 'Swell', type: 'range', min: 0, max: 1, step: 0.01, def: 0.5, scope: 'scene', only: ['sea'] },
      { key: 'fireflies', label: 'Fireflies', type: 'range', min: 0, max: 1, step: 0.01, def: 0.6, scope: 'scene', only: ['meadow'] },
      { key: 'speed', label: 'Train speed', type: 'range', min: 0, max: 1, step: 0.01, def: 0.6, scope: 'scene', only: ['train'] },
      { key: 'drops', label: 'Drops on glass', type: 'range', min: 0, max: 1.5, step: 0.01, def: 1 },
      { key: 'dropSize', label: 'Drop size', type: 'range', min: 0.5, max: 1.8, step: 0.01, def: 1 },
    ] },
    { tab: 'Window', items: [
      { key: 'frame', label: 'Frame', type: 'choice', options: [['auto', 'auto'], ['picture', 'picture'], ['casement', 'casement'], ['cross', 'cross'], ['sash', 'sash'], ['loft', 'loft'], ['train', 'train'], ['none', 'none']], def: 'auto' },
      { key: 'material', label: 'Finish', type: 'choice', options: [['auto', 'auto'], ['white', 'white'], ['oak', 'oak'], ['charcoal', 'charcoal'], ['green', 'green'], ['steel', 'steel']], def: 'auto' },
      { key: 'candle', label: 'Candle', type: 'choice', options: [['auto', 'auto'], ['on', 'on'], ['off', 'off']], def: 'auto' },
      { key: 'mug', label: 'Tea', type: 'choice', options: [['auto', 'auto'], ['on', 'on'], ['off', 'off']], def: 'auto' },
      { key: 'plant', label: 'Plant', type: 'choice', options: [['auto', 'auto'], ['on', 'on'], ['off', 'off']], def: 'auto' },
      { key: 'roomLight', label: 'Room lamp', type: 'range', min: 0, max: 2, step: 0.01, def: 1 },
      { key: 'refl', label: 'Reflections', type: 'range', min: 0, max: 2, step: 0.01, def: 1 },
      { key: 'wipe', label: 'Draw on fogged glass', type: 'toggle', def: true },
      { key: 'refog', label: 'Fogs back in', type: 'choice', options: [['8', 'fast'], ['30', 'slow'], ['120', 'very slow']], def: '30' },
    ] },
    { tab: 'Sound', items: [
      { key: 'volume', label: 'Volume', type: 'range', min: 0, max: 1, step: 0.01, def: 0.7 },
      { key: 'vRain', label: 'Rain', type: 'range', min: 0, max: 1.5, step: 0.01, def: 1 },
      { key: 'vWind', label: 'Wind', type: 'range', min: 0, max: 1.5, step: 0.01, def: 1 },
      { key: 'vLife', label: 'Life outside', hint: 'traffic, birds, insects, waves, the train', type: 'range', min: 0, max: 1.5, step: 0.01, def: 1 },
      { key: 'vRoom', label: 'Room', hint: 'fire, clock, the hum of the house', type: 'range', min: 0, max: 1.5, step: 0.01, def: 1 },
      { key: 'vThunder', label: 'Thunder', type: 'range', min: 0, max: 1.5, step: 0.01, def: 1 },
      { key: 'open', label: 'Window', hint: 'open lets more of the outside in', type: 'choice', options: [['auto', 'auto'], ['open', 'open a crack'], ['closed', 'closed']], def: 'auto' },
    ] },
    { tab: 'Image', items: [
      { key: 'exposure', label: 'Brightness', type: 'range', min: -2, max: 2, step: 0.01, def: 0 },
      { key: 'warm', label: 'Warmth', type: 'range', min: -1, max: 1, step: 0.01, def: 0 },
      { key: 'sat', label: 'Colour', type: 'range', min: 0, max: 1.6, step: 0.01, def: 1 },
      { key: 'grain', label: 'Film grain', type: 'range', min: 0, max: 1, step: 0.01, def: 0.25 },
      { key: 'vignette', label: 'Vignette', type: 'range', min: 0, max: 1, step: 0.01, def: 0.35 },
    ] },
    { tab: 'Performance', items: [
      { key: 'quality', label: 'Quality', type: 'choice', options: [['battery', 'battery'], ['balanced', 'balanced'], ['high', 'high'], ['ultra', 'ultra']], def: 'high' },
      { key: 'bokehOnly', label: 'Bokeh only', hint: 'skip the scenery, keep the lights. Very light on battery', type: 'toggle', def: false },
      { key: 'fps', label: 'Frame cap', type: 'choice', options: [['24', '24'], ['30', '30'], ['60', '60'], ['0', 'none']], def: '60' },
      { key: 'autoRes', label: 'Adapt resolution', hint: 'lowers detail when the device struggles', type: 'toggle', def: true },
      { key: 'smartRes', label: 'Save work while blurred', hint: 'draws the outside at half detail when you cannot see it sharp anyway', type: 'toggle', def: true },
      { key: 'showFps', label: 'Show frame rate', type: 'toggle', def: false },
    ] },
    { tab: 'Extras', items: [
      { key: 'clock', label: 'Clock', type: 'choice', options: [['off', 'off'], ['24', '24 h'], ['12', '12 h']], def: 'off' },
      { key: 'sleep', label: 'Sleep timer', hint: 'fades sound and picture out', type: 'choice', options: [['0', 'off'], ['15', '15 min'], ['30', '30 min'], ['60', '1 h'], ['90', '1.5 h']], def: '0' },
      { key: 'cycle', label: 'Wander', hint: 'drift to another window every so often', type: 'choice', options: [['0', 'off'], ['10', '10 min'], ['30', '30 min'], ['60', '1 h']], def: '0' },
      { key: 'awake', label: 'Keep the screen awake', hint: 'for leaving it running on a tablet', type: 'toggle', def: true },
      { key: 'hideDelay', label: 'Hide controls after', type: 'choice', options: [['3', '3 s'], ['6', '6 s'], ['15', '15 s']], def: '3' },
    ] },
  ];

  const QUALITY = {
    battery: { scale: 0.5, scene: 0.6, out: 0.75, drops: 1, maxH: 1080 },
    balanced: { scale: 0.7, scene: 0.75, out: 1, drops: 1, maxH: 1440 },
    high: { scale: 0.85, scene: 1, out: 1, drops: 2, maxH: 1440 },
    ultra: { scale: 1, scene: 1, out: 1, drops: 2, maxH: 2160 },
  };

  class Settings {
    constructor() {
      this.g = {};
      this.s = W.store.get('scene-settings', {});
      this.listeners = [];
      for (const tab of SCHEMA) for (const it of tab.items) if (it.scope !== 'scene') this.g[it.key] = it.def;
      if (navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 1100) this.g.quality = 'balanced';
      Object.assign(this.g, W.store.get('settings', {}));
      this.g.sleep = '0';
      this.focus = 0;
    }
    item(key) {
      for (const tab of SCHEMA) for (const it of tab.items) if (it.key === key) return it;
      return null;
    }
    // value for key, considering the current scene
    get(key, scene) {
      const it = this.item(key);
      if (it && it.scope === 'scene') {
        const s = this.s[scene.id] || {};
        if (key in s) return s[key];
        if (scene.defaults && key in scene.defaults) {
          const d = scene.defaults[key];
          return it.type === 'choice' ? String(d) : d;
        }
        return it.def;
      }
      return this.g[key];
    }
    set(key, val, scene) {
      const it = this.item(key);
      if (it && it.scope === 'scene') {
        (this.s[scene.id] = this.s[scene.id] || {})[key] = val;
        W.store.set('scene-settings', this.s);
      } else {
        this.g[key] = val;
        W.store.set('settings', this.g);
      }
      this.listeners.forEach((f) => f(key, val));
    }
    resetScene(scene) {
      delete this.s[scene.id];
      W.store.set('scene-settings', this.s);
      this.listeners.forEach((f) => f('*', null));
    }
    resetAll() {
      this.s = {};
      this.g = {};
      for (const tab of SCHEMA) for (const it of tab.items) if (it.scope !== 'scene') this.g[it.key] = it.def;
      W.store.set('settings', this.g);
      W.store.set('scene-settings', this.s);
      this.listeners.forEach((f) => f('*', null));
    }
    on(f) {
      this.listeners.push(f);
    }
  }

  W.SCHEMA = SCHEMA;
  W.QUALITY = QUALITY;
  W.Settings = Settings;
})();
