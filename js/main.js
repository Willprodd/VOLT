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
  // Lo escribe initHeroScroll; el planeta lo lee para apagar sus líneas guía.
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

  /* ---------- Hero: planeta conectado (centro, delante de las letras VOLT) ----------
     Canvas 2D sin dependencias. El planeta sale desde abajo, centrado, y su
     borde superior tapa la parte baja de las letras VOLT (lo mide del logo).
     Se mece despacio alrededor de Bogotá, que siempre queda a la vista, y
     el mouse lo gira un poco. Capas: brillo de atmósfera y esfera (fijas, se
     dibujan una vez), una órbita, continentes en puntos, rutas de red con
     pulsos, nodos (Bogotá con un anillo que late) y las líneas guía que unen
     las dos anotaciones laterales con Bogotá. Todo queda dentro del contorno
     de la esfera: las rutas van pegadas a la superficie y solo se dibuja la
     cara visible. */
  function initHeroGlobe() {
    const canvas = document.querySelector('.hero__globe');
    const hero = document.getElementById('inicio');
    if (!canvas || !hero) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const logo = hero.querySelector('.hero__logo');
    const inner = hero.querySelector('.hero__inner');
    // Puntos de las anotaciones de donde salen las líneas guía hacia Bogotá
    const pins = [...hero.querySelectorAll('.hero__pin')];
    const compact = window.matchMedia('(max-width: 960px)');

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
      const lift = 0.015 + 0.05 * (w / Math.PI);
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

    // Vista: inclinación fija; Bogotá de frente y un vaivén lento a los lados
    const TILT = -0.3;
    const cT = Math.cos(TILT);
    const sT = Math.sin(TILT);
    const START = rad(74); // Bogotá (74° O) mirando al frente
    const SWAY = 0.45; // amplitud del vaivén (rad)
    const SWAY_SPEED = 0.06; // rad/s del vaivén
    const MOUSE_TURN = 0.22; // giro extra con el mouse (rad, a cada lado)
    const mouse = { x: 0, tx: 0 };

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

      // Atmósfera: una franja fina de brillo justo fuera del borde
      const atm = c.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.2);
      atm.addColorStop(0, 'rgba(47, 120, 255, 0.34)');
      atm.addColorStop(0.25, 'rgba(47, 100, 255, 0.12)');
      atm.addColorStop(1, 'rgba(47, 91, 255, 0)');
      c.fillStyle = atm;
      c.fillRect(0, 0, W, H);

      // Esfera: azul noche, con la luz arriba a la izquierda (la parte que se ve)
      const body = c.createRadialGradient(cx - R * 0.25, cy - R * 0.7, R * 0.05, cx, cy, R);
      body.addColorStop(0, '#1B3170');
      body.addColorStop(0.5, '#0F1B44');
      body.addColorStop(1, '#070B1D');
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      c.fillStyle = body;
      c.fill();

      // Luz de borde y un contorno nítido de 1 px
      const rim = c.createRadialGradient(cx, cy, R * 0.86, cx, cy, R);
      rim.addColorStop(0, 'rgba(60, 140, 255, 0)');
      rim.addColorStop(1, 'rgba(80, 170, 255, 0.22)');
      c.fillStyle = rim;
      c.fill();
      c.lineWidth = 1;
      c.strokeStyle = 'rgba(150, 215, 255, 0.55)';
      c.stroke();
      return b;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      W = rect.width;
      H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      cx = W / 2;
      let top;
      if (compact.matches || !logo) {
        // Móvil: el planeta asoma debajo del texto y los botones
        R = Math.min(W * 0.42, H * 0.28);
        top = inner ? inner.getBoundingClientRect().bottom - rect.top + 64 : H * 0.6;
      } else {
        // Escritorio: su borde superior cubre el tercio de abajo de las
        // letras; la parte alta de O y L sigue leyéndose
        R = Math.min(W * 0.2, H * 0.36);
        const l = logo.getBoundingClientRect();
        top = l.top - rect.top + l.height * 0.74;
      }
      cy = top + R;
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
    // Solo la cara que mira al frente (nada se asoma por fuera del contorno)
    const visible = (p) => p.z > 0.02;

    const LAND_ALPHA = [0.18, 0.38, 0.62, 0.9];
    const landPaths = LAND_ALPHA.map(() => null);

    const draw = (time) => {
      const t = time / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      const rot = START + (reduceMotion() ? 0 : Math.sin(t * SWAY_SPEED) * SWAY) + mouse.x * MOUSE_TURN;
      const cR = Math.cos(rot);
      const sR = Math.sin(rot);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Órbita: una circunferencia fina alrededor del planeta
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(120, 180, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.16, 0, Math.PI * 2);
      ctx.stroke();

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

      // Rutas de red
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(190, 230, 255, 0.24)';
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

      // Líneas guía: de cada anotación a Bogotá, con un codo como en una lámina
      // técnica. Se apagan al empezar a bajar.
      const fade = Math.max(0, 1 - heroScroll.m * 4);
      const b = project(CITIES[0][0], CITIES[0][1], CITIES[0][2], cR, sR);
      if (fade > 0 && b.z > 0 && !compact.matches) {
        const bx = cx + b.x * R;
        const by = cy - b.y * R;
        const rect = canvas.getBoundingClientRect();
        ctx.lineWidth = 1;
        ctx.lineCap = 'butt';
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.32 * fade).toFixed(3)})`;
        ctx.beginPath();
        for (const pin of pins) {
          const r = pin.getBoundingClientRect();
          if (!r.width) continue;
          const ax = r.left + r.width / 2 - rect.left;
          const ay = r.top + r.height / 2 - rect.top;
          const ex = ax + (bx - ax) * 0.42;
          // El trazo final se detiene antes del nodo para no tapar su anillo
          const dx = bx - ex;
          const dy = by - ay;
          const len = Math.hypot(dx, dy) || 1;
          const stop = Math.min(10, len);
          ctx.moveTo(ax + Math.sign(bx - ax) * 6, ay);
          ctx.lineTo(ex, ay);
          ctx.lineTo(bx - (dx / len) * stop, by - (dy / len) * stop);
        }
        ctx.stroke();
      }
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

    const refit = () => {
      if (resize()) draw(last);
    };
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(refit);
      ro.observe(canvas);
      if (logo) ro.observe(logo);
    } else {
      window.addEventListener('resize', refit);
    }
    // El titular cambia de alto al cargar las fuentes y mueve el logo
    document.fonts?.ready.then(refit);
    compact.addEventListener('change', refit);

    // El mouse gira el planeta un poco hacia donde está
    const stage = hero.querySelector('.hero__stage') || hero;
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    });
    stage.addEventListener('pointerleave', () => {
      mouse.tx = 0;
    });

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
     el CSS lo usa para el parallax del logo y el planeta y para apagar las
     anotaciones. También queda en heroScroll: el planeta apaga sus líneas
     guía. Con movimiento reducido no se escribe y todo queda fijo. */
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
     cambia por el botón de cotizar (no se repite la marca dos veces en la
     misma pantalla). */
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

    // Fuera del hero: el avatar aparece cuando el hero deja libre la mitad
    // de arriba de la pantalla
    const hero = document.getElementById('inicio');
    if (hero && hasIO) {
      buddy.classList.add('is-away');
      new IntersectionObserver(
        ([entry]) => buddy.classList.toggle('is-away', entry.isIntersecting),
        { rootMargin: '0px 0px -50% 0px' }
      ).observe(hero);
    }
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
      beneficios: [{ text: '¿Quieres vender más y tener todo bajo control? Hablemos.', href: '#contacto' }],
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
      const busy =
        document.visibilityState !== 'visible' ||
        nav?.classList.contains('is-open') ||
        buddy.classList.contains('is-away');
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

  /* ---------- Servicios: tarjetas que se apilan ----------
     Cada tarjeta es sticky (CSS). Aquí se calcula cuánto la cubren las que
     vienen detrás: para cada tarjeta siguiente, qué tanto ha subido hasta su
     sitio fijo (0 = aún lejos, 1 = ya encima). La suma es --depth, que el CSS
     usa para encoger y oscurecer la tarjeta. Solo corre mientras la sección
     está en pantalla; con movimiento reducido no se escribe nada. */
  function initStack() {
    const stack = document.querySelector('[data-stack]');
    if (!stack) return;
    const items = [...stack.querySelectorAll('.stack__item')];
    if (items.length < 2) return;

    let ticking = false;
    let visible = !hasIO;

    const update = () => {
      ticking = false;
      if (reduceMotion()) {
        items.forEach((el) => el.style.removeProperty('--depth'));
        return;
      }
      // Qué tanto ha llegado cada tarjeta a su sitio fijo
      const arrive = items.map((el, i) => {
        if (i === 0) return 0;
        const top = el.getBoundingClientRect().top;
        const stick = parseFloat(getComputedStyle(el).top) || 0;
        const travel = el.offsetHeight + (parseFloat(getComputedStyle(el).marginTop) || 0);
        return Math.min(1, Math.max(0, 1 - (top - stick) / travel));
      });
      let depth = 0;
      for (let i = items.length - 1; i >= 0; i -= 1) {
        items[i].style.setProperty('--depth', depth.toFixed(3));
        depth += arrive[i];
      }
    };
    const request = () => {
      if (ticking || !visible) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    if (hasIO) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) request();
      }).observe(stack);
    }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    prefersReducedMotion.addEventListener('change', update);
    update();
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

  /* ---------- Proyectos: galería que se expande ----------
     Un caso abierto a la vez. Clic (o Enter) en una franja la abre. Mientras
     la galería está en pantalla rota sola: la barra cian del caso abierto se
     llena en --dur y al terminar abre el siguiente. Se pausa con el cursor o
     el foco dentro y deja de rotar del todo cuando la persona elige un caso.
     Con movimiento reducido no rota. */
  function initCases() {
    const root = document.querySelector('[data-cases]');
    if (!root) return;
    const cases = [...root.querySelectorAll('.case')];
    if (!cases.length) return;
    const triggers = cases.map((c) => c.querySelector('.case__trigger'));
    const bodies = cases.map((c) => c.querySelector('.case__body'));
    let current = Math.max(0, cases.findIndex((c) => c.classList.contains('is-active')));

    const open = (index) => {
      current = index;
      cases.forEach((c, i) => {
        const active = i === index;
        c.classList.toggle('is-active', active);
        triggers[i]?.setAttribute('aria-expanded', String(active));
        if (bodies[i]) bodies[i].inert = !active;
      });
    };

    const stopAutoplay = () => root.classList.remove('is-autoplay');

    triggers.forEach((t, i) =>
      t?.addEventListener('click', () => {
        stopAutoplay();
        open(i);
      })
    );

    if (reduceMotion()) return;

    // Rotación automática: empieza pausada hasta que la galería se ve
    root.classList.add('is-autoplay', 'is-paused');
    let hovering = false;
    let focused = false;
    let visible = false;
    const syncPause = () => root.classList.toggle('is-paused', hovering || focused || !visible);

    root.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') hovering = true;
      syncPause();
    });
    root.addEventListener('pointerleave', () => {
      hovering = false;
      syncPause();
    });
    root.addEventListener('focusin', () => {
      focused = true;
      syncPause();
    });
    root.addEventListener('focusout', (e) => {
      focused = root.contains(e.relatedTarget);
      syncPause();
    });

    root.addEventListener('animationend', (e) => {
      if (e.animationName !== 'case-progress' || !root.classList.contains('is-autoplay')) return;
      open((current + 1) % cases.length);
    });

    if (hasIO) {
      new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          syncPause();
        },
        { threshold: 0.35 }
      ).observe(root);
    } else {
      visible = true;
      syncPause();
    }

    prefersReducedMotion.addEventListener('change', () => {
      if (reduceMotion()) stopAutoplay();
    });
  }

  /* ---------- Footer: olas en degradado (port sin dependencias de GradientWaves de React Bits) ----------
     Campo de olas por raymarching en WebGL2 que se pierde en una bruma violeta,
     con crestas cian. Ajustes en los data-* de .footer__waves. Solo dibuja
     mientras el footer está en pantalla; con movimiento reducido dibuja un
     cuadro fijo. Sin WebGL2 queda el brillo de respaldo del CSS. */
  function initFooterWaves() {
    const host = document.querySelector('.footer__waves');
    if (!host) return;
    const footer = host.closest('footer') || host.parentElement;

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
    });
    if (!gl) return;

    const num = (key, fallback) => {
      const v = parseFloat(host.dataset[key]);
      return Number.isFinite(v) ? v : fallback;
    };
    const hexToRgb = (hex, fallback) => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
      return m ? [1, 2, 3].map((k) => parseInt(m[k], 16) / 255) : fallback;
    };

    const vertex = `#version 300 es
      in vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `;

    const fragment = `#version 300 es
      precision highp float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform float uSpeed;
      uniform float uAmplitude;
      uniform float uWaveScale;
      uniform float uWaveRatio;
      uniform float uSwell;
      uniform float uTurbulence;
      uniform float uTilt;
      uniform float uZoom;
      uniform float uHeight;
      uniform float uFogDepth;
      uniform float uSteps;
      uniform float uBrightness;
      uniform float uOpacity;
      uniform float uGrainIntensity;
      uniform vec2 uMouse;
      uniform float uParallax;
      uniform vec3 uHorizonColor;
      uniform vec3 uWaveColor;
      uniform vec3 uCrestColor;
      out vec4 fragColor;

      const float MAX_DIST = 20000.0;

      float hash21(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float plasma(vec3 r, vec2 freq, vec4 tc) {
        float mx = r.x + tc.x;
        mx += uSwell * sin((r.y + mx) / 20.0 + tc.y);
        float my = r.y - tc.z;
        my += uTurbulence * cos(r.x / 23.0 + tc.w);
        return r.z - (sin(mx * freq.x) * uAmplitude + sin(my * freq.y) * uAmplitude + uHeight);
      }

      float raymarch(vec3 pos, vec3 dir, vec2 freq, vec4 tc) {
        float dist = 0.0;
        for (int i = 0; i < 128; i++) {
          if (float(i) >= uSteps) break;
          float dscene = plasma(pos + dist * dir, freq, tc);
          if (abs(dscene) < 0.1) break;
          dist += 0.9 * dscene;
          if (!(abs(dist) < MAX_DIST)) return MAX_DIST;
        }
        return dist;
      }

      void main() {
        float T = iTime * uSpeed;
        vec2 freq = vec2(uWaveScale / 7.0, (uWaveScale * uWaveRatio) / 3.0);
        vec4 tc = vec4(T / 0.130, T / 0.810, T / 0.200, T / 0.710);
        float c, s;
        float vfov = (3.14159 / 2.3) / max(uZoom, 0.05);
        vec3 cam = vec3(0.0, 0.0, 30.0);
        vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;
        uv.x *= iResolution.x / iResolution.y;
        uv.y *= -1.0;

        vec3 dir = vec3(0.0, 0.0, -1.0);
        float ulen = length(uv);
        float xrot = vfov * ulen;
        c = cos(xrot); s = sin(xrot);
        dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
        vec2 nuv = ulen > 1e-5 ? uv / ulen : vec2(1.0, 0.0);
        c = nuv.x; s = nuv.y;
        dir = mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0) * dir;
        c = cos(uTilt); s = sin(uTilt);
        dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;

        float yaw = (uMouse.x - 0.5) * uParallax * 0.4;
        float pitch = (uMouse.y - 0.5) * uParallax * 0.4;
        c = cos(yaw); s = sin(yaw);
        dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;
        c = cos(pitch); s = sin(pitch);
        dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;

        float dist = raymarch(cam, dir, freq, tc);
        vec3 pos = cam + dist * dir;

        float t = clamp(uFogDepth / max(dist, 0.001), 0.0, 1.0);
        vec3 body = mix(uWaveColor, uCrestColor, clamp(pos.z * 0.08 + 0.5, 0.0, 1.0));
        vec3 col = mix(uHorizonColor, body, t);
        col *= uBrightness;
        col = clamp(col, 0.0, 1.0);

        float alpha = clamp(t, 0.0, 1.0) * uOpacity;
        float g = hash21(gl_FragCoord.xy + mod(iTime, 64.0) * 11.0);
        alpha += (g - 0.5) * uGrainIntensity;
        alpha = clamp(alpha, 0.0, 1.0);
        fragColor = vec4(col * alpha, alpha);
      }
    `;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[VOLT] Olas del footer:', gl.getShaderInfoLog(shader));
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
      console.error('[VOLT] Olas del footer:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Un solo triángulo que cubre todo el lienzo
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const u = (name) => gl.getUniformLocation(program, name);
    gl.uniform1f(u('uSpeed'), num('speed', 0.25));
    gl.uniform1f(u('uAmplitude'), num('amplitude', 2.5));
    gl.uniform1f(u('uWaveScale'), num('waveScale', 0.6));
    gl.uniform1f(u('uWaveRatio'), num('waveRatio', 0.9));
    gl.uniform1f(u('uSwell'), num('swell', 35));
    gl.uniform1f(u('uTurbulence'), num('turbulence', 20));
    gl.uniform1f(u('uTilt'), num('tilt', 1.11));
    gl.uniform1f(u('uZoom'), num('zoom', 1));
    gl.uniform1f(u('uHeight'), num('height', 5.5));
    gl.uniform1f(u('uFogDepth'), num('fogDepth', 15));
    gl.uniform1f(u('uSteps'), 64);
    gl.uniform1f(u('uBrightness'), num('brightness', 0.85));
    gl.uniform1f(u('uOpacity'), num('opacity', 0.9));
    gl.uniform1f(u('uGrainIntensity'), num('grain', 0.04));
    gl.uniform1f(u('uParallax'), num('parallax', 0.5));
    gl.uniform3fv(u('uHorizonColor'), hexToRgb(host.dataset.horizon, [0.33, 0.2, 0.74]));
    gl.uniform3fv(u('uWaveColor'), hexToRgb(host.dataset.wave, [0.04, 0.18, 0.4]));
    gl.uniform3fv(u('uCrestColor'), hexToRgb(host.dataset.crest, [0, 0.88, 0.94]));
    const uTime = u('iTime');
    const uResolution = u('iResolution');
    const uMouse = u('uMouse');
    gl.clearColor(0, 0, 0, 0);

    // Las olas son suaves: basta con dibujar a resolución reducida
    const RENDER_SCALE = 0.6;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const t0 = performance.now();
    let running = false;
    let frame = 0;

    const render = (now) => {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform1f(uTime, reduceMotion() ? 6 : (now - t0) * 0.001);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      const w = Math.max(1, Math.round(host.clientWidth * RENDER_SCALE));
      const h = Math.max(1, Math.round(host.clientHeight * RENDER_SCALE));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uResolution, w, h);
      }
      if (!running) render(performance.now());
    };

    const loop = (now) => {
      render(now);
      frame = running ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (running || reduceMotion() || document.hidden) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    footer.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const rect = host.getBoundingClientRect();
      mouse.tx = (e.clientX - rect.left) / rect.width;
      mouse.ty = 1 - (e.clientY - rect.top) / rect.height;
    });
    footer.addEventListener('pointerleave', () => {
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
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host);
    else window.addEventListener('resize', resize);

    let inView = !hasIO;
    if (hasIO) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      }).observe(host);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (inView) start();
    });
    prefersReducedMotion.addEventListener('change', () => {
      if (reduceMotion()) {
        stop();
        render(performance.now());
      } else if (inView) start();
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
  initHeroGlobe();
  initHeroScroll();
  initNavBrand();
  initBuddy();
  initTimeline();
  initStack();
  initReveal();
  initCases();
  initFooterWaves();
  initFaq();
  initContactForm();
  initYear();
})();
