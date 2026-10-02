/* ==========================================================================
   VOLT soluciones digitales - interacciones
   Sin dependencias. Todo usa IntersectionObserver, salvo el progreso
   de salida del hero (un listener de scroll pasivo).
   ========================================================================== */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = () => prefersReducedMotion.matches;
  const hasIO = 'IntersectionObserver' in window;

  // Progreso de salida del hero (0 = arriba del todo, 1 = fuera de pantalla).
  // Lo escribe initHeroScroll; la aurora y el planeta lo leen en su animación.
  const heroScroll = { m: 0 };

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
    window.matchMedia('(min-width: 1041px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* ---------- Hero: aurora recta detrás del logo (port sin dependencias de SoftAurora de React Bits) ----------
     - Forma: banda horizontal a la altura de .hero__band (centro de las letras VOLT),
       así la aurora hace de fondo del logo.
     - Movimiento: el del SoftAurora original (ruido Perlin 3D a plena amplitud,
       mouse y degradado coseno que recorre la pantalla).
     - Color: dos capas azules; el degradado las hace viajar hacia un acento azul
       y el centro de la línea se aclara a un azul pálido cuando más brilla. */
  function initHeroAurora() {
    const host = document.querySelector('.hero__aurora');
    const hero = document.getElementById('inicio');
    if (!host || !hero) return;
    const stage = hero.querySelector('.hero__stage') || hero;
    // Marcador de la altura de la banda
    const bandRef = hero.querySelector('.hero__band');

    // Altura de la banda en px desde el borde superior de la aurora; también
    // queda en CSS (--band-y) para el respaldo sin WebGL
    const measureBand = () => {
      const hostRect = host.getBoundingClientRect();
      const y = bandRef
        ? bandRef.getBoundingClientRect().top - hostRect.top
        : hostRect.height * 0.42;
      host.style.setProperty('--band-y', `${Math.round(y)}px`);
      return { y, height: hostRect.height };
    };

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
    });
    if (!gl) {
      // Sin WebGL queda el halo de respaldo del CSS, a la altura del logo
      measureBand();
      if ('ResizeObserver' in window) new ResizeObserver(measureBand).observe(host);
      return;
    }

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
      bandSpread: num('bandSpread', 1),
      // Grosor de la banda (1 = el del original, más = más gruesa)
      bandWidth: num('bandWidth', 1),
      octaveDecay: num('octaveDecay', 0.1),
      layerOffset: num('layerOffset', 0),
      colorSpeed: num('colorSpeed', 1),
      mouseInfluence: num('mouseInfluence', 0.25),
      // Reacción vertical aparte y más baja: al subir o bajar el mouse la banda casi no se mueve
      mouseInfluenceY: num('mouseInfluenceY', 0.04),
    };

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
      uniform float uBandY;      // altura de la banda (uv: 1.0 = alto del lienzo, y desde abajo)
      uniform float uBandScale;  // 1 / grosor de la banda
      uniform float uBandSpread;
      uniform float uOctaveDecay;
      uniform float uLayerOffset;
      uniform float uColorSpeed;
      uniform vec2 uMouse;
      uniform float uMouseInfluence;
      uniform float uMouseInfluenceY;

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

      // Igual que el original: 3 octavas de ruido que deforman la banda.
      float auroraGlow(float t, vec2 shift) {
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

        float yBand = (uv.y - uBandY) * 10.0 * uBandScale;
        return 0.3 * max(exp(uBandSpread * (1.0 - 1.1 * abs(noiseVal + yBand))), 0.0);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        float t = uSpeed * 0.4 * uTime;
        vec2 shift = (uMouse - 0.5) * vec2(uMouseInfluence, uMouseInfluenceY);

        float glow1 = auroraGlow(t, shift);
        float glow2 = auroraGlow(t + uLayerOffset, shift);
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
    const uBandY = u('uBandY');
    const uBandScale = u('uBandScale');
    const uBrightness = u('uBrightness');
    const bandScale = 1 / Math.max(0.1, opts.bandWidth);

    gl.uniform1f(u('uSpeed'), opts.speed);
    gl.uniform1f(u('uScale'), opts.scale);
    gl.uniform1f(uBrightness, opts.brightness);
    gl.uniform3fv(u('uColor1'), opts.color1);
    gl.uniform3fv(u('uColor2'), opts.color2);
    gl.uniform3fv(u('uAccent1'), opts.accent1);
    gl.uniform3fv(u('uAccent2'), opts.accent2);
    gl.uniform1f(u('uNoiseFreq'), opts.noiseFreq);
    gl.uniform1f(u('uNoiseAmp'), opts.noiseAmp);
    gl.uniform1f(uBandScale, bandScale);
    gl.uniform1f(u('uBandSpread'), opts.bandSpread);
    gl.uniform1f(u('uOctaveDecay'), opts.octaveDecay);
    gl.uniform1f(u('uLayerOffset'), opts.layerOffset);
    gl.uniform1f(u('uColorSpeed'), opts.colorSpeed);
    gl.uniform1f(u('uMouseInfluence'), opts.mouseInfluence);
    gl.uniform1f(u('uMouseInfluenceY'), opts.mouseInfluenceY);
    gl.clearColor(0, 0, 0, 0);

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    // Punto de partida fijo en el tiempo para que el primer cuadro ya tenga forma
    const TIME_OFFSET = 18;
    let running = false;
    let frame = 0;
    let lastTime = 0;
    // Pasa la altura de la banda al shader, en unidades de uv
    const updateBand = () => {
      const { y, height } = measureBand();
      if (height) gl.uniform1f(uBandY, 1 - y / height);
    };

    // Scroll suavizado: al bajar la banda se estrecha, pierde brillo y sube con el logo
    let scrollM = 0;
    let bandM = -1;

    const renderFrame = (now) => {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      scrollM += (heroScroll.m - scrollM) * 0.12;
      if (Math.abs(scrollM - bandM) > 0.002) {
        bandM = scrollM;
        updateBand();
        gl.uniform1f(uBandScale, bandScale * (1 + scrollM * 2.2));
        gl.uniform1f(uBrightness, opts.brightness * (1 - scrollM * 0.6));
      }
      gl.uniform1f(uTime, now * 0.001 + TIME_OFFSET);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      updateBand();
      const w = Math.max(1, Math.round(host.clientWidth * RENDER_SCALE));
      const h = Math.max(1, Math.round(host.clientHeight * RENDER_SCALE));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform3f(uResolution, w, h, w / h);
      }
      if (!running) renderFrame(lastTime);
    };

    const loop = (now) => {
      lastTime = now;
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

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      stop();
      host.classList.remove('is-ready');
    });

    host.appendChild(canvas);
    resize();
    requestAnimationFrame(() => host.classList.add('is-ready'));

    // El logo puede moverse sin que cambie el tamaño del hero (p. ej. al cargar las fuentes)
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      if (bandRef?.parentElement) ro.observe(bandRef.parentElement);
    } else {
      window.addEventListener('resize', resize);
    }
    document.fonts?.ready.then(resize);

    prefersReducedMotion.addEventListener('change', () => {
      if (reduceMotion()) {
        stop();
        renderFrame(lastTime);
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

  /* ---------- Hero: planeta conectado (esquina inferior izquierda) ----------
     Canvas 2D sin dependencias. El planeta gira despacio y solo asoma su
     cuarto superior derecho: el centro queda fuera de pantalla, abajo a la
     izquierda. Capas: brillo de atmósfera y esfera (fijas, se dibujan una
     vez), continentes en puntos, rutas de red entre ciudades con pulsos que
     las recorren, nodos (Bogotá con un anillo que late) y un halo de
     partículas alrededor. */
  function initHeroGlobe() {
    const canvas = document.querySelector('.hero__globe');
    const hero = document.getElementById('inicio');
    if (!canvas || !hero) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Tierra: un bit por punto de una esfera de Fibonacci de 48 000 puntos
    // (1 = tierra). Generado de Natural Earth 110 m (dominio público), sin la Antártida.
    const LAND_BITS = 'AAAAAAAAAAAAAAAAAAAAAAAAIAAAAIAQABIAQgBICAgJISEhJISMhLAQEJJCRkJICggJIQkgJAQEhJAVEBJCUkBICgkIISkgJAQEhJATEBACwkDICAgKAQMk4IQMgJgDMHRCBsDcAJkIIQNgKAAMgIEBMBACDsDQABkwAwdmZAAcgLEDM2BGjszEATgQYwdixogciZkjcGHGDszMkTgSc0d25shMiZknMWtmLsSMk5g3M89m1kxM24tvMWtnvsW9t7iXF9/mXtl8y0tvc6tvvuW9t/jW19ru3t992ntt8++vvP21v/v31972399522tv/++vvP29v/P3197+/155+/tv722vvf3/v/L319/e/15bu/9v523vvb3/vbJ299/K/197O/9/5+3uvJ3/vfJ239/O3195O/9/Ze2+vZW/v/J23t7a2n97K39/5+28vZW1//ZW3t7O2/17K29/5e38vZW1+/dW3t7K2/17K2v37az8vZWx+/dW3s7KW/l7K2Pn7a38nZWx+/dW3s7KS/k7K2PnbaX8nZWT83dWTs7LSrk7KzPn76S8nJWXcndWZs7NSbk7Kytn5qSMnJGTcndSZs7Mabk7IStn5qTMnJGTcndSds7MaZk7Iy/n7qTsnJHTcnNCfs7NaZk5Iy/n5qTsnJPTc3NCXs7cSdk5Iyfn5oT8nLvTM3NCTs7NCdk5cydn5oT8nJnTs3NCTs7Mifk5N6dn5oT8nJkTs3Nmbs7Mifk5N6fn5qTcnpsT83NmTs7NCbk9N6fn58TcnpuT83NuTs/NSbk9N6fn59TcnJuTc3NuTs/Nebk9N6fn59TcnpuTcntuTs/Pqbk5Nyfn5tycnpvTcnNuTs/Pqbk9Nyfn5tycnpvTc3NuTs/Nqbk9N6fm5tycnptTc3JuTs/NuTk9N6fn5NycnJNTc3NuTs3JuTk5J6fn5NycnptTc3JuTs3JuTk9J6fm5tycnptTc3NuTs3JuTk9J6fm9pycmpNTc3tuTs3NqTk9J6fm9tycnpNTc3pOTs3tOTk1J6fm9Nycmptzc3pOTs3JuTk1J6fm9tycmpNzc2pOTs3JuRk9J6fm9NycmpNzM2pOTs3ouDk1J+fm1NycmpNxM2puTs3ouDk1J+dm1NycmpFxc2pOzsypuTk1J+Nm1JycmlFzcmpOxsypuTk1I+Pm9JycmFFzc2pOxs2oOTk1o+bk9JycmVFzcmJGxsnoOTk1o+bm9JyMkVFzcmpGxMnoOT03o+bkxIyOkZFzempGxcnIOTUjo+bkxIyKkZFzempGxcmIGRUjI+fkxIyKkRFzam5GzcmoGRUjI+b01IyKkxFzam5Oz8mJGRUjI+bU1JyKkxFzak5OzumJGRUjI+bUnJyIk1NzKk5OzKgJORUnJ2bUnJyckxNzKk5OzKgZOTEnp+bUnJicUxNyKkZOzKkZOTEnJ+ZUjJyYURNyIk5OzKkZMTmjJuRUjJiYUTNiYk5OzKk4MTGjJuRUjJiYUzNick5OyKkYMTGjJsREjJyYU3NiYk5NyKkYMTGnpsTknJyQUzFiYkZNyYkYMTGnZuTknJyQUzFiYkZNyckYMSGnZuTEjJ6QkzFiakZNyck5OSWnZsTUjJiQkzNiakbMiKkZOSEjZ8TUjJiQ0TNyakbMiKkZMSGjZ8TUjJgQ0TNySkbOiKkZMSGjZ8TUjJ4QUzNyQkbPiKkZNSGiZ+SUjJ4RUzNiQk7PiKkZPSGiZsSEjJ4RUzN6QkbNiCkZPSGmZsSEjJoRUzJqQkbNiCkZPSGmZvSEjJoRUzJ6QkzNiAkZNSGmZPSEjJoRUzJqQkzN6AkZNSGmZPSEnJoRUzJqQkzJ6CkZNSemZNSEmJpRUzJqQkzJqCkZNSemZNSEmJLRUzJqSkzJqAk5NaemZNSEmJJTUzJqTkzJqAk5Jaem5NSEmJJTU3JqTk3JqQkxJaem5NSUmJJTU3JKSk3JqQkxJaem5NScmJJTUmJKTk3JqSkxJaem5NSUmpJTUmJKTk3JKSkxJaeg5JSUkpJTUmJKTk3JqSk1JaegxJSckpJTUmJKTkHJqTklJaekxJSckpJTUmpKTkGJKSklJaekxJSckpJTU0pKTkGJKSklJaeklJScghJTc0pKTkmJKTklJaOklJScghJTckpKTkkpKTklJaLmlJScghJTUkpKRkkpKTklJabmlJScglJTU0pKRkkpKTkFJabklJScglJSckpKRE0pKTkFpaaklJSMglJSckpKTE0pKTkFpaaklJSIglJSckpKTcEpKTkFpaTklJSIilJScgpKTUUpKTEFpaTglJSaglNScApKSUEpKRklpaTglJSaglNSYApKSUEpKREFpaTgFJSSilJSYkpKScEpKRUFpaTAlJSSglJSMkpKScEpKTUFpaTAlJSSglJSKkpKSYEpKSUFp6Tg1JSSglJSKkpKSYEpKSUFpaRQ1JSSAlNSakpKSYEpKSUFpKRU1JSSAlNTSgpKSaGpKSUFpKRU0JSSAlNSSgpISakoKSUFpqSUVJCSAkNSSgpISakgKSUFpqSUFJCaQkNCSgpISamhICUFhoSUFJCaQkFSSgpMSSmpIDUFhoSUFJCSQkFASgpMCSmpIDWFhoSUFJiSQkFAagoMCSkpICWFgqCUFBiSUkNAagoNCSkpICWFgoDUVBkSUlJAagoFSSmpICSFgoDUVBgSUlJASgoFAampMCSkpoDUVBqSUlJASAoFAampMCSkpoCUFBoCUlNBSEoFBakpOCSkpoCUVAoCUlNASEgNASkpPASkpoCQFAoCUlNASEhNASEpNASkpoCQlAoCUlNYCEhNASEpFASkpoAQlIoCQlJYCEhNASEpFASkpqAQkJoCQlJICEhNASEoFQSkpLAQkBoCQlIoCEhNQSEoBQWEpJAQkJoCQlEICAhNYSEoJQSEppAQkJoCQlAKCAhNISEgNQSEopAQEJqCQlBKCAhFISEgNQWEohAQEJrCQlBKCAhFISEgNQWEoBQQEIpCQkBKCAhFISEgNIWFoJQQEIpCQkBqCghFISEgFIWFgJQQEIpCQkAKCghBKSAgFIWFgJQQEIpCQkAICgtBKSEgFIWEgBQUEIJCQkAoCgkBKSEgFIWEgBAQEIJSQkAoCgkBKSggFIWEgBAQEgJSQEAoCgkBKSggBIWEgBAUEgJSQEEoCgsBISAgBKWAgFAUEgJSUEAICgkBISEsBKSAglAUFgJCQkEICgkFISkkBKSAglAUEgJCQkEIaAEFISgkBKSEohBUEgpCQkEISAkFoagkBISEghBQEgpCQFkISElFoagkBISEghCQEgpCQUkICAkFIaAkFISEolCQEoJCUVkICAkFIaAkFISAklCQkgpCQUkoCAkFoSAlFIWgshCQEgpCQUkoCAEFISAkFYSAslAQEgpCQUkoCAFloSAlFYSAklAQEopCQEkoCAFloSAlFISCklAQAopCQEgoCAEloSAlFISCklAQAspCQUoqCAEloSAEFISAklAQAspCQUooCAEloSgEFIWAklAQAkpCQQgoCAEloSAEFIWClFQQAkpCQQgoCAEloSAEFISCEFQQAEpCUQgoCgEloSAAlISCElQQAkpCUQAoCAUlqSAAlISiElAQAkpCUQAoCAUlqCAAlKSiAlAQCgpCQQAoSEUlqCAElISCAFAQCgpQQQAoSUUFoCAEFISCAFAQigpQQQAoSEUFoCAQFKCCAFAQigpAQQAoSAUBoCAQFaCCAFCQigpAQQAoAAUBoCAUFaCCAFCQCgpAQSAqAAUBoCAUFYCCAFCACgJAQSAqQAUBoCAVFYCCQFQACgJAQSgqQAUBoAAVFICCQFQACgJAQSgqAAWBqAAVBICCUFSACgJAASgoAAWBqAAVBICiUFSACgJRASooAAWBqAAVBKACUFQAigJRASoIAEWhqAAUBaICUFQACgJRASoKQAWgqAAUBaICVFAACkJRASoKRAWgoAAUBKICVBAACkBRASoIRAWgoAAUBKICVBCACkBRASgIREWoqAAUgKICVBCICkBBASgIREWooAAUgKICUBCIikBBASgIRQWoqBAVgIICUBCIikBRASgARQWooBAVgYICUBCIilBRASgABQWooBAVgaICUACKClBBISoABUWgIBAVgaICUACKClBBISoARUWgABAVoaJCUAAKilBBISoCRUWggBQVoIJCVAAKilABISoCRUWgiBQUoYJCUACOikARISpCBcWgiBQUoQJCUAQKikABKSpCBcWggBQUgQJCUACKikEBKShCBcWgABQVgQJCUISKikEBKShCBYSgABQUgQJCUIQKikEBOSgCBYSgABQUgwJSUIQKiEEBKSoCBYSgABQVgwJyUAQKCEEBKSgGBYSgABQQgwJSUAQKCEEBOCgGBeSgABUQgwJSUAQKCEEBKCgGBaSgCBUQgyJSUAwKCEEBKCAGBaSgCBUQgwJwUAwKSEEBKiAGBaSgCBUQggJQUIwKSEERKiAGBaSgCBUQggJQQIwKSEERKiAEBaCgGBWQgiJwQAwKSEERKCAEBaCAEBWQgiJQQIwKQFERKCBERaCAEBWQoiJQQAgKQEEhKCBFBaCIGBWQoiJQQIgKQAEhKCAFBaCAGBSAgiJQQAoKQAEhKCAFBeCAGBSAokJQQIoKwAEhKAAFBaCAEBSAAkJQQAoKwAExKABFBaCAFBSAAkJQAAoKQAExKAAFhaCAFBSAAkJQAAoKQAExKAAFhKAAFBSAAkJQAAoKQAEpKAAFhKAAFBSBAkJQAAoKQQEpKAAFhKAAFBSAAkJQAAoIQQEoKAAFhKAAFBSAAlJQAAoIQQEoKAIFhKAAFBCCIlBQAAoIQREoKABFpKAAFBCColBQBAoIQQEoKABFoKAAFBCCIlBQBIpIQQEoIARFoKAAFBCCAlBQAIpAQQEoIARFoaAIFJGCAlBQAIpAQQEoIARFoKAIFIGCAlBACIpCQREoIAQFoKAAFIGCAlBECIpCQREoIgUFoKgAFIWCAlBACApAQREoAgUFoIgQHIWCIlBECgpAUREoCgUFoIgQFIGCIlBECgpAEQEoCgUFoIgQFIGCIlAUCgpAEQEoAgVFoIgUFIAiIlAUCgpAEQEoAgVFoCgUFIAiA1AUCopAUSkoAkVEoCgUFIAiAlAEiopAUSkoAkVEoCgUFIEiAlAEiohAUSgoAkUEoAgUFIGiElAEioxAUSgoAkUEoAgUEYGiEFAEighAUSgoAkUloAgUEYGiUFAEighAESgiAkUloAgUEYGiUFAEighAESgiAkUhoAgUEYAiUEQEigpAESgiAkWhoAgUEYAiUEQEikJAESgiAkWhiAgUEYAiUEQEikJAESgiAkWgiAgUBYAiUEQEikIRESgiAkWgiAgUhaAiUEQEikARESgqQEWgiAgchaAiUEQEikARESgKQEWgiAgUgSIiUESEikARESgKQUWgiAgUgSIiUBSAikARESgKRUWgiAgVgSIiUBSAikARETgCRUSgKAgVgSIiUBSCikARESoCRUSgKAgVgSIiUASKiEBRECoCRUSgKAAVgSIiVASKiEBRECoCRUSgKBQVgSIgVASKiEBRECoCRUCgCBQRgaIgVASKiEBRACoCRUCoCBQRgaIgVASKgEARKCICRUCoCBQBgaIgVASKgFARKCICRUGoCBQBgSJwRASKgFARKAICRUGoCBQBgSJQRASKgFARKAICRUCICBQBoSJQBASKgFARKAICReCICBQBoSJQBASKgBARKAJCRaCICBQBoSJQBASKgBERKAJCRaAICBQBoSJQBASKwBERKAJCRaAICBQBISJQBISKQBEQKAJCRaAICBQBIyJQBISKQBEQKAJCRKAICBSBIiJQBISKQBEQKAJGRKAICBWBIiBQBISIQBEQKAJGRKAICBWBIiBQBIyIQBEQKAJEQKAICBWBIiBQBIyIQBEQKgJFQKAICBGBIiBQBIyAQBEQKgJFQKAIGBGBIiBQBIiAQBEQIgJFQKAIGAGBIiBUBIqAQBEQIgJFQKAIEAGBIiBEBIqAQBEwAgJFQKAIEAGBIiBEBIqAQBEgAgJFQIgIFAGBImAEBIqAQBEgAgIFQIgIFAGBImAEBIqAABEgAgIFQAgIFAGBAkAEBAqAEBEoAgIFwAgIFAABIkAEBAqAEBEoAAIFgAgIFAABIkAEBAqAERAoAAIEgAgIFAAhIlAABAgAERAoAAIEgAgIFAAhIFAABAgAARAgAEJEgAAIEAAiIFAABAgAARAgAEIAoAAIAAACIEAABAgAARAgAAYAgAAIAAACIUAABAAAARAgAARAgAAIAAACIEAADAAAARAAAARAgAAIAAACIEAACAAAARAAAARCgAAIAAACIEAACIAAARAAAARAgAAQAAACIEAACIAAARAAAARAgAAQAAACIAAACIAAATAAAARAgAAQAAECIAAACIQAASAAAARAAAAQAAECQAAACAQAASAAAAQAAAAQCAACQAAACAQAACAAAAQAAAAQCAAAQAAACAAAACAQAACAAAAQAAAAQAAACAAAACAQAACAAAAQAAAAQAAAAAABACAQAACAAAAQAAAAQAAAAAABACAAAACAQAAAAAEAQCAAAAABACAAAACAQAAAAAIAQAAAAACBAAAAAgCAAAAAAAIAAAAEAACBAAAABACAAAAAAAIBAAAEAAABAAAAAACAAAAAAAIBAAAEAAABAAAABAIAAAgAAAIAAAAAAAABAAAABAIAAAAAAAIAAAAIBAAAAAAABAAAAAAIAAIAAAAIBAAAAAAABAAAABAIAAIAAAAIAAAAABAABAAAABAIAAAAAAAIAAAAIBAAAAAAABAAAAAAIAAIAAAAIBAAAAAAABAAAABAIAAAAAAAIAAAAAAAABAAAABAIAAAAAAAIAAAAAAAABAAAABAAAAAAAAAIAAAAIAAABAAAABAAAAAAAAAIAAAAIAAAAAAAABAAAAAAAEAIAAAAIAAAAAAAABAAAAAAAEAAAAAAIAAAAAAAgDAAAAAAAEAAAAAAIAAAAAAAgAAAAAAAAEAAAAAAIAAAAAAAgAAAAAAAAEAAAAEAAAAAAAAAgAAAAAAAAEAAAAEAAAAABAAAgAAAAAAAAAAAAAEAAAAAAAAAgAAAAgAAAAAIAAEAAAAAAAAAgAAAAgAAAAAAAAEAAAAAAAAAAAAAAgAAAAAAAAEAAAAAAAAAAAAAAgAAAAAAAAEAAAAEAAAAAAAAAgAAAAAAAAEAAAAEAAAAAAAAAgAAAAAAAAEAAAAEAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const N = 48000;
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));
    const bits = atob(LAND_BITS);
    const land = []; // x, y, z de cada punto de tierra (esfera unitaria)
    for (let i = 0; i < N; i += 1) {
      if (!(bits.charCodeAt(i >> 3) & (1 << (i & 7)))) continue;
      const y = 1 - ((i + 0.5) * 2) / N;
      const r = Math.sqrt(1 - y * y);
      land.push(r * Math.sin(i * GOLDEN), y, r * Math.cos(i * GOLDEN));
    }

    const rad = (d) => (d * Math.PI) / 180;
    const toVec = ([lat, lng]) => [
      Math.cos(rad(lat)) * Math.sin(rad(lng)),
      Math.sin(rad(lat)),
      Math.cos(rad(lat)) * Math.cos(rad(lng)),
    ];

    // Ciudades (lat, lng). La primera es Bogotá: el nodo principal.
    const CITIES = [
      [4.71, -74.07], // 0 Bogotá
      [25.76, -80.19], // 1 Miami
      [19.43, -99.13], // 2 Ciudad de México
      [40.71, -74.0], // 3 Nueva York
      [34.05, -118.24], // 4 Los Ángeles
      [43.65, -79.38], // 5 Toronto
      [-12.05, -77.04], // 6 Lima
      [-33.45, -70.67], // 7 Santiago
      [-34.6, -58.38], // 8 Buenos Aires
      [-23.55, -46.63], // 9 São Paulo
      [8.98, -79.52], // 10 Panamá
      [40.42, -3.7], // 11 Madrid
      [51.5, -0.13], // 12 Londres
      [6.52, 3.38], // 13 Lagos
      [-33.92, 18.42], // 14 Ciudad del Cabo
      [25.2, 55.27], // 15 Dubái
      [19.07, 72.88], // 16 Bombay
      [1.35, 103.82], // 17 Singapur
      [35.68, 139.69], // 18 Tokio
      [-33.87, 151.21], // 19 Sídney
    ].map(toVec);

    const LINKS = [
      [0, 1], [0, 2], [0, 3], [0, 6], [0, 9], [0, 11], [0, 10], [0, 7],
      [1, 2], [1, 3], [3, 5], [4, 5], [2, 4], [6, 7], [7, 8], [8, 9],
      [3, 12], [12, 11], [11, 13], [13, 14], [9, 14], [12, 15], [15, 16],
      [16, 17], [17, 18], [17, 19], [18, 4],
    ];

    // Cada ruta es un arco de círculo máximo que se eleva sobre la superficie
    const ARC_STEPS = 32;
    const arcs = LINKS.map(([a, b], k) => {
      const A = CITIES[a];
      const B = CITIES[b];
      const dot = Math.min(1, Math.max(-1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
      const w = Math.acos(dot);
      const lift = 0.05 + 0.14 * (w / Math.PI);
      const pts = new Float32Array((ARC_STEPS + 1) * 3);
      for (let i = 0; i <= ARC_STEPS; i += 1) {
        const t = i / ARC_STEPS;
        const s1 = Math.sin((1 - t) * w) / Math.sin(w);
        const s2 = Math.sin(t * w) / Math.sin(w);
        const h = 1 + Math.sin(Math.PI * t) * lift;
        for (let c = 0; c < 3; c += 1) pts[i * 3 + c] = (s1 * A[c] + s2 * B[c]) * h;
      }
      // Pulso que recorre la ruta: velocidad y desfase propios
      return { pts, speed: 0.07 + ((k * 37) % 11) * 0.006, phase: ((k * 53) % 17) / 17 };
    });

    // Malla: nodos repartidos por la esfera, cada uno unido a sus 3 vecinos más
    // cercanos con tramos de círculo máximo pegados a la superficie
    const MESH_NODES = 120;
    const MESH_STEPS = 8;
    const meshNodes = Array.from({ length: MESH_NODES }, (_, i) => {
      const y = 1 - ((i + 0.5) * 2) / MESH_NODES;
      const r = Math.sqrt(1 - y * y);
      // Un pequeño desorden para que no se vea como una rejilla
      const a = i * GOLDEN + Math.sin(i * 12.9898) * 0.35;
      return [r * Math.sin(a), y, r * Math.cos(a)];
    });
    const meshEdges = [];
    const seen = new Set();
    meshNodes.forEach((A, i) => {
      meshNodes
        .map((B, j) => ({ j, d: A[0] * B[0] + A[1] * B[1] + A[2] * B[2] }))
        .filter(({ j }) => j !== i)
        .sort((a, b) => b.d - a.d)
        .slice(0, 3)
        .forEach(({ j }) => {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (seen.has(key)) return;
          seen.add(key);
          const B = meshNodes[j];
          const pts = new Float32Array((MESH_STEPS + 1) * 3);
          for (let k = 0; k <= MESH_STEPS; k += 1) {
            const t = k / MESH_STEPS;
            const x = A[0] + (B[0] - A[0]) * t;
            const y = A[1] + (B[1] - A[1]) * t;
            const z = A[2] + (B[2] - A[2]) * t;
            const len = Math.hypot(x, y, z) || 1;
            pts[k * 3] = x / len;
            pts[k * 3 + 1] = y / len;
            pts[k * 3 + 2] = z / len;
          }
          meshEdges.push(pts);
        });
    });

    // Halo de partículas en el plano de la pantalla, más denso cerca del borde.
    // Solo recorren el cuarto que asoma (el resto del círculo queda fuera de pantalla).
    const HALO_FROM = -0.45;
    const HALO_SPAN = Math.PI / 2 + 0.9;
    const particles = Array.from({ length: 320 }, (_, i) => {
      const u = (i * 0.618034) % 1;
      return {
        angle: ((i * 0.7548776) % 1) * HALO_SPAN,
        dist: 1.02 + Math.pow((i * 0.3819) % 1, 2.2) * 0.5,
        spin: (0.012 + u * 0.03) * (i % 5 === 0 ? -1 : 1),
        size: 0.5 + ((i * 0.7548) % 1) * 1.3,
        twinkle: 0.6 + u * 1.8,
        phase: i * 1.7,
        tone: i % 7 === 0 ? '0, 224, 239' : i % 3 === 0 ? '255, 255, 255' : '150, 200, 255',
      };
    });

    // Vista: inclinación fija y giro de oeste a este
    const TILT = -0.3;
    const cT = Math.cos(TILT);
    const sT = Math.sin(TILT);
    const START = rad(98); // arranca con Bogotá en el centro del cuarto visible
    const SPIN = 0.03; // rad/s: una vuelta cada ~3 min 30 s
    const SCROLL_SPIN = 1.8; // rad extra al salir del hero: bajar hace girar el planeta
    let scrollM = 0;

    let W = 0;
    let H = 0;
    let R = 0;
    let cx = 0;
    let cy = 0;
    let dpr = 1;
    let base = null; // atmósfera + esfera, prerenderizadas
    let glow = null; // sprite de brillo para nodos y pulsos

    const makeGlow = () => {
      const g = document.createElement('canvas');
      const size = 64;
      g.width = g.height = size;
      const c = g.getContext('2d');
      const grad = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(210, 245, 255, 1)');
      grad.addColorStop(0.18, 'rgba(90, 210, 255, 0.75)');
      grad.addColorStop(0.5, 'rgba(47, 120, 255, 0.18)');
      grad.addColorStop(1, 'rgba(47, 91, 255, 0)');
      c.fillStyle = grad;
      c.fillRect(0, 0, size, size);
      return g;
    };

    const makeBase = () => {
      const b = document.createElement('canvas');
      b.width = canvas.width;
      b.height = canvas.height;
      const c = b.getContext('2d');
      c.scale(dpr, dpr);

      // Atmósfera: brillo azul que sale del borde
      const atm = c.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.34);
      atm.addColorStop(0, 'rgba(47, 110, 255, 0.5)');
      atm.addColorStop(0.2, 'rgba(47, 100, 255, 0.22)');
      atm.addColorStop(0.55, 'rgba(47, 91, 255, 0.06)');
      atm.addColorStop(1, 'rgba(47, 91, 255, 0)');
      c.fillStyle = atm;
      c.fillRect(0, 0, W, H);

      // Esfera: azul noche, más clara hacia arriba a la derecha (donde está la aurora)
      const body = c.createRadialGradient(cx + R * 0.45, cy - R * 0.45, R * 0.05, cx, cy, R);
      body.addColorStop(0, '#1A2F6B');
      body.addColorStop(0.55, '#0E1A40');
      body.addColorStop(1, '#080D22');
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      c.fillStyle = body;
      c.fill();

      // Luz de borde
      const rim = c.createRadialGradient(cx, cy, R * 0.82, cx, cy, R);
      rim.addColorStop(0, 'rgba(60, 140, 255, 0)');
      rim.addColorStop(1, 'rgba(80, 170, 255, 0.28)');
      c.fillStyle = rim;
      c.fill();
      c.lineWidth = 1;
      c.strokeStyle = 'rgba(140, 200, 255, 0.35)';
      c.stroke();
      return b;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      W = rect.width;
      H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      R = H / 1.42;
      cx = R * 0.16;
      cy = H + R * 0.1;
      base = makeBase();
      glow = glow || makeGlow();
      return true;
    };

    // Proyección: giro alrededor del eje polar y luego inclinación
    const out = { x: 0, y: 0, z: 0 };
    const project = (x, y, z, cR, sR) => {
      const x1 = x * cR + z * sR;
      const z1 = z * cR - x * sR;
      out.x = x1;
      out.y = y * cT - z1 * sT;
      out.z = y * sT + z1 * cT;
      return out;
    };
    // Visible si mira al frente o si, elevado, se asoma por fuera del disco
    const visible = (p) => p.z > 0 || p.x * p.x + p.y * p.y > 1;

    const LAND_ALPHA = [0.18, 0.38, 0.62, 0.9];
    const landPaths = LAND_ALPHA.map(() => null);

    const draw = (time) => {
      const t = time / 1000;
      scrollM += (heroScroll.m - scrollM) * 0.1;
      const rot = START + (reduceMotion() ? 0 : t * SPIN + scrollM * SCROLL_SPIN);
      const cR = Math.cos(rot);
      const sR = Math.sin(rot);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Órbitas: dos circunferencias finas alrededor del planeta
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(120, 180, 255, 0.16)';
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120, 180, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.32, 0, Math.PI * 2);
      ctx.stroke();

      // Halo de partículas
      for (const p of particles) {
        const a = HALO_FROM + ((((p.angle + t * p.spin) % HALO_SPAN) + HALO_SPAN) % HALO_SPAN);
        const x = cx + Math.cos(a) * p.dist * R;
        const y = cy - Math.sin(a) * p.dist * R;
        if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
        const fade = 1 - (p.dist - 1.03) / 0.55;
        const alpha = fade * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * p.twinkle + p.phase)));
        ctx.fillStyle = `rgba(${p.tone}, ${alpha.toFixed(3)})`;
        ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
      }

      // Continentes: puntos agrupados por brillo (más brillantes al frente)
      const dot = Math.max(1.1, R * 0.0056);
      for (let k = 0; k < landPaths.length; k += 1) landPaths[k] = new Path2D();
      for (let i = 0; i < land.length; i += 3) {
        const p = project(land[i], land[i + 1], land[i + 2], cR, sR);
        if (p.z <= 0.02) continue;
        const x = cx + p.x * R;
        const y = cy - p.y * R;
        if (x < 0 || y < 0 || x > W || y > H) continue;
        const bucket = Math.min(3, Math.floor(p.z * 4.2));
        landPaths[bucket].rect(x - dot / 2, y - dot / 2, dot, dot);
      }
      for (let k = 0; k < landPaths.length; k += 1) {
        ctx.fillStyle = `rgba(70, 215, 255, ${LAND_ALPHA[k]})`;
        ctx.fill(landPaths[k]);
      }

      // Malla de red: muy tenue, más visible al frente
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(170, 215, 255, 0.13)';
      ctx.beginPath();
      for (const pts of meshEdges) {
        let pen = false;
        for (let k = 0; k <= MESH_STEPS; k += 1) {
          const p = project(pts[k * 3], pts[k * 3 + 1], pts[k * 3 + 2], cR, sR);
          if (p.z <= 0) {
            pen = false;
            continue;
          }
          const x = cx + p.x * R;
          const y = cy - p.y * R;
          if (pen) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
          pen = true;
        }
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(200, 235, 255, 0.55)';
      for (const v of meshNodes) {
        const p = project(v[0], v[1], v[2], cR, sR);
        if (p.z <= 0.1) continue;
        ctx.fillRect(cx + p.x * R - 1, cy - p.y * R - 1, 2, 2);
      }

      // Rutas de red
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(190, 230, 255, 0.3)';
      ctx.beginPath();
      for (const arc of arcs) {
        let pen = false;
        for (let i = 0; i <= ARC_STEPS; i += 1) {
          const p = project(arc.pts[i * 3], arc.pts[i * 3 + 1], arc.pts[i * 3 + 2], cR, sR);
          if (!visible(p)) {
            pen = false;
            continue;
          }
          const x = cx + p.x * R;
          const y = cy - p.y * R;
          if (pen) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
          pen = true;
        }
      }
      ctx.stroke();

      // Pulsos que recorren las rutas (con estela corta)
      if (!reduceMotion()) {
        for (const arc of arcs) {
          const head = (t * arc.speed + arc.phase) % 1;
          for (let s = 0; s < 6; s += 1) {
            const f = head - s * 0.018;
            if (f < 0) break;
            const idx = f * ARC_STEPS;
            const i0 = Math.floor(idx);
            const i1 = Math.min(ARC_STEPS, i0 + 1);
            const m = idx - i0;
            const px = arc.pts[i0 * 3] * (1 - m) + arc.pts[i1 * 3] * m;
            const py = arc.pts[i0 * 3 + 1] * (1 - m) + arc.pts[i1 * 3 + 1] * m;
            const pz = arc.pts[i0 * 3 + 2] * (1 - m) + arc.pts[i1 * 3 + 2] * m;
            const p = project(px, py, pz, cR, sR);
            if (!visible(p)) break;
            const size = (s === 0 ? 11 : 7) * (1 - s / 7);
            ctx.globalAlpha = s === 0 ? 0.95 : 0.5 * (1 - s / 6);
            ctx.drawImage(glow, cx + p.x * R - size / 2, cy - p.y * R - size / 2, size, size);
          }
        }
        ctx.globalAlpha = 1;
      }

      // Nodos: brillo suave y un punto blanco; Bogotá con un anillo que late
      CITIES.forEach((v, i) => {
        const p = project(v[0], v[1], v[2], cR, sR);
        if (p.z <= 0) return;
        const x = cx + p.x * R;
        const y = cy - p.y * R;
        const main = i === 0;
        const size = main ? 26 : 14;
        ctx.globalAlpha = 0.5 + 0.5 * p.z;
        ctx.drawImage(glow, x - size / 2, y - size / 2, size, size);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 1, y - 1, 2, 2);
        if (main) {
          const k = reduceMotion() ? 0.35 : (t / 2.4) % 1;
          ctx.globalAlpha = (1 - k) * 0.8 * p.z;
          ctx.strokeStyle = '#00E0EF';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(x, y, 4 + k * 16, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });
    };

    let running = false;
    let frame = 0;
    let last = 0;
    const loop = (now) => {
      last = now;
      draw(now);
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

    if (!resize()) return;
    draw(0);
    requestAnimationFrame(() => canvas.classList.add('is-ready'));

    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        if (resize()) draw(last);
      }).observe(canvas);
    } else {
      window.addEventListener('resize', () => {
        if (resize()) draw(last);
      });
    }

    prefersReducedMotion.addEventListener('change', () => {
      if (reduceMotion()) {
        stop();
        draw(0);
      } else start();
    });

    if (hasIO) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      }).observe(canvas);
    } else {
      start();
    }
  }

  /* ---------- Hero: progreso de salida ----------
     Escribe --m en .hero (0 = arriba del todo, 1 = hero fuera de pantalla):
     el CSS lo usa para el parallax del logo, las estrellas y el planeta, y
     para apagar la aurora, los fragmentos de código y el indicador de scroll.
     También queda en heroScroll: la aurora se estrecha y el planeta gira. Con movimiento reducido
     no se escribe y todo queda fijo. */
  function initHeroScroll() {
    const hero = document.getElementById('inicio');
    if (!hero) return;
    let ticking = false;
    let last = -1;

    const update = () => {
      ticking = false;
      if (reduceMotion()) {
        heroScroll.m = 0;
        if (last !== 0) hero.style.setProperty('--m', (last = 0));
        return;
      }
      const rect = hero.getBoundingClientRect();
      const m = Math.round(Math.min(1, Math.max(0, -rect.top / rect.height)) * 1000) / 1000;
      heroScroll.m = m;
      if (m !== last) hero.style.setProperty('--m', (last = m));
    };
    const request = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    prefersReducedMotion.addEventListener('change', update);
  }

  /* ---------- Navegación: la firma de la barra cede el sitio al logo del hero ----------
     Mientras el logo grande del hero se ve, la firma pequeña de la barra se
     cambia por el isotipo V en contorno (no se repite la marca completa dos
     veces en la misma pantalla). */
  function initNavBrand() {
    const nav = document.getElementById('nav');
    const logo = document.querySelector('.hero__logo');
    if (!nav || !logo || !hasIO) return;
    const navH = nav.querySelector('.nav__inner')?.offsetHeight || 72;
    new IntersectionObserver(
      ([entry]) => nav.classList.toggle('is-hero-brand', entry.isIntersecting),
      { rootMargin: `-${navH}px 0px 0px 0px` }
    ).observe(logo);
  }

  /* ---------- Hero: fragmentos de pseudocódigo en los vacíos ----------
     Dos huecos simétricos, a cada lado entre la navegación y el logo (abajo
     están el planeta y el avatar). Salen de a dos, uno a cada lado; la
     siguiente pareja espera a que terminen ambos. Cada fragmento se escribe, se queda y se va. */
  function initHeroCode() {
    const layer = document.querySelector('.hero__code');
    const hero = document.getElementById('inicio');
    if (!layer || !hero) return;
    const inner = hero.querySelector('.hero__inner');
    const logo = hero.querySelector('.hero__logo');
    if (!inner || !logo) return;

    // Pseudocódigo en español que un cliente entienda (líneas cortas)
    const SNIPPETS = [
      "if (pyme.necesita('web')) {\n  volt.construir();\n}",
      "await tareas.automatizar();\n// más tiempo para vender",
      "const app = volt.crear({\n  medida: 'tu negocio',\n});",
      "cliente.ventas++;\nsoporte.cercano = true;",
      "// de la idea a la web\nproyecto.lanzar();",
      "function crecer(pyme) {\n  return pyme.digital();\n}",
    ];

    const TYPE_MS = 26;
    const HOLD_MS = 3600;
    const FADE_MS = 700;
    const GAP_MS = 900;
    const LINE_H = 11.5 * 1.6;

    // Resaltado mínimo: comentarios, cadenas, palabras clave y llamadas
    const TOKEN = /(\/\/.*$)|('[^']*')|\b(if|const|await|return|function|true)\b|([A-Za-z_]\w*)(?=\()/gm;
    const tokenize = (code) => {
      const out = [];
      let last = 0;
      code.replace(TOKEN, (match, comment, str, kw, fn, offset) => {
        if (offset > last) out.push({ cls: '', text: code.slice(last, offset) });
        const cls = comment ? 'tk-c' : str ? 'tk-s' : kw ? 'tk-k' : 'tk-f';
        out.push({ cls, text: match });
        last = offset + match.length;
        return match;
      });
      if (last < code.length) out.push({ cls: '', text: code.slice(last) });
      return out;
    };

    const active = () =>
      document.visibilityState === 'visible' &&
      getComputedStyle(layer).display !== 'none' &&
      parseFloat(getComputedStyle(hero).getPropertyValue('--m') || 0) < 0.15 &&
      hero.getBoundingClientRect().bottom > 0;

    // Posición de un hueco (entre la navegación y el logo), relativa a la capa
    // que cubre el escenario del hero
    const place = (el, slot, lines) => {
      const base = layer.getBoundingClientRect();
      const box = inner.getBoundingClientRect();
      const l = logo.getBoundingClientRect();
      const h = lines * LINE_H;
      const left = slot === 'l';
      el.style.top = `${(box.top + l.top) / 2 - h / 2 - base.top}px`;
      el.style.left = left ? `${box.left - base.left}px` : 'auto';
      el.style.right = left ? 'auto' : `${base.right - box.right}px`;
      // Espacio disponible: medio contenedor (ninguno si no cabe en alto sin rozar el logo)
      return l.top - box.top >= h + 32 ? box.width / 2 - 24 : 0;
    };

    const show = (slot, code, done) => {
      const el = document.createElement('pre');
      el.className = 'hero__snippet';
      layer.appendChild(el);
      const room = place(el, slot, code.split('\n').length);

      const tokens = tokenize(code).map(({ cls, text }) => {
        const span = document.createElement('span');
        if (cls) span.className = cls;
        span.textContent = text;
        el.appendChild(span);
        return { span, text };
      });
      // Se mide completo antes de escribirlo: si no cabe, se salta este turno
      if (el.scrollWidth > room) {
        el.remove();
        return setTimeout(done, GAP_MS);
      }
      tokens.forEach(({ span }) => { span.textContent = ''; });
      const caret = document.createElement('span');
      caret.className = 'hero__snippet-caret';
      el.appendChild(caret);
      // La medición de arriba ya calculó el estado inicial: la transición arranca sin esperar un frame
      el.classList.add('is-on');

      const finish = () => {
        setTimeout(() => {
          el.classList.remove('is-on');
          setTimeout(() => {
            el.remove();
            setTimeout(done, GAP_MS);
          }, FADE_MS);
        }, HOLD_MS);
      };

      if (reduceMotion()) {
        tokens.forEach(({ span, text }) => { span.textContent = text; });
        caret.remove();
        return finish();
      }

      let ti = 0;
      let ci = 0;
      const type = () => {
        const tok = tokens[ti];
        ci += 1;
        tok.span.textContent = tok.text.slice(0, ci);
        if (ci >= tok.text.length) {
          ti += 1;
          ci = 0;
        }
        if (ti < tokens.length) setTimeout(type, TYPE_MS);
        else {
          caret.remove();
          finish();
        }
      };
      setTimeout(type, 200);
    };

    // Parejas simétricas, alternando cuál lado empieza
    const PAIRS = [['l', 'r'], ['r', 'l']];
    let turn = 0;
    let index = 0;
    const next = () => {
      if (!active()) return setTimeout(next, 1500);
      const [a, b] = PAIRS[turn % PAIRS.length];
      turn += 1;
      let pending = 2;
      const done = () => {
        pending -= 1;
        if (!pending) next();
      };
      show(a, SNIPPETS[index % SNIPPETS.length], done);
      // El segundo arranca un poco después: se sienten independientes
      const second = SNIPPETS[(index + 1) % SNIPPETS.length];
      setTimeout(() => show(b, second, done), 700);
      index += 2;
    };
    setTimeout(next, 1800);
  }

  /* ---------- Avatar flotante: mira hacia el cursor ----------
     Los ojos se desplazan dentro del visor y la cabeza se inclina un poco hacia
     el cursor, con suavizado. El bucle de animación solo corre mientras se
     mueve; además parpadea cada pocos segundos. */
  function initBuddy() {
    const buddy = document.querySelector('.buddy');
    if (!buddy) return;
    const head = buddy.querySelector('.buddy__head');
    const eyes = buddy.querySelector('.buddy__eyes');
    if (!head || !eyes) return;

    // Recorridos máximos (unidades del viewBox de 64)
    const EYE_X = 3.2;
    const EYE_Y = 2.6;
    const HEAD_X = 1.6;
    const HEAD_Y = 1.2;
    const TILT = 6; // grados
    // A partir de esta distancia (px) la mirada llega a su tope
    const REACH = 260;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;

    const apply = () => {
      const { x, y } = current;
      eyes.setAttribute('transform', `translate(${(x * EYE_X).toFixed(2)} ${(y * EYE_Y).toFixed(2)})`);
      head.setAttribute(
        'transform',
        `translate(${(x * HEAD_X).toFixed(2)} ${(y * HEAD_Y).toFixed(2)}) rotate(${(x * TILT).toFixed(2)} 32 32)`
      );
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.18;
      current.y += (target.y - current.y) * 0.18;
      const settled = Math.abs(target.x - current.x) < 0.002 && Math.abs(target.y - current.y) < 0.002;
      if (settled) {
        current.x = target.x;
        current.y = target.y;
      }
      apply();
      frame = settled ? 0 : requestAnimationFrame(tick);
    };

    const kick = () => {
      if (reduceMotion()) {
        current.x = target.x;
        current.y = target.y;
        apply();
      } else if (!frame) {
        frame = requestAnimationFrame(tick);
      }
    };

    const lookAt = (clientX, clientY) => {
      const rect = buddy.getBoundingClientRect();
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / REACH);
      target.x = (dx / dist) * reach;
      target.y = (dy / dist) * reach;
      kick();
    };

    window.addEventListener('pointermove', (e) => lookAt(e.clientX, e.clientY), { passive: true });
    // Si el cursor sale de la ventana, vuelve a mirar al frente
    document.addEventListener('mouseout', (e) => {
      if (e.relatedTarget) return;
      target.x = 0;
      target.y = 0;
      kick();
    });

    const blink = () => {
      if (!reduceMotion() && document.visibilityState === 'visible') {
        buddy.classList.add('is-blinking');
        setTimeout(() => buddy.classList.remove('is-blinking'), 130);
      }
      setTimeout(blink, 2600 + Math.random() * 3800);
    };
    setTimeout(blink, 2200);

    initBuddyTalk(buddy);
  }

  /* ---------- Avatar: comentarios con llamados a la acción ----------
     Cada cierto tiempo el avatar dice un mensaje según la sección visible,
     escrito letra por letra como en un videojuego. Clic en el globo: lleva al
     destino del mensaje. Clic en el avatar: siguiente mensaje. La x lo calla
     un buen rato. No habla con la pestaña oculta ni con el menú móvil abierto. */
  function initBuddyTalk(buddy) {
    const bubble = buddy.querySelector('.buddy__bubble');
    const typedEl = buddy.querySelector('.buddy__typed');
    const ghostEl = buddy.querySelector('.buddy__ghost');
    const closeBtn = buddy.querySelector('.buddy__close');
    if (!bubble || !typedEl || !ghostEl) return;

    const whatsapp = document.querySelector('[data-whatsapp]')?.href || '#contacto';

    // Mensajes por sección (id). Edita o agrega libremente: text + href.
    const MESSAGES = {
      inicio: [
        { text: '¿Tienes una idea para tu negocio? ¡Hagámosla realidad!', href: '#contacto' },
        { text: 'Hola. ¿Cotizamos tu web, app o software?', href: '#contacto' },
      ],
      servicios: [
        { text: 'Webs, apps y software a tu medida. ¿Cuál necesitas?', href: '#contacto' },
        { text: '¿Tareas repetitivas? Las automatizamos por ti.', href: '#contacto' },
      ],
      proceso: [{ text: 'Te acompañamos en cada paso, sin tecnicismos.', href: '#contacto' }],
      proyectos: [{ text: '¿Te imaginas tu negocio aquí? Hablemos.', href: '#contacto' }],
      nosotros: [{ text: 'Estamos en Bogotá, Tocaima y Girardot. ¡Cerca de ti!', href: whatsapp }],
      preguntas: [{ text: '¿Te quedó otra duda? Escríbenos por WhatsApp.', href: whatsapp }],
      contacto: [{ text: '¡Casi listo! Cuéntanos tu idea en el formulario.', href: '#contacto' }],
    };
    const FALLBACK = MESSAGES.inicio;

    const FIRST_DELAY = 5000;
    const GAP_MIN = 22000;
    const GAP_RANGE = 8000;
    const SNOOZE = 120000; // tras cerrar con la x
    const TYPE_MS = 34;

    const nav = document.getElementById('nav');
    const sections = [...document.querySelectorAll('main section[id]')];
    const turn = {};
    let current = null;
    let typing = 0;
    let hideTimer = 0;
    let nextTimer = 0;
    let hovering = false;

    // Sección que ocupa el centro de la pantalla
    const activeSection = () => {
      const mid = window.innerHeight / 2;
      const hit = sections.find((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= mid && r.bottom >= mid;
      });
      return hit?.id;
    };

    const pickMessage = () => {
      const id = activeSection();
      const pool = MESSAGES[id] || FALLBACK;
      const key = MESSAGES[id] ? id : 'inicio';
      const i = turn[key] || 0;
      turn[key] = (i + 1) % pool.length;
      return pool[i];
    };

    const schedule = (delay) => {
      clearTimeout(nextTimer);
      nextTimer = setTimeout(speak, delay);
    };

    const hide = () => {
      clearTimeout(typing);
      clearTimeout(hideTimer);
      bubble.classList.remove('is-visible');
      buddy.classList.remove('is-talking');
      current = null;
    };

    const armHide = (text) => {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (hovering) return armHide(text);
        hide();
        schedule(GAP_MIN + Math.random() * GAP_RANGE);
      }, 3800 + text.length * 45);
    };

    function speak() {
      clearTimeout(nextTimer); // por si se llama antes de tiempo (clic en el avatar)
      const busy = document.visibilityState !== 'visible' || nav?.classList.contains('is-open');
      if (busy) return schedule(8000);

      hide();
      current = pickMessage();
      const { text } = current;
      typedEl.textContent = '';
      ghostEl.textContent = text;
      bubble.classList.add('is-visible');
      buddy.classList.add('is-talking');

      if (reduceMotion()) {
        typedEl.textContent = text;
        ghostEl.textContent = '';
        buddy.classList.remove('is-talking');
        armHide(text);
        return;
      }

      // Escritura letra por letra
      let n = 0;
      const type = () => {
        n += 1;
        typedEl.textContent = text.slice(0, n);
        ghostEl.textContent = text.slice(n);
        if (n < text.length) typing = setTimeout(type, TYPE_MS);
        else {
          buddy.classList.remove('is-talking');
          armHide(text);
        }
      };
      typing = setTimeout(type, 120);
    }

    const go = (href) => {
      if (href.startsWith('#')) {
        document.querySelector(href)?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth' });
      } else {
        window.open(href, '_blank', 'noopener');
      }
    };

    bubble.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === closeBtn) {
        hide();
        schedule(SNOOZE);
        return;
      }
      if (current) go(current.href);
      hide();
      schedule(GAP_MIN + Math.random() * GAP_RANGE);
    });
    bubble.addEventListener('pointerenter', () => { hovering = true; });
    bubble.addEventListener('pointerleave', () => { hovering = false; });

    // Clic en el avatar: siguiente mensaje ya
    buddy.addEventListener('click', () => speak());

    schedule(FIRST_DELAY);
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

  /* ---------- Proceso: título que se disuelve + línea de tiempo con scroll ----------
     Adaptación sin dependencias de "Timeline" (Hyperiux Vault, GSAP +
     ScrollTrigger + SplitText). En escritorio .timeline__pin se fija (sticky)
     y su alto marca el recorrido, que tiene tres fases en la misma escena:
       1. El título se disuelve letra a letra (--out).
       2. La línea de tiempo aparece en ese espacio (--tin) y su línea empieza
          a dibujarse desde el inicio del riel hasta el 80% del ancho.
       3. La pista se desliza a la izquierda; al final la línea completa el riel.
     Cada hito se revela (--r: tallo, icono y texto) cuando la cabeza de la
     línea lo alcanza. El scroll se sigue con un suavizado corto.
     Móvil y movimiento reducido: título arriba y línea vertical; la línea y
     los hitos se revelan al entrar en pantalla (con movimiento reducido, todo
     visible y el título entero). */
  function initTimeline() {
    const section = document.querySelector('[data-timeline]');
    if (!section) return;
    const pin = section.querySelector('.timeline__pin');
    const intro = section.querySelector('.timeline__intro');
    const title = section.querySelector('.timeline__title');
    const track = section.querySelector('.timeline__track');
    const rail = section.querySelector('.timeline__rail');
    const items = [...section.querySelectorAll('.milestone')];
    if (!pin || !track || !rail || !items.length) return;

    items.forEach((el, i) => el.style.setProperty('--i', i));

    // Título en letras: palabras que no se parten y letras con un orden de
    // salida desordenado (--k); el texto completo queda para lectores de pantalla
    if (title) {
      const text = title.textContent.trim();
      const letters = text.replace(/\s+/g, '').length;
      const order = Array.from({ length: letters }, (_, i) => (i * 7 + 3) % letters);
      let k = 0;
      const sr = document.createElement('span');
      sr.className = 'timeline__sr';
      sr.textContent = text;
      const visual = document.createElement('span');
      visual.setAttribute('aria-hidden', 'true');
      text.split(/\s+/).forEach((word, w) => {
        if (w) visual.append(' ');
        const wordEl = document.createElement('span');
        wordEl.className = 'timeline__word';
        [...word].forEach((ch) => {
          const c = document.createElement('span');
          c.className = 'timeline__char';
          c.textContent = ch;
          c.style.setProperty('--k', order[k]);
          k += 1;
          wordEl.append(c);
        });
        visual.append(wordEl);
      });
      title.style.setProperty('--n', letters);
      title.replaceChildren(sr, visual);
    }

    const wide = window.matchMedia('(min-width: 961px) and (min-height: 560px)');
    const clamp01 = (v) => Math.min(1, Math.max(0, v));

    let horizontal = false;
    let travel = 0; // px que se desliza la pista
    let dOut = 0; // px de scroll para disolver el título
    let dIn = 0; // px de scroll para que aparezca la línea de tiempo
    let offsets = []; // posición de cada hito dentro de la pista (px)
    let railLeft = 0;
    let railWidth = 0;
    let scrolled = 0; // px recorridos dentro de la escena fija (suavizado)
    let running = false;
    let frame = 0;
    const last = { out: -1, tin: -1, line: -1, r: items.map(() => -1) };

    const setVar = (key, name, v) => {
      const value = Math.round(v * 1000) / 1000;
      if (value !== last[key]) section.style.setProperty(name, (last[key] = value));
    };
    const setReveal = (i, v) => {
      const r = Math.round(v * 1000) / 1000;
      if (r !== last.r[i]) items[i].style.setProperty('--r', (last.r[i] = r));
    };

    // Recorrido dentro de la escena fija que corresponde al scroll actual
    const currentScrolled = () => {
      const rect = pin.getBoundingClientRect();
      return Math.min(Math.max(-rect.top, 0), Math.max(0, rect.height - window.innerHeight));
    };

    const layout = () => {
      horizontal = wide.matches && !reduceMotion();
      section.classList.toggle('is-horizontal', horizontal);
      track.style.transform = '';
      pin.style.height = '';
      if (horizontal) {
        const vw = document.documentElement.clientWidth;
        const vh = window.innerHeight;
        travel = Math.max(0, track.scrollWidth - vw);
        dOut = vh * 0.7;
        dIn = vh * 0.5;
        // Pantalla + disolver + aparecer + deslizar + una pausa al final para leer el último hito
        pin.style.height = `${Math.round(vh + dOut + dIn + travel + vh * 0.35)}px`;
        railLeft = rail.offsetLeft;
        railWidth = rail.offsetWidth;
        offsets = items.map((el) => railLeft + el.offsetLeft);
      }
      scrolled = horizontal ? currentScrolled() : 0;
      apply();
    };

    const apply = () => {
      if (reduceMotion() || !horizontal) {
        setVar('out', '--out', 0);
        setVar('tin', '--tin', 1);
        intro?.classList.remove('is-gone');
      }
      if (reduceMotion()) {
        setVar('line', '--line', 1);
        items.forEach((_, i) => setReveal(i, 1));
        return;
      }
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;

      if (horizontal) {
        // Fases: disolver el título, luego (con un leve solape) aparece la línea de tiempo
        const out = clamp01(scrolled / dOut);
        const tin = clamp01((scrolled - dOut * 0.75) / dIn);
        const p = travel ? clamp01((scrolled - dOut - dIn) / travel) : 1;
        const x = -travel * p;
        setVar('out', '--out', out);
        setVar('tin', '--tin', tin);
        intro?.classList.toggle('is-gone', out >= 1);
        track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;

        // Cabeza de la línea: del inicio del riel al 80% mientras aparece; luego
        // avanza hasta el 88% (fin del riel) al terminar el recorrido
        const railScreen = railLeft + x;
        const head = p > 0
          ? vw * (0.8 + 0.08 * p)
          : railScreen + (vw * 0.8 - railScreen) * tin;
        setVar('line', '--line', clamp01((head - railScreen) / railWidth));
        // Cada hito se revela a medida que la cabeza lo pasa
        offsets.forEach((left, i) => setReveal(i, clamp01((head - (left + x)) / (vw * 0.14))));
        return;
      }

      // Vertical: la línea se dibuja hasta el 75% del alto; cada hito entre el 92% y el 65%
      const r = rail.getBoundingClientRect();
      setVar('line', '--line', clamp01((vh * 0.75 - r.top) / r.height));
      items.forEach((el, i) => {
        const top = el.getBoundingClientRect().top;
        setReveal(i, clamp01((vh * 0.92 - top) / (vh * 0.27)));
      });
    };

    const loop = () => {
      if (horizontal) {
        const target = currentScrolled();
        scrolled += (target - scrolled) * 0.14;
        if (Math.abs(target - scrolled) < 0.3) scrolled = target;
      }
      apply();
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

    layout();
    document.fonts?.ready.then(layout);

    let resizeFrame = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(layout);
    });
    wide.addEventListener('change', layout);
    prefersReducedMotion.addEventListener('change', () => {
      layout();
      if (reduceMotion()) stop();
    });

    // Solo anima mientras la escena está cerca de la pantalla
    if (hasIO) {
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) start();
          else {
            // Al salir queda en su posición final (arriba o abajo de la sección)
            stop();
            if (horizontal) scrolled = currentScrolled();
            apply();
          }
        },
        { rootMargin: '20% 0px 20% 0px' }
      ).observe(pin);
    } else {
      start();
    }
  }

  /* ---------- Aparición al entrar en pantalla ---------- */
  function initReveal() {
    const items = document.querySelectorAll('.reveal');
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
  initHeroGlobe();
  initHeroScroll();
  initNavBrand();
  initHeroCode();
  initBuddy();
  initCounters();
  initTimeline();
  initReveal();
  initTabs();
  initFaq();
  initContactForm();
  initYear();
})();
