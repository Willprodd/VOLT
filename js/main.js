/* ==========================================================================
   VOLT soluciones digitales - interacciones
   Sin dependencias. Sin listeners de scroll: todo usa IntersectionObserver.
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

  /* ---------- Hero: galería continua (duplica cada columna para el bucle) ---------- */
  function initShowcase() {
    document.querySelectorAll('.showcase__track').forEach((track) => {
      [...track.children].forEach((shot) => {
        const clone = shot.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        const img = clone.querySelector('img');
        if (img) {
          img.alt = '';
          img.loading = 'lazy';
          img.removeAttribute('fetchpriority');
        }
        track.appendChild(clone);
      });
    });

    // Pausa la animación cuando el hero no está en pantalla (ahorra batería y GPU)
    const showcase = document.querySelector('.showcase');
    if (showcase && hasIO) {
      new IntersectionObserver(([entry]) => {
        showcase.classList.toggle('is-paused', !entry.isIntersecting);
      }).observe(showcase);
    }
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
  initShowcase();
  initCounters();
  initReveal();
  initTabs();
  initFaq();
  initContactForm();
  initYear();
})();
