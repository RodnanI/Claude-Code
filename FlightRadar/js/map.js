/* SQUAWK map: MapLibre setup, custom basemap styles, overlay layers, camera control */
(function () {
  'use strict';
  const SQ = window.SQ, S = SQ.S, U = SQ.u, G = SQ.geo;
  const OFM = 'https://tiles.openfreemap.org/planet';
  const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
  const NAME = ['coalesce', ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];
  const R = ['Noto Sans Regular'], B = ['Noto Sans Bold'], I = ['Noto Sans Italic'];

  const THEMES = {
    scope: {
      bg: '#0c0f0d', water: '#070d0c', coast: '#1d3530', wood: '#111611', grass: '#111511', urban: '#151816', park: '#101712',
      border: '#4a4e44', state: '#272b26', road: '#2b2a22', road2: '#1e201b', building: '#171a17', runway: '#34352d', taxi: '#24261f',
      label: '#8f938a', label2: '#646960', halo: '#0c0f0d', water_label: '#2f4f48', ap_label: '#d69a2d', night: '#000000', nightA: 0.16,
      sky: { 'sky-color': '#0c0f0d', 'horizon-color': '#3b2a10', 'fog-color': '#0c0f0d', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.5, 'fog-ground-blend': 0.8, 'atmosphere-blend': 0.6 },
      shade: ['#000000', '#3a3a30'], heat: 'dark'
    },
    chart: {
      bg: '#ebe5d4', water: '#b6ccc3', coast: '#8faea2', wood: '#dcdcbf', grass: '#e2e0c6', urban: '#e3dcc8', park: '#d6dcbb',
      border: '#8e8068', state: '#bdb39d', road: '#fbf8ef', road2: '#f4efe2', building: '#d9d0bb', runway: '#8f887a', taxi: '#b1a993',
      label: '#2f2c26', label2: '#5e584c', halo: '#ebe5d4', water_label: '#4f6f66', ap_label: '#b04a0c', night: '#1d1a14', nightA: 0.1,
      sky: { 'sky-color': '#d8d1bd', 'horizon-color': '#efe9da', 'fog-color': '#ebe5d4', 'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.5, 'fog-ground-blend': 0.7, 'atmosphere-blend': 0.5 },
      shade: ['#7d725d', '#fffbf0'], heat: 'light'
    },
    satellite: {
      label: '#f3efe4', label2: '#d8d3c6', halo: '#000000', border: '#f3efe4', state: '#bdb8aa', water_label: '#cfe3dd', ap_label: '#ffc247', night: '#000000', nightA: 0.22,
      sky: { 'sky-color': '#0b0d0c', 'horizon-color': '#4a3a22', 'fog-color': '#0b0d0c', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.5, 'fog-ground-blend': 0.8, 'atmosphere-blend': 0.6 },
      shade: ['#000000', '#3a3a30'], heat: 'dark'
    }
  };
  THEMES.offline = Object.assign({}, THEMES.scope, { bg: '#080b09', water: '#080b09' });
  const theme = () => THEMES[M.styleId] || THEMES.scope;

  function labelLayers(t, withRoads) {
    const L = [];
    if (withRoads) L.push({
      id: 'road-label', type: 'symbol', source: 'ofm', 'source-layer': 'transportation_name', minzoom: 12,
      filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
      layout: { 'symbol-placement': 'line', 'text-field': ['coalesce', ['get', 'ref'], NAME], 'text-font': R, 'text-size': 10 },
      paint: { 'text-color': t.label2, 'text-halo-color': t.halo, 'text-halo-width': 1.2 }
    });
    L.push(
      { id: 'water-name', type: 'symbol', source: 'ofm', 'source-layer': 'water_name', minzoom: 2,
        filter: ['in', ['get', 'class'], ['literal', ['ocean', 'sea', 'bay', 'strait', 'lake']]],
        layout: { 'text-field': NAME, 'text-font': I, 'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 7, 13], 'text-letter-spacing': 0.15, 'text-max-width': 6 },
        paint: { 'text-color': t.water_label, 'text-halo-color': t.halo, 'text-halo-width': 1 } },
      { id: 'aerodrome', type: 'symbol', source: 'ofm', 'source-layer': 'aerodrome_label', minzoom: 9,
        layout: { 'text-field': ['concat', ['coalesce', ['get', 'iata'], ['get', 'icao'], ''], '\n', NAME], 'text-font': B, 'text-size': 10, 'text-max-width': 9, 'text-offset': [0, 1.2], 'text-anchor': 'top' },
        paint: { 'text-color': t.ap_label, 'text-halo-color': t.halo, 'text-halo-width': 1.2, 'text-opacity': 0.85 } },
      { id: 'place-minor', type: 'symbol', source: 'ofm', 'source-layer': 'place', minzoom: 8,
        filter: ['in', ['get', 'class'], ['literal', ['town', 'village', 'suburb']]],
        layout: { 'text-field': NAME, 'text-font': R, 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 13], 'text-max-width': 8 },
        paint: { 'text-color': t.label2, 'text-halo-color': t.halo, 'text-halo-width': 1.2 } },
      { id: 'place-city', type: 'symbol', source: 'ofm', 'source-layer': 'place', minzoom: 4,
        filter: ['==', ['get', 'class'], 'city'],
        layout: { 'text-field': NAME, 'text-font': R, 'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 10, 15], 'text-max-width': 8,
          'symbol-sort-key': ['coalesce', ['get', 'rank'], 99] },
        paint: { 'text-color': t.label, 'text-halo-color': t.halo, 'text-halo-width': 1.4 } },
      { id: 'place-country', type: 'symbol', source: 'ofm', 'source-layer': 'place', minzoom: 2, maxzoom: 8,
        filter: ['==', ['get', 'class'], 'country'],
        layout: { 'text-field': ['upcase', NAME], 'text-font': B, 'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 6, 13], 'text-letter-spacing': 0.25, 'text-max-width': 7 },
        paint: { 'text-color': t.label2, 'text-halo-color': t.halo, 'text-halo-width': 1.2, 'text-opacity': 0.8 } }
    );
    return L;
  }

  function vectorStyle(id) {
    const t = THEMES[id];
    const layers = [
      { id: 'bg', type: 'background', paint: { 'background-color': t.bg } },
      { id: 'landcover-wood', type: 'fill', source: 'ofm', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['wood', 'forest']]], paint: { 'fill-color': t.wood, 'fill-opacity': 0.8 } },
      { id: 'landcover-grass', type: 'fill', source: 'ofm', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'farmland', 'wetland']]], paint: { 'fill-color': t.grass, 'fill-opacity': 0.6 } },
      { id: 'landuse', type: 'fill', source: 'ofm', 'source-layer': 'landuse', minzoom: 6, filter: ['in', ['get', 'class'], ['literal', ['residential', 'commercial', 'industrial', 'retail']]], paint: { 'fill-color': t.urban, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 11, 0.9] } },
      { id: 'park', type: 'fill', source: 'ofm', 'source-layer': 'park', paint: { 'fill-color': t.park, 'fill-opacity': 0.5 } },
      { id: 'water', type: 'fill', source: 'ofm', 'source-layer': 'water', paint: { 'fill-color': t.water } },
      { id: 'coast', type: 'line', source: 'ofm', 'source-layer': 'water', filter: ['==', ['get', 'class'], 'ocean'], paint: { 'line-color': t.coast, 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.4, 10, 1.2] } },
      { id: 'waterway', type: 'line', source: 'ofm', 'source-layer': 'waterway', minzoom: 8, paint: { 'line-color': t.water, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 2] } },
      { id: 'aeroway-area', type: 'fill', source: 'ofm', 'source-layer': 'aeroway', minzoom: 10, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': t.taxi, 'fill-opacity': 0.6 } },
      { id: 'aeroway-taxi', type: 'line', source: 'ofm', 'source-layer': 'aeroway', minzoom: 11, filter: ['==', ['get', 'class'], 'taxiway'], paint: { 'line-color': t.taxi, 'line-width': ['interpolate', ['exponential', 2], ['zoom'], 11, 1, 16, 12] } },
      { id: 'aeroway-runway', type: 'line', source: 'ofm', 'source-layer': 'aeroway', minzoom: 8, filter: ['==', ['get', 'class'], 'runway'], paint: { 'line-color': t.runway, 'line-width': ['interpolate', ['exponential', 2], ['zoom'], 8, 1.5, 16, 50] } },
      { id: 'building', type: 'fill', source: 'ofm', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': t.building, 'fill-opacity': 0.8 } },
      { id: 'road-minor', type: 'line', source: 'ofm', 'source-layer': 'transportation', minzoom: 11, filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary', 'minor']]], paint: { 'line-color': t.road2, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 11, 0.4, 16, 5] } },
      { id: 'road-major', type: 'line', source: 'ofm', 'source-layer': 'transportation', minzoom: 5, filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]], paint: { 'line-color': t.road, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 5, 0.3, 10, 1.4, 16, 9] } },
      { id: 'boundary-state', type: 'line', source: 'ofm', 'source-layer': 'boundary', minzoom: 4, filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': t.state, 'line-width': 0.7, 'line-dasharray': [3, 2] } },
      { id: 'boundary-country', type: 'line', source: 'ofm', 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': t.border, 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 8, 1.4], 'line-dasharray': [4, 2] } }
    ].concat(labelLayers(t, true));
    return { version: 8, name: id, glyphs: GLYPHS, sources: { ofm: { type: 'vector', url: OFM, attribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>' } }, layers, sky: t.sky, projection: { type: S.globe ? 'globe' : 'mercator' } };
  }
  function satelliteStyle() {
    const t = THEMES.satellite;
    return {
      version: 8, name: 'satellite', glyphs: GLYPHS,
      sources: {
        esri: { type: 'raster', tileSize: 256, maxzoom: 18, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' },
        ofm: { type: 'vector', url: OFM, attribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; OpenMapTiles &copy; OpenStreetMap' }
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#0b0d0c' } },
        { id: 'imagery', type: 'raster', source: 'esri', paint: { 'raster-brightness-max': 0.82, 'raster-saturation': -0.25, 'raster-contrast': 0.05 } },
        { id: 'boundary-country', type: 'line', source: 'ofm', 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': t.border, 'line-opacity': 0.55, 'line-width': 1, 'line-dasharray': [4, 2] } }
      ].concat(labelLayers(t, false)),
      sky: t.sky, projection: { type: S.globe ? 'globe' : 'mercator' }
    };
  }
  function offlineStyle() {
    const pairs = (r) => { const c = []; for (let i = 0; i < r.length; i += 2) c.push([r[i], r[i + 1]]); return c; };
    const grat = [];
    for (let lo = -180; lo <= 180; lo += 10) grat.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[lo, -85], [lo, 0], [lo, 85]] } });
    for (let la = -80; la <= 80; la += 10) grat.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: Array.from({ length: 37 }, (_, i) => [-180 + i * 10, la]) } });
    return {
      version: 8, name: 'offline',
      sources: {
        land: { type: 'geojson', data: { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: (SQ.D.land || []).map((p) => p.map(pairs)) } }, attribution: 'Natural Earth' },
        borders: { type: 'geojson', data: { type: 'Feature', geometry: { type: 'MultiLineString', coordinates: (SQ.D.borders || []).map(pairs) } } },
        grat: { type: 'geojson', data: { type: 'FeatureCollection', features: grat } }
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#080b09' } },
        { id: 'grat', type: 'line', source: 'grat', paint: { 'line-color': '#1a201b', 'line-width': 0.6 } },
        { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#111512' } },
        { id: 'coast', type: 'line', source: 'land', paint: { 'line-color': '#2b4a42', 'line-width': 1 } },
        { id: 'borders', type: 'line', source: 'borders', paint: { 'line-color': '#3a3f36', 'line-width': 0.8, 'line-dasharray': [4, 2] } }
      ],
      sky: THEMES.scope.sky, projection: { type: S.globe ? 'globe' : 'mercator' }
    };
  }
  function styleFor(id) {
    if (id === 'satellite') return satelliteStyle();
    if (id === 'offline') return offlineStyle();
    return vectorStyle(THEMES[id] ? id : 'scope');
  }

  /* ---------------- module ---------------- */
  const M = (SQ.map = { map: null, styleId: S.style, follow: false, chase: false, offline: false, styleFor: (id) => styleFor(id) });
  let readyRes;
  M.ready = new Promise((r) => (readyRes = r));
  const empty = () => ({ type: 'FeatureCollection', features: [] });

  function initialView() {
    const h = location.hash.match(/@(-?[\d.]+),(-?[\d.]+),([\d.]+)z(?:,(-?[\d.]+)b)?(?:,([\d.]+)p)?/);
    if (h) return { center: [+h[2], +h[1]], zoom: +h[3], bearing: +(h[4] || 0), pitch: +(h[5] || 0), src: 'url' };
    const v = SQ.ls.get('view');
    if (v && v.center) return Object.assign(v, { src: 'saved' });
    const home = S.home || SQ.guessHome();
    return { center: [home.lon, home.lat], zoom: SQ.isMobile() ? 6.4 : 7, bearing: 0, pitch: 0, src: 'home' };
  }

  M.init = () => {
    const v = initialView();
    M.startView = v;
    const map = (M.map = new maplibregl.Map({
      container: 'map', style: styleFor(M.styleId), center: v.center, zoom: v.zoom, bearing: v.bearing, pitch: v.pitch,
      maxPitch: 80, attributionControl: false, fadeDuration: 150, dragRotate: true, touchPitch: true,
      pitchWithRotate: true, renderWorldCopies: true, cancelPendingTileRequestsWhileZooming: true
    }));
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('style.load', onStyle);
    map.on('moveend', U.debounce(onMoveEnd, 200));
    map.on('error', onError);
    map.on('click', onClick);
    map.on('dragstart', () => { if (M.follow && !M.chase) setFollow(false); });
    map.on('sourcedata', (e) => { if (e.sourceId === 'ofm' && e.isSourceLoaded) M.tilesOk = true; });
    map.once('load', () => { readyRes(map); emitView(); });
    window.addEventListener('resize', () => map.resize());
    return map;
  };

  let ofmErrors = 0;
  function onError(e) {
    const msg = (e && e.error && (e.error.message || e.error.status)) || '';
    const isOfm = (e && e.sourceId === 'ofm') || /tiles\.openfreemap/.test(String(msg));
    if (isOfm) {
      ofmErrors++;
      /* TileJSON failure (no tile attached) is fatal for the basemap; single tile failures need to pile up */
      if (!M.tilesOk && M.styleId !== 'offline' && (!e.tile || ofmErrors >= 6)) {
        M.offline = true;
        SQ.emit('map:offline');
        setStyleInternal('offline');
      }
    } else if (e && (e.sourceId === 'esri' || e.sourceId === 'dem' || e.sourceId === 'sq-weather')) {
      /* imagery, relief and radar tiles are optional */
    } else console.warn('[SQ] map', msg || e);
  }

  /* ---------------- overlays ---------------- */
  function onStyle() {
    const map = M.map, t = theme();
    const firstLabel = (map.getStyle().layers.find((l) => l.type === 'symbol') || {}).id;
    const add = (src, data, extra) => { if (!map.getSource(src)) map.addSource(src, Object.assign({ type: 'geojson', data: data || empty() }, extra || {})); };
    /* relief below labels */
    map.addSource('dem', { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 12, attribution: 'Terrain: Mapzen, AWS Open Data' });
    map.addLayer({ id: 'sq-relief', type: 'hillshade', source: 'dem', layout: { visibility: 'none' }, paint: { 'hillshade-shadow-color': t.shade[0], 'hillshade-highlight-color': t.shade[1], 'hillshade-exaggeration': 0.45, 'hillshade-accent-color': t.shade[0] } }, firstLabel);
    add('sq-night');
    map.addLayer({ id: 'sq-night', type: 'fill', source: 'sq-night', paint: { 'fill-color': t.night, 'fill-opacity': t.nightA, 'fill-antialias': false } }, firstLabel);
    add('sq-density');
    map.addLayer({
      id: 'sq-density', type: 'heatmap', source: 'sq-density', maxzoom: 10, layout: { visibility: 'none' },
      paint: {
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 10, 9, 30], 'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 9, 1.6],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 10, 0],
        'heatmap-color': t.heat === 'light'
          ? ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.15, 'rgba(176,74,12,0.25)', 0.4, 'rgba(214,110,20,0.55)', 0.7, 'rgba(240,170,40,0.75)', 1, 'rgba(90,40,10,0.9)']
          : ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.12, 'rgba(120,30,10,0.35)', 0.35, 'rgba(220,70,20,0.6)', 0.6, 'rgba(255,160,0,0.75)', 0.85, 'rgba(255,220,120,0.85)', 1, 'rgba(255,255,240,0.95)']
      }
    });
    add('sq-cover');
    map.addLayer({ id: 'sq-cover', type: 'line', source: 'sq-cover', layout: { visibility: 'none' }, paint: { 'line-color': '#ffb000', 'line-opacity': 0.35, 'line-width': 1, 'line-dasharray': [2, 3] } });
    add('sq-rings');
    map.addLayer({ id: 'sq-rings', type: 'line', source: 'sq-rings', layout: { visibility: 'none' }, paint: { 'line-color': t.ap_label, 'line-opacity': 0.4, 'line-width': 1 } });
    if (map.getStyle().glyphs) map.addLayer({ id: 'sq-rings-label', type: 'symbol', source: 'sq-rings', layout: { visibility: 'none', 'symbol-placement': 'point', 'text-field': ['get', 'l'], 'text-font': R, 'text-size': 10, 'text-anchor': 'bottom' }, paint: { 'text-color': t.ap_label, 'text-opacity': 0.7, 'text-halo-color': t.halo, 'text-halo-width': 1 }, filter: ['==', ['geometry-type'], 'Point'] });
    add('sq-airports');
    map.addLayer({
      id: 'sq-ap', type: 'circle', source: 'sq-airports',
      filter: ['any', ['all', ['==', ['get', 's'], 1], ['>=', ['zoom'], 3.5]], ['>=', ['zoom'], 6.5]],
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, ['match', ['get', 's'], 1, 1.6, 1], 9, ['match', ['get', 's'], 1, 4, 2.6]], 'circle-color': t.halo, 'circle-stroke-color': t.ap_label, 'circle-stroke-width': 1.2, 'circle-opacity': 0.9, 'circle-stroke-opacity': 0.8 }
    });
    if (map.getStyle().glyphs) map.addLayer({
      id: 'sq-ap-label', type: 'symbol', source: 'sq-airports', minzoom: 5,
      filter: ['any', ['all', ['==', ['get', 's'], 1], ['>=', ['zoom'], 5]], ['>=', ['zoom'], 8]],
      layout: { 'text-field': ['coalesce', ['get', 'a'], ['get', 'i']], 'text-font': B, 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 9, 10, 11], 'text-offset': [0, 0.9], 'text-anchor': 'top', 'text-letter-spacing': 0.08, 'symbol-sort-key': ['get', 's'] },
      paint: { 'text-color': t.ap_label, 'text-halo-color': t.halo, 'text-halo-width': 1.2, 'text-opacity': 0.85 }
    });
    add('sq-tails');
    map.addLayer({ id: 'sq-tails', type: 'line', source: 'sq-tails', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': 1.4, 'line-opacity': ['get', 'o'] } });
    add('sq-curtain');
    map.addLayer({ id: 'sq-curtain', type: 'fill-extrusion', source: 'sq-curtain', layout: { visibility: 'none' }, paint: { 'fill-extrusion-color': ['get', 'c'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.42 } });
    add('sq-route');
    map.addLayer({ id: 'sq-route', type: 'line', source: 'sq-route', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': ['get', 'w'], 'line-opacity': ['get', 'o'], 'line-dasharray': [1.5, 2] } });
    map.addLayer({ id: 'sq-route-pt', type: 'circle', source: 'sq-route', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': t.halo, 'circle-stroke-color': '#ffb000', 'circle-stroke-width': 2 } });
    if (map.getStyle().glyphs) map.addLayer({ id: 'sq-route-label', type: 'symbol', source: 'sq-route', filter: ['==', ['geometry-type'], 'Point'], layout: { 'text-field': ['get', 'l'], 'text-font': B, 'text-size': 12, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-allow-overlap': true }, paint: { 'text-color': '#ffb000', 'text-halo-color': t.halo, 'text-halo-width': 1.5 } });
    add('sq-trail', null, { lineMetrics: false });
    map.addLayer({ id: 'sq-trail-glow', type: 'line', source: 'sq-trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': 7, 'line-opacity': 0.16, 'line-blur': 3 } });
    map.addLayer({ id: 'sq-trail', type: 'line', source: 'sq-trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': 2.6 } });
    M.layersReady = true;
    M.setAirports();
    M.applyLayers();
    M.updateNight();
    SQ.emit('map:style', M.styleId);
  }

  M.applyLayers = () => {
    const map = M.map;
    if (!map || !M.layersReady) return;
    const L = S.layers;
    const vis = (id, on) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); };
    vis('sq-relief', L.relief && M.styleId !== 'offline');
    vis('sq-night', L.night);
    vis('sq-density', L.density);
    vis('sq-cover', L.coverage);
    vis('sq-rings', L.rings); vis('sq-rings-label', L.rings);
    vis('sq-ap', L.airports); vis('sq-ap-label', L.airports);
    vis('sq-curtain', S.view3d);
    vis('sq-tails', S.trails === 'all');
    if (L.weather) M.weather(true); else M.weather(false);
    if (L.rings) M.updateRings();
    if (L.coverage) M.updateCoverage(SQ.feed.zones());
  };

  M.setAirports = () => {
    const ap = SQ.airports(), src = M.map && M.map.getSource('sq-airports');
    if (!ap || !src) return;
    src.setData({ type: 'FeatureCollection', features: ap.list.map((a) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [a[6], a[5]] }, properties: { i: a[0], a: a[1] || null, s: a[8] } })) });
  };

  M.updateNight = () => {
    const src = M.map && M.map.getSource('sq-night');
    if (!src) return;
    const now = Date.now();
    src.setData({ type: 'FeatureCollection', features: [0, -6, -12, -18].map((e) => ({ type: 'Feature', properties: { e }, geometry: { type: 'Polygon', coordinates: [G.nightRing(now, e)] } })) });
  };
  setInterval(() => { if (S.layers.night) M.updateNight(); }, 60000);

  M.updateRings = () => {
    const src = M.map && M.map.getSource('sq-rings');
    if (!src) return;
    const home = S.home || SQ.guessHome(), feats = [];
    const metric = S.units === 'metric', unit = metric ? 'km' : S.units === 'imperial' ? 'mi' : 'nm';
    const toKm = metric ? 1 : S.units === 'imperial' ? 1.609 : 1.852;
    for (const d of [10, 25, 50, 100, 150, 200]) {
      const km = d * toKm, ring = [];
      for (let b = 0; b <= 360; b += 3) { const p = G.dest(home.lat, home.lon, b, km); ring.push([p[1], p[0]]); }
      feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: ring }, properties: {} });
      const lp = G.dest(home.lat, home.lon, 0, km);
      feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [lp[1], lp[0]] }, properties: { l: d + ' ' + unit } });
    }
    src.setData({ type: 'FeatureCollection', features: feats });
  };
  M.updateCoverage = (zones) => {
    const src = M.map && M.map.getSource('sq-cover');
    if (!src || !zones) return;
    src.setData({ type: 'FeatureCollection', features: zones.map((z) => {
      const ring = [];
      for (let b = 0; b <= 360; b += 4) { const p = G.dest(z.lat, z.lon, b, z.r * 1.852); ring.push([p[1], p[0]]); }
      return { type: 'Feature', geometry: { type: 'LineString', coordinates: ring }, properties: {} };
    }) });
  };
  SQ.on('zones', (z) => { if (S.layers.coverage) M.updateCoverage(z); });

  /* weather radar via RainViewer (free, no key) */
  let wxUrl = null, wxTime = 0;
  M.weather = async (on) => {
    const map = M.map;
    if (!map || !M.layersReady) return;
    if (!on) { if (map.getLayer('sq-weather')) map.removeLayer('sq-weather'); if (map.getSource('sq-weather')) map.removeSource('sq-weather'); return; }
    try {
      if (!wxUrl || Date.now() - wxTime > 600000) {
        const d = await SQ.getJSON('https://api.rainviewer.com/public/weather-maps.json', { noProxy: true, timeout: 8000 });
        const fr = d.radar && d.radar.past && d.radar.past[d.radar.past.length - 1];
        if (!fr) throw new Error('no radar frame');
        wxUrl = d.host + fr.path + '/256/{z}/{x}/{y}/2/1_1.png';
        wxTime = Date.now();
        M.weatherTime = fr.time * 1000;
      }
      if (map.getLayer('sq-weather')) map.removeLayer('sq-weather');
      if (map.getSource('sq-weather')) map.removeSource('sq-weather');
      map.addSource('sq-weather', { type: 'raster', tiles: [wxUrl], tileSize: 256, maxzoom: 7, attribution: 'Radar &copy; RainViewer' });
      map.addLayer({ id: 'sq-weather', type: 'raster', source: 'sq-weather', paint: { 'raster-opacity': 0.6, 'raster-fade-duration': 300 } }, map.getLayer('sq-ap') ? 'sq-ap' : undefined);
      SQ.emit('weather:ok', M.weatherTime);
    } catch (e) {
      SQ.emit('toast', 'Weather radar unavailable right now', 'warn');
      SQ.set('layers.weather', false);
    }
  };
  setInterval(() => { if (S.layers.weather) M.weather(true); }, 600000);

  /* ---------------- selected aircraft: trail, curtain, route ---------------- */
  const altHex = (ft) => SQ.color.hex(SQ.color.alt(ft == null || isNaN(ft) ? 0 : ft));
  M.updateTrail = (ac) => {
    const map = M.map;
    if (!map || !M.layersReady) return;
    const tsrc = map.getSource('sq-trail'), csrc = map.getSource('sq-curtain');
    if (!ac) { tsrc && tsrc.setData(empty()); csrc && csrc.setData(empty()); return; }
    const tr = ac.trail, st = SQ.tracker.STRIDE, segs = [], curt = [];
    const ex = S.exaggerate || 1;
    const n = tr.length / st;
    const pts = [];
    for (let i = 0; i < n; i++) pts.push([tr[i * st], tr[i * st + 1], tr[i * st + 2]]);
    if (ac.rlat != null) pts.push([ac.rlon, ac.rlat, ac.ralt]);
    /* unwrap longitudes so trails crossing the antimeridian stay continuous */
    for (let i = 1; i < pts.length; i++) { while (pts[i][0] - pts[i - 1][0] > 180) pts[i][0] -= 360; while (pts[i][0] - pts[i - 1][0] < -180) pts[i][0] += 360; }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const c = altHex(b[2]);
      segs.push({ type: 'Feature', properties: { c }, geometry: { type: 'LineString', coordinates: [[a[0], a[1]], [b[0], b[1]]] } });
      if (S.view3d) {
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, w = 0.00012 * Math.max(1, ex / 2);
        const nx = (-dy / len) * w, ny = (dx / len) * w;
        const h = (isNaN(b[2]) ? 0 : b[2]) * 0.3048 * ex;
        curt.push({ type: 'Feature', properties: { c, h }, geometry: { type: 'Polygon', coordinates: [[[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny], [a[0] + nx, a[1] + ny]]] } });
      }
    }
    tsrc.setData({ type: 'FeatureCollection', features: segs });
    csrc.setData({ type: 'FeatureCollection', features: curt });
  };
  M.updateRoute = (ac, route) => {
    const src = M.map && M.map.getSource('sq-route');
    if (!src) return;
    if (!ac || !route || !route.origin || route.origin.lat == null) { src.setData(empty()); return; }
    const o = route.origin, d = route.dest, lat = ac.rlat == null ? ac.lat : ac.rlat, lon = ac.rlon == null ? ac.lon : ac.rlon;
    const flown = G.arc(o.lat, o.lon, lat, lon), ahead = G.arc(lat, lon, d.lat, d.lon);
    const col = route.verified === false ? '#8d8a80' : '#ffb000';
    src.setData({ type: 'FeatureCollection', features: [
      { type: 'Feature', properties: { c: col, w: 1.5, o: 0.35 }, geometry: { type: 'LineString', coordinates: flown } },
      { type: 'Feature', properties: { c: col, w: 2, o: 0.85 }, geometry: { type: 'LineString', coordinates: ahead } },
      { type: 'Feature', properties: { l: o.iata || o.icao || '' }, geometry: { type: 'Point', coordinates: [o.lon, o.lat] } },
      { type: 'Feature', properties: { l: d.iata || d.icao || '' }, geometry: { type: 'Point', coordinates: [d.lon, d.lat] } }
    ] });
  };
  /* short tails for every aircraft, three opacity bands so they fade out */
  M.updateTails = (acs) => {
    const src = M.map && M.map.getSource('sq-tails');
    if (!src) return;
    if (S.trails !== 'all') { src.setData(empty()); return; }
    const st = SQ.tracker.STRIDE, feats = [], now = Date.now();
    for (const ac of acs) {
      const tr = ac.trail, n = tr.length / st;
      if (n < 2) continue;
      const c = altHex(ac.gnd ? 0 : ac.alt);
      const pts = [];
      for (let i = 0; i < n; i++) if (now - tr[i * st + 3] < 240000) pts.push([tr[i * st], tr[i * st + 1]]);
      if (ac.rlat != null) pts.push([ac.rlon, ac.rlat]);
      if (pts.length < 2) continue;
      const k = Math.ceil(pts.length / 3);
      for (let b = 0; b < 3; b++) {
        const seg = pts.slice(b * k, (b + 1) * k + 1);
        if (seg.length > 1) feats.push({ type: 'Feature', properties: { c, o: [0.12, 0.28, 0.55][b] }, geometry: { type: 'LineString', coordinates: seg } });
      }
    }
    src.setData({ type: 'FeatureCollection', features: feats });
  };
  M.updateDensity = (acs) => {
    const src = M.map && M.map.getSource('sq-density');
    if (!src || !S.layers.density) return;
    src.setData({ type: 'FeatureCollection', features: acs.map((ac) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [ac.lon, ac.lat] } })) });
  };

  /* ---------------- style switching ---------------- */
  function setStyleInternal(id) {
    M.styleId = id;
    M.layersReady = false;
    document.documentElement.dataset.theme = id === 'chart' ? 'light' : 'dark';
    document.documentElement.dataset.map = id;
    M.map.setStyle(styleFor(id), { diff: false });
  }
  M.setStyle = (id) => { ofmErrors = 0; M.tilesOk = false; M.offline = id === 'offline'; setStyleInternal(id); };
  SQ.on('setting:style', (p, v) => M.setStyle(v));
  SQ.on('setting:layers', () => M.applyLayers());
  SQ.on('setting:globe', () => { if (M.map && M.layersReady) M.map.setProjection({ type: S.globe ? 'globe' : 'mercator' }); });
  SQ.on('setting:units', () => { if (S.layers.rings) M.updateRings(); });
  SQ.on('setting:trails', () => M.applyLayers());
  SQ.on('setting:home', () => { if (S.layers.rings) M.updateRings(); });

  /* ---------------- camera ---------------- */
  function emitView() {
    const map = M.map, c = map.getCenter(), b = map.getBounds();
    const view = { center: [c.lat, c.lng], zoom: map.getZoom(), bounds: { n: b.getNorth(), s: b.getSouth(), e: U.clamp(b.getEast(), -540, 540), w: b.getWest() } };
    if (view.bounds.e - view.bounds.w >= 360) { view.bounds.w = -180; view.bounds.e = 180; }
    view.bounds.e = ((view.bounds.e + 540) % 360) - 180;
    view.bounds.w = ((view.bounds.w + 540) % 360) - 180;
    if (view.bounds.n > 85) view.bounds.n = 85;
    if (view.bounds.s < -85) view.bounds.s = -85;
    M.view = view;
    SQ.feed.setView(view);
    SQ.emit('view', view);
  }
  function onMoveEnd() {
    const map = M.map, c = map.getCenter();
    emitView();
    const z = map.getZoom().toFixed(2), b = map.getBearing(), p = map.getPitch();
    SQ.ls.set('view', { center: [c.lng, c.lat], zoom: +z, bearing: b, pitch: p });
    M.writeHash();
  }
  M.writeHash = () => {
    const map = M.map;
    if (!map) return;
    const c = map.getCenter();
    let h = '#@' + c.lat.toFixed(4) + ',' + c.lng.toFixed(4) + ',' + map.getZoom().toFixed(2) + 'z';
    const b = Math.round(map.getBearing()), p = Math.round(map.getPitch());
    if (b || p) h += ',' + b + 'b,' + p + 'p';
    if (SQ.tracker.selected) h += '/' + SQ.tracker.selected;
    history.replaceState(null, '', h);
  };
  function onClick(e) {
    if (SQ.render && SQ.render.clickAt(e.point.x, e.point.y)) return;
    const f = M.map.queryRenderedFeatures(e.point, { layers: ['sq-ap'].filter((l) => M.map.getLayer(l)) })[0];
    if (f) { SQ.emit('airport:click', f.properties.i); return; }
    if (SQ.tracker.selected && !SQ.isMobile()) SQ.tracker.select(null);
    else if (SQ.tracker.selected && SQ.isMobile()) SQ.emit('map:tap-empty');
  }
  function setFollow(on) {
    M.follow = on;
    if (!on) M.chase = false;
    SQ.emit('follow', M.follow, M.chase);
  }
  M.setFollow = setFollow;
  M.toggleFollow = () => setFollow(!M.follow);
  M.toggleChase = () => {
    const ac = SQ.tracker.sel();
    if (!ac) return;
    M.chase = !M.chase;
    M.follow = M.chase || M.follow;
    if (M.chase) M.map.easeTo({ zoom: Math.max(M.map.getZoom(), 10.5), pitch: 68, bearing: ac.rtrk || ac.track || 0, duration: 1600 });
    else M.map.easeTo({ pitch: S.view3d ? 50 : 0, duration: 1000 });
    SQ.emit('follow', M.follow, M.chase);
  };
  /* called every frame by the renderer */
  M.tickCamera = (ac, dt) => {
    if (!M.follow || !ac || ac.rlat == null || M.map.isEasing && M.map.isEasing()) return;
    const map = M.map, c = map.getCenter();
    const k = Math.min(1, dt / 220);
    const lon = c.lng + U.angDiff(c.lng, ac.rlon) * k, lat = c.lat + (ac.rlat - c.lat) * k;
    const opts = { center: [lon, lat] };
    if (M.chase) opts.bearing = map.getBearing() + U.angDiff(map.getBearing(), ac.rtrk) * Math.min(1, dt / 900);
    map.jumpTo(opts);
  };
  M.flyToAc = (ac, opts) => {
    if (!ac || !M.map) return;
    const z = Math.max(M.map.getZoom(), (opts && opts.zoom) || 8.5);
    const pad = SQ.isMobile() ? { bottom: window.innerHeight * 0.38, top: 40, left: 0, right: 0 } : { right: 380, left: 0, top: 0, bottom: 0 };
    M.map.flyTo({ center: [ac.rlon || ac.lon, ac.rlat || ac.lat], zoom: z, speed: 1.4, curve: 1.3, padding: pad, essential: true });
  };
  M.flyTo = (lat, lon, zoom) => M.map && M.map.flyTo({ center: [lon, lat], zoom: zoom || Math.max(M.map.getZoom(), 9), speed: 1.4, essential: true });
  M.fitRoute = (route, ac) => {
    if (!route || !route.origin) return;
    const pts = [[route.origin.lon, route.origin.lat], [route.dest.lon, route.dest.lat], [ac.rlon || ac.lon, ac.rlat || ac.lat]];
    const b = new maplibregl.LngLatBounds(pts[0], pts[0]);
    pts.forEach((p) => b.extend(p));
    M.map.fitBounds(b, { padding: SQ.isMobile() ? { top: 80, bottom: window.innerHeight * 0.45, left: 40, right: 40 } : { top: 90, bottom: 90, left: 90, right: 460 }, maxZoom: 9, duration: 1400 });
  };
  M.set3D = (on) => {
    const map = M.map;
    if (!map) return;
    if (on && S.globe) SQ.set('globe', false);
    map.easeTo({ pitch: on ? 58 : 0, bearing: on ? (map.getBearing() || -20) : 0, duration: 1200 });
    M.applyLayers();
    SQ.emit('3d', on);
  };
  SQ.on('setting:view3d', (p, v) => M.set3D(v));
})();
