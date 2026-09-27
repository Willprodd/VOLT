/* ==========================================================================
   VOLT soluciones digitales - interacciones
   Sin dependencias. Todo usa IntersectionObserver, salvo el progreso
   de la aurora del hero (un listener de scroll pasivo).
   ========================================================================== */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = () => prefersReducedMotion.matches;
  const hasIO = 'IntersectionObserver' in window;

  /* ---------- Navegación: fondo al hacer scroll ---------- */
  function initNavState() {
    const nav = document.getElementById('nav');
    const sentinel = document.querySelector('.top-sentinel');
    if (!nav || !sentinel || !hasIO) return;

    const io = new IntersectionObserver(([entry]) => {
      nav.classList.toggle('is-scrolled', !entry.isIntersecting);
    });
    io.observe(sentinel);
  }

  /* ---------- Navegación: enlace activo según la sección visible ---------- */
  function initActiveLinks() {
    const links = [...document.querySelectorAll('.nav__links a[href^="#"]')];
    if (!links.length || !hasIO) return;

    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const sections = [...byId.keys()]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.classList.remove('is-active'));
          byId.get(entry.target.id)?.classList.add('is-active');
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((s) => io.observe(s));

    // Al volver al hero no queda ningún enlace activo
    const hero = document.getElementById('inicio');
    if (hero) {
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) links.forEach((a) => a.classList.remove('is-active'));
        },
        { rootMargin: '-45% 0px -50% 0px' }
      ).observe(hero);
    }
  }

  /* ---------- Menú móvil ---------- */
  function initMobileMenu() {
    const nav = document.getElementById('nav');
    const toggle = document.querySelector('.nav__toggle');
    const menu = document.getElementById('menu-movil');
    if (!nav || !toggle || !menu) return;

    const icon = toggle.querySelector('.ph');

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      icon?.classList.toggle('ph-list', !open);
      icon?.classList.toggle('ph-x', open);
      menu.hidden = !open;
      nav.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Si la pantalla crece a escritorio con el menú abierto, se cierra
    window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* ---------- Hero: fondo aurora en V (port sin dependencias de SoftAurora de React Bits) ----------
     - Forma: banda fina bajo la navegación que en el centro baja en una V pequeña,
       medida sobre .hero__visual. Al hacer scroll la V se abre hasta quedar recta
       y el título (vía --m) junta sus palabras.
     - Movimiento: el del SoftAurora original (ruido Perlin 3D a plena amplitud,
       mouse y degradado coseno que recorre la pantalla).
     - Color: dos capas azules; el degradado las hace viajar hacia un acento azul
       y el centro de la línea se aclara a un azul pálido cuando más brilla. */
  function initHeroAurora() {
    const host = document.querySelector('.hero__aurora');
    const hero = document.getElementById('inicio');
    if (!host || !hero) return;
    const stage = hero.querySelector('.hero__stage') || hero;

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
    });
    if (!gl) return; // sin WebGL queda el degradado de respaldo del CSS

    // La aurora es muy difusa: se dibuja a media resolución y el navegador la escala
    const RENDER_SCALE = 0.5;

    const num = (key, fallback) => {
      const v = parseFloat(host.dataset[key]);
      return Number.isFinite(v) ? v : fallback;
    };
    const hexToVec3 = (hex) => {
      const h = hex.replace('#', '');
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    };

    const opts = {
      speed: num('speed', 0.6),
      scale: num('scale', 1.5),
      brightness: num('brightness', 1),
      color1: hexToVec3(host.dataset.color1 || '#2F5BFF'),
      color2: hexToVec3(host.dataset.color2 || '#00B8E6'),
      accent1: hexToVec3(host.dataset.accent1 || '#1E90FF'),
      accent2: hexToVec3(host.dataset.accent2 || '#3D8BFF'),
      noiseFreq: num('noiseFrequency', 2.5),
      noiseAmp: num('noiseAmplitude', 1),
      bandHeight: num('bandHeight', 0.5),
      bandSpread: num('bandSpread', 1),
      // Grosor de la banda (1 = el del original, menos = más fina)
      bandWidth: num('bandWidth', 1),
      octaveDecay: num('octaveDecay', 0.1),
      layerOffset: num('layerOffset', 0),
      colorSpeed: num('colorSpeed', 1),
      mouseInfluence: num('mouseInfluence', 0.25),
      // Reacción vertical aparte y más baja: al subir o bajar el mouse la banda casi no se mueve
      mouseInfluenceY: num('mouseInfluenceY', 0.04),
      vWidth: num('vWidth', 0.62),
      vInsetTop: num('vInsetTop', 0),
      vInsetBottom: num('vInsetBottom', 0),
      // Sube (o baja, si es negativo) toda la aurora; fracción del alto del hero
      shiftY: num('shiftY', 0),
      vCalm: num('vCalm', 0.8),
      flatLevel: num('flatLevel', 0.3),
    };

    const vTarget = document.querySelector('.hero__visual');

    const vertex = `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `;

    const fragment = `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif

      uniform float uTime;
      uniform vec3 uResolution;
      uniform float uSpeed;
      uniform float uScale;
      uniform float uBrightness;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uAccent1;
      uniform vec3 uAccent2;
      uniform float uNoiseFreq;
      uniform float uNoiseAmp;
      uniform float uBandHeight;
      uniform float uBandSpread;
      uniform float uOctaveDecay;
      uniform float uLayerOffset;
      uniform float uColorSpeed;
      uniform vec2 uMouse;
      uniform float uMouseInfluence;
      uniform float uMouseInfluenceY;
      // V (unidades de uv: 1.0 = alto del lienzo, y desde abajo)
      uniform float uVEnabled;
      uniform float uVCenterX;
      uniform float uVTop;
      uniform float uVDepth;
      uniform float uVHalfWidth;
      uniform float uVCalm;
      uniform float uFlatY;
      uniform float uBandScale;
      // 0 = V completa, 1 = aurora recta
      uniform float uMorph;

      #define TAU 6.28318
      // Color del centro de la línea cuando brilla más (azul pálido)
      #define CORE_COLOR vec3(0.72, 0.88, 1.0)

      vec3 gradientHash(vec3 p) {
        p = vec3(
          dot(p, vec3(127.1, 311.7, 234.6)),
          dot(p, vec3(269.5, 183.3, 198.3)),
          dot(p, vec3(169.5, 283.3, 156.9))
        );
        vec3 h = fract(sin(p) * 43758.5453123);
        float phi = acos(2.0 * h.x - 1.0);
        float theta = TAU * h.y;
        return vec3(cos(theta) * sin(phi), sin(theta) * cos(phi), cos(phi));
      }

      float quinticSmooth(float t) {
        float t2 = t * t;
        float t3 = t * t2;
        return 6.0 * t3 * t2 - 15.0 * t2 * t2 + 10.0 * t3;
      }

      vec3 cosineGradient(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
        return a + b * cos(TAU * (c * t + d));
      }

      float perlin3D(float amplitude, float frequency, float px, float py, float pz) {
        float x = px * frequency;
        float y = py * frequency;

        float fx = floor(x); float fy = floor(y); float fz = floor(pz);
        float cx = ceil(x);  float cy = ceil(y);  float cz = ceil(pz);

        vec3 g000 = gradientHash(vec3(fx, fy, fz));
        vec3 g100 = gradientHash(vec3(cx, fy, fz));
        vec3 g010 = gradientHash(vec3(fx, cy, fz));
        vec3 g110 = gradientHash(vec3(cx, cy, fz));
        vec3 g001 = gradientHash(vec3(fx, fy, cz));
        vec3 g101 = gradientHash(vec3(cx, fy, cz));
        vec3 g011 = gradientHash(vec3(fx, cy, cz));
        vec3 g111 = gradientHash(vec3(cx, cy, cz));

        float d000 = dot(g000, vec3(x - fx, y - fy, pz - fz));
        float d100 = dot(g100, vec3(x - cx, y - fy, pz - fz));
        float d010 = dot(g010, vec3(x - fx, y - cy, pz - fz));
        float d110 = dot(g110, vec3(x - cx, y - cy, pz - fz));
        float d001 = dot(g001, vec3(x - fx, y - fy, pz - cz));
        float d101 = dot(g101, vec3(x - cx, y - fy, pz - cz));
        float d011 = dot(g011, vec3(x - fx, y - cy, pz - cz));
        float d111 = dot(g111, vec3(x - cx, y - cy, pz - cz));

        float sx = quinticSmooth(x - fx);
        float sy = quinticSmooth(y - fy);
        float sz = quinticSmooth(pz - fz);

        float lx00 = mix(d000, d100, sx);
        float lx10 = mix(d010, d110, sx);
        float lx01 = mix(d001, d101, sx);
        float lx11 = mix(d011, d111, sx);

        return amplitude * mix(mix(lx00, lx10, sy), mix(lx01, lx11, sy), sz);
      }

      // Suavizado de la punta de la V y de sus dos esquinas superiores
      // (fracción del medio ancho de la V; más alto = más redondeado).
      #define V_TIP 0.1
      #define V_CORNER 0.16
      // Ancho de la transición del grosor en las esquinas y en la punta
      #define V_SLOPE_BLEND 0.3
      #define V_TIP_BLEND 0.35
      // Cuánto se reduce el brillo que llena el interior de la punta (0 = nada)
      #define V_TIP_TRIM 0.35

      // Altura de la línea central de la banda en x: plana, y en el centro
      // baja en V. Es una curva continua, sin quiebres donde se unen los
      // tramos, así el brillo no forma pliegues en la punta ni en las esquinas.
      float vLine(float x, float top, float depth, float hw) {
        float s = (x - uVCenterX) / hw;
        float sa = sqrt(s * s + V_TIP * V_TIP) - V_TIP;       // |s| con la punta suavizada
        float v = 1.0 - sa;
        v = 0.5 * (v + sqrt(v * v + V_CORNER * V_CORNER));    // max(v, 0) con las esquinas suavizadas
        return top - depth * v;
      }

      float segmentDistance(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
      }

      // Distancia real desde p hasta la curva, recorriéndola a tramos cortos
      // alrededor de p. Se usa solo debajo de la punta, donde el brillo debe
      // alejarse del vértice por igual hacia todos lados.
      float curveDistance(vec2 p, float top, float depth, float hw) {
        const float R = 0.3;
        const float N = 24.0;
        float best = 1e3;
        vec2 prev = vec2(p.x - R, vLine(p.x - R, top, depth, hw));
        for (float i = 1.0; i <= N; i += 1.0) {
          float x = p.x - R + 2.0 * R * i / N;
          vec2 cur = vec2(x, vLine(x, top, depth, hw));
          best = min(best, segmentDistance(p, prev, cur));
          prev = cur;
        }
        return best;
      }

      // Distancia con signo hasta la línea central de la banda.
      // Con uMorph = 0 es la V; al subir uMorph la V se abre, pierde
      // profundidad y sube hasta uFlatY, donde queda como la recta original.
      // La diferencia de altura se divide por la inclinación de los brazos,
      // así tienen el mismo grosor que la parte plana. Ese factor cambia
      // suave solo en las esquinas y se mantiene en la punta: si siguiera la
      // inclinación real, en la punta caería de golpe y dejaría una línea
      // oscura encima y un haz de luz debajo.
      float bandDistance(vec2 p) {
        if (uVEnabled < 0.5) return p.y - uBandHeight;

        float m = uMorph;
        float top = mix(uVTop, uFlatY, m);
        float depth = uVDepth * (1.0 - m);
        float hw = uVHalfWidth * (1.0 + 1.2 * m);

        float lineY = vLine(p.x, top, depth, hw);
        float s = abs(p.x - uVCenterX) / hw;
        float armSlope = (depth / hw) * (1.0 - smoothstep(1.0 - V_SLOPE_BLEND, 1.0 + V_SLOPE_BLEND, s));

        if (p.y < lineY) {
          // Debajo de la V: cerca de la punta se usa la distancia real a la
          // curva, así el brillo no cuelga hacia abajo ni forma rayas; en los
          // brazos y las esquinas basta la estimación por inclinación.
          float d = (lineY - p.y) / sqrt(1.0 + armSlope * armSlope);
          float nearTip = 1.0 - smoothstep(0.5, 0.85, s);
          if (nearTip > 0.0) d = mix(d, curveDistance(p, top, depth, hw), nearTip);
          return -d;
        }

        // Encima (dentro de la V) se recorta un poco para que la punta
        // no se vea como una mancha grande.
        armSlope *= mix(1.0, smoothstep(0.0, V_TIP_BLEND, s), V_TIP_TRIM);
        return (p.y - lineY) / sqrt(1.0 + armSlope * armSlope);
      }

      // Igual que el original: 3 octavas de ruido que deforman la banda.
      float auroraGlow(float t, vec2 shift, float bandDist, float calm) {
        vec2 uv = gl_FragCoord.xy / uResolution.y;
        uv += shift;

        float noiseVal = 0.0;
        float freq = uNoiseFreq;
        float amp = uNoiseAmp;
        vec2 samplePos = uv * uScale;

        for (float i = 0.0; i < 3.0; i += 1.0) {
          noiseVal += perlin3D(amp, freq, samplePos.x, samplePos.y, t);
          amp *= uOctaveDecay;
          freq *= 2.0;
        }

        float yBand = (bandDist + shift.y) * 10.0 * uBandScale;
        return 0.3 * max(exp(uBandSpread * (1.0 - 1.1 * abs(noiseVal * calm + yBand))), 0.0);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        vec2 p = gl_FragCoord.xy / uResolution.y;
        float t = uSpeed * 0.4 * uTime;
        vec2 shift = (uMouse - 0.5) * vec2(uMouseInfluence, uMouseInfluenceY);

        float bandDist = bandDistance(p);
        // Cerca del vértice la ondulación se suaviza un poco para que la V
        // se lea; al volverse recta recupera toda la del original.
        float calm = 1.0;
        if (uVEnabled > 0.5) {
          calm = mix(uVCalm, 1.0, smoothstep(0.0, uVHalfWidth * 1.6, abs(p.x - uVCenterX)));
          calm = mix(calm, 1.0, uMorph);
        }

        float glow1 = auroraGlow(t, shift, bandDist, calm);
        float glow2 = auroraGlow(t + uLayerOffset, shift, bandDist, calm);
        vec3 gradient1 = cosineGradient(uv.x + uTime * uSpeed * 0.2 * uColorSpeed, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.3, 0.20, 0.20));
        vec3 gradient2 = cosineGradient(uv.x + uTime * uSpeed * 0.1 * uColorSpeed, vec3(0.5), vec3(0.5), vec3(2.0, 1.0, 0.0), vec3(0.5, 0.20, 0.25));

        // El degradado del original recorre la pantalla: aquí mueve cada capa
        // entre su color de marca y su acento, y pulsa su intensidad.
        float phase1 = dot(gradient1, vec3(0.299, 0.587, 0.114));
        float phase2 = dot(gradient2, vec3(0.299, 0.587, 0.114));
        vec3 tint1 = mix(uColor1, uAccent1, smoothstep(0.2, 0.85, phase1));
        vec3 tint2 = mix(uColor2, uAccent2, smoothstep(0.2, 0.85, phase2));
        float shade1 = mix(0.6, 1.0, phase1);
        float shade2 = mix(0.6, 1.0, phase2);

        vec3 col = 0.99 * glow1 * shade1 * tint1;
        col += 0.99 * glow2 * shade2 * tint2;
        col *= uBrightness;

        // Donde las dos capas se suman el color se saturaba y se quemaba a
        // blanco o lila. Se comprime de forma gradual conservando el tono (así
        // la banda mantiene su degradado de centro a bordes), y solo el centro
        // de la línea se aclara hacia un azul pálido.
        float peak = max(col.r, max(col.g, col.b));
        float core = smoothstep(1.2, 2.6, peak);
        col *= (1.0 - exp(-1.3 * peak)) / max(peak, 0.0001);
        col = mix(col, CORE_COLOR, core * 0.5);

        gl_FragColor = vec4(col, clamp(length(col), 0.0, 1.0));
      }
    `;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[VOLT] Aurora shader:', gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[VOLT] Aurora program:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Un solo triángulo que cubre toda la pantalla
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const u = (name) => gl.getUniformLocation(program, name);
    const uTime = u('uTime');
    const uResolution = u('uResolution');
    const uMouse = u('uMouse');
    const uMorph = u('uMorph');
    const uVEnabled = u('uVEnabled');
    const uVCenterX = u('uVCenterX');
    const uVTop = u('uVTop');
    const uVDepth = u('uVDepth');
    const uVHalfWidth = u('uVHalfWidth');
    const uFlatY = u('uFlatY');
    const uBandScale = u('uBandScale');

    // Profundidad de la V (en uv) para la que el grosor original de la banda se ve bien.
    const V_REFERENCE_DEPTH = 0.34;

    gl.uniform1f(u('uSpeed'), opts.speed);
    gl.uniform1f(u('uScale'), opts.scale);
    gl.uniform1f(u('uBrightness'), opts.brightness);
    gl.uniform3fv(u('uColor1'), opts.color1);
    gl.uniform3fv(u('uColor2'), opts.color2);
    gl.uniform3fv(u('uAccent1'), opts.accent1);
    gl.uniform3fv(u('uAccent2'), opts.accent2);
    gl.uniform1f(u('uNoiseFreq'), opts.noiseFreq);
    gl.uniform1f(u('uNoiseAmp'), opts.noiseAmp);
    gl.uniform1f(u('uBandHeight'), opts.bandHeight);
    gl.uniform1f(u('uBandSpread'), opts.bandSpread);
    gl.uniform1f(u('uOctaveDecay'), opts.octaveDecay);
    gl.uniform1f(u('uLayerOffset'), opts.layerOffset);
    gl.uniform1f(u('uColorSpeed'), opts.colorSpeed);
    gl.uniform1f(u('uMouseInfluence'), opts.mouseInfluence);
    gl.uniform1f(u('uMouseInfluenceY'), opts.mouseInfluenceY);
    gl.uniform1f(u('uVCalm'), opts.vCalm);
    gl.clearColor(0, 0, 0, 0);

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    // Progreso V → recta: target lo marca el scroll, value lo sigue suavizado
    const morph = { value: 0, target: 0 };
    // Punto de partida fijo en el tiempo para que el primer cuadro ya tenga forma
    const TIME_OFFSET = 18;
    let running = false;
    let frame = 0;
    let lastTime = 0;
    let lastCssMorph = -1;

    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const smoothstep = (a, b, x) => {
      const t = clamp01((x - a) / (b - a));
      return t * t * (3 - 2 * t);
    };

    // El progreso queda en CSS como --m sobre .hero (0 = V, 1 = recta): el título lo usa para acercar sus dos partes
    const syncCssMorph = () => {
      const m = Math.round(morph.value * 1000) / 1000;
      if (m !== lastCssMorph) {
        hero.style.setProperty('--m', m);
        lastCssMorph = m;
      }
    };

    const renderFrame = (now) => {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform1f(uTime, now * 0.001 + TIME_OFFSET);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uMorph, morph.value);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Scroll: con .hero__stage fijo (sticky) el recorrido extra del .hero marca el
    // progreso; si no está fijo (móvil, pantallas bajas) se usa la salida del hero.
    const updateProgress = () => {
      const rect = hero.getBoundingClientRect();
      const pinned = getComputedStyle(stage).position === 'sticky';
      const travel = pinned ? rect.height - window.innerHeight : window.innerHeight * 0.6;
      const progress = travel > 0 ? clamp01(-rect.top / travel) : 0;
      morph.target = smoothstep(0.04, 0.75, progress);
      if (!running) {
        // Sin animación continua (reducir movimiento) se aplica directo
        morph.value = morph.target;
        syncCssMorph();
        renderFrame(lastTime);
      }
    };

    // Pasa la posición de la celda central al shader, en unidades de uv
    const updateV = () => {
      const hostRect = host.getBoundingClientRect();
      const rect = vTarget?.getBoundingClientRect();
      const H = hostRect.height;
      if (!rect || !rect.height || !H) {
        gl.uniform1f(uVEnabled, 0);
        gl.uniform1f(uBandScale, 1 / opts.bandWidth);
        return;
      }
      const styles = getComputedStyle(vTarget);
      const cssNum = (prop, fallback) => {
        const v = parseFloat(styles.getPropertyValue(prop));
        return Number.isFinite(v) ? v : fallback;
      };
      const insetTop = cssNum('--v-inset-top', opts.vInsetTop);
      const insetBottom = cssNum('--v-inset-bottom', opts.vInsetBottom);
      const top = rect.top - hostRect.top + rect.height * insetTop;
      const bottom = rect.bottom - hostRect.top - rect.height * insetBottom;
      const depth = (bottom - top) / H;
      const vTop = 1 - top / H + cssNum('--v-shift-y', opts.shiftY);
      gl.uniform1f(uVEnabled, 1);
      gl.uniform1f(uBandScale, Math.min(3, Math.max(1, V_REFERENCE_DEPTH / depth)) / opts.bandWidth);
      gl.uniform1f(uVCenterX, (rect.left - hostRect.left + rect.width / 2) / H);
      gl.uniform1f(uVTop, vTop);
      gl.uniform1f(uVDepth, depth);
      gl.uniform1f(uVHalfWidth, depth * opts.vWidth);
      // Altura final de la aurora recta
      gl.uniform1f(uFlatY, vTop - depth * opts.flatLevel);
    };

    const resize = () => {
      updateV();
      const w = Math.max(1, Math.round(host.clientWidth * RENDER_SCALE));
      const h = Math.max(1, Math.round(host.clientHeight * RENDER_SCALE));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform3f(uResolution, w, h, w / h);
      }
      updateProgress();
      if (!running) renderFrame(lastTime);
    };

    const loop = (now) => {
      lastTime = now;
      morph.value += (morph.target - morph.value) * 0.08;
      if (Math.abs(morph.target - morph.value) < 0.0005) morph.value = morph.target;
      syncCssMorph();
      renderFrame(now);
      frame = running ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (running || reduceMotion()) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const rect = host.getBoundingClientRect();
      mouse.tx = (e.clientX - rect.left) / rect.width;
      mouse.ty = 1 - (e.clientY - rect.top) / rect.height;
    });
    stage.addEventListener('pointerleave', () => {
      mouse.tx = 0.5;
      mouse.ty = 0.5;
    });

    window.addEventListener('scroll', updateProgress, { passive: true });

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      stop();
      host.classList.remove('is-ready');
    });

    host.appendChild(canvas);
    resize();
    morph.value = morph.target; // si la página abre ya con scroll, arranca en su punto
    syncCssMorph();
    requestAnimationFrame(() => host.classList.add('is-ready'));

    // La celda puede moverse sin que cambie el tamaño del hero (p. ej. al cargar las fuentes)
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      if (vTarget) ro.observe(vTarget);
    } else {
      window.addEventListener('resize', resize);
    }
    document.fonts?.ready.then(resize);

    prefersReducedMotion.addEventListener('change', () => {
      if (reduceMotion()) {
        stop();
        updateProgress();
      } else start();
    });

    if (hasIO) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      }).observe(stage);
    } else {
      start();
    }
  }

  /* ---------- Hero: recorrido de las palabras del título ----------
     El título empieza dividido (dos palabras a cada lado). Para cada palabra
     se calcula dónde queda en el texto corrido, una sola línea centrada en el
     título, y se guarda la diferencia en --dx / --dy; el CSS la multiplica
     por --m, que escribe la aurora con el progreso del scroll. */
  function initHeroTitle() {
    const title = document.querySelector('.hero__title');
    if (!title) return;
    const words = [...title.querySelectorAll('.hero__word')];
    if (!words.length) return;

    const layout = () => {
      // En móvil el título ya va centrado y no se mueve
      const split = getComputedStyle(title).display === 'grid';
      if (!split) {
        words.forEach((w) => {
          w.style.removeProperty('--dx');
          w.style.removeProperty('--dy');
        });
        return;
      }

      // Ancho de un espacio en la fuente del título
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
      title.appendChild(probe);
      probe.textContent = 'a a';
      const withSpace = probe.getBoundingClientRect().width;
      probe.textContent = 'aa';
      const space = withSpace - probe.getBoundingClientRect().width;
      probe.remove();

      // Posición de partida respecto al título. offsetLeft/Top ignoran translate
      // y transform, pero se miden desde el offsetParent, que puede ser un bloque
      // intermedio (p. ej. mientras corre su animación de entrada): se suman hasta el título.
      const origin = (el) => {
        let left = 0;
        let top = 0;
        while (el && el !== title) {
          left += el.offsetLeft;
          top += el.offsetTop;
          el = el.offsetParent;
        }
        return { left, top };
      };

      const widths = words.map((w) => w.offsetWidth);
      const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
      let x = (title.clientWidth - total) / 2;
      words.forEach((w, i) => {
        const y = (title.clientHeight - w.offsetHeight) / 2;
        const from = origin(w);
        w.style.setProperty('--dx', `${x - from.left}px`);
        w.style.setProperty('--dy', `${y - from.top}px`);
        x += widths[i] + space;
      });
    };

    layout();
    document.fonts?.ready.then(layout);
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(title);
    else window.addEventListener('resize', layout);
  }

  /* ---------- Hero: contadores de estadísticas ---------- */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length || reduceMotion()) return;

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const duration = 1400;
    const startDelay = 650; // espera a que termine la entrada del hero

    counters.forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const suffix = el.dataset.suffix || '';
      const finalText = el.textContent;
      el.setAttribute('aria-label', finalText);
      el.textContent = (0).toFixed(decimals) + suffix;

      setTimeout(() => {
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / duration, 1);
          el.textContent = (target * easeOut(t)).toFixed(decimals) + suffix;
          if (t < 1) requestAnimationFrame(tick);
          else el.textContent = finalText;
        };
        requestAnimationFrame(tick);
      }, startDelay);
    });
  }

  /* ---------- Aparición al entrar en pantalla ---------- */
  function initReveal() {
    const items = document.querySelectorAll('.reveal, [data-steps]');
    if (!items.length) return;

    if (!hasIO) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Proyectos: pestañas accesibles (flechas, Inicio, Fin) ---------- */
  function initTabs() {
    const tablist = document.querySelector('.projects__tabs');
    if (!tablist) return;

    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));

    const select = (index, focus = true) => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        const panel = panels[i];
        if (!panel) return;
        panel.hidden = !active;
        panel.classList.remove('is-entering');
        if (active) {
          void panel.offsetWidth; // reinicia la animación de entrada
          panel.classList.add('is-entering');
        }
      });
      if (focus) tabs[index].focus({ preventScroll: true });

      // En móvil las pestañas se desplazan en horizontal: mantiene visible la activa
      if (tablist.scrollWidth > tablist.clientWidth) {
        tablist.scrollTo({
          left: tabs[index].offsetLeft - tablist.offsetLeft - 16,
          behavior: reduceMotion() ? 'auto' : 'smooth',
        });
      }
    };

    tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i, false)));

    tablist.addEventListener('keydown', (e) => {
      const current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      const last = tabs.length - 1;
      const keys = {
        ArrowDown: current === last ? 0 : current + 1,
        ArrowRight: current === last ? 0 : current + 1,
        ArrowUp: current === 0 ? last : current - 1,
        ArrowLeft: current === 0 ? last : current - 1,
        Home: 0,
        End: last,
      };
      if (e.key in keys) {
        e.preventDefault();
        select(keys[e.key]);
      }
    });
  }

  /* ---------- Preguntas frecuentes: acordeón ---------- */
  function initFaq() {
    document.querySelectorAll('.faq__q').forEach((btn) => {
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        btn.closest('.faq__item')?.classList.toggle('is-open', open);
      });
    });
  }

  /* ---------- Formulario de contacto ---------- */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const card = form.closest('.form-card');
    const success = card?.querySelector('.form-success');
    const alertBox = form.querySelector('.form__alert');
    const submit = form.querySelector('[type="submit"]');
    const submitLabel = submit?.querySelector('.btn__label');
    const submitIcon = submit?.querySelector('.ph');

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRe = /^[+\d][\d\s-]{6,}$/;

    const rules = {
      nombre: (v) => (v.trim().length >= 2 ? '' : 'Escribe tu nombre.'),
      correo: (v) => {
        if (!v.trim()) return 'Escribe tu correo.';
        return emailRe.test(v.trim()) ? '' : 'Revisa el correo, parece incompleto.';
      },
      whatsapp: (v) => (!v.trim() || phoneRe.test(v.trim()) ? '' : 'Escribe un número válido, solo dígitos.'),
      tipo: (v) => (v ? '' : 'Elige el tipo de proyecto.'),
      mensaje: (v) => (v.trim().length >= 10 ? '' : 'Cuéntanos un poco más (mínimo 10 caracteres).'),
    };

    const setError = (field, message) => {
      const errorEl = document.getElementById(`${field.id}-err`);
      if (message) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
      if (errorEl) errorEl.textContent = message;
    };

    const validateField = (field) => {
      const rule = rules[field.name];
      if (!rule) return true;
      const message = rule(field.value);
      setError(field, message);
      return !message;
    };

    // Valida al salir del campo y corrige en vivo cuando ya hay un error
    form.querySelectorAll('input, select, textarea').forEach((field) => {
      field.addEventListener('blur', () => {
        if (field.value || field.hasAttribute('aria-invalid')) validateField(field);
      });
      field.addEventListener('input', () => {
        if (field.hasAttribute('aria-invalid')) validateField(field);
      });
    });

    const setLoading = (loading) => {
      if (!submit) return;
      submit.setAttribute('aria-busy', String(loading));
      submit.disabled = loading;
      if (submitLabel) submitLabel.textContent = loading ? 'Enviando...' : 'Enviar mensaje';
      submitIcon?.classList.toggle('ph-paper-plane-tilt', !loading);
      submitIcon?.classList.toggle('ph-circle-notch', loading);
    };

    const send = async (data) => {
      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        // Modo demostración: no hay endpoint configurado todavía
        console.info('[VOLT] Formulario sin endpoint. Datos capturados:', data);
        await new Promise((r) => setTimeout(r, 1100));
        return;
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (alertBox) alertBox.hidden = true;

      const fields = [...form.querySelectorAll('input, select, textarea')];
      const invalid = fields.filter((f) => !validateField(f));
      if (invalid.length) {
        invalid[0].focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      setLoading(true);
      try {
        await send(data);
        const nameSlot = success?.querySelector('[data-success-name]');
        if (nameSlot) nameSlot.textContent = data.nombre.trim().split(/\s+/)[0];
        form.hidden = true;
        if (success) {
          success.hidden = false;
          success.focus();
        }
        form.reset();
      } catch (err) {
        console.error('[VOLT] Error al enviar el formulario:', err);
        if (alertBox) alertBox.hidden = false;
      } finally {
        setLoading(false);
      }
    });

    card?.querySelector('[data-form-reset]')?.addEventListener('click', () => {
      if (success) success.hidden = true;
      form.hidden = false;
      form.querySelector('input')?.focus();
    });
  }

  /* ---------- Año del footer ---------- */
  function initYear() {
    const el = document.querySelector('[data-year]');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  initNavState();
  initActiveLinks();
  initMobileMenu();
  initHeroAurora();
  initHeroTitle();
  initCounters();
  initReveal();
  initTabs();
  initFaq();
  initContactForm();
  initYear();
})();
