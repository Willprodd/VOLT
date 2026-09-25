# VOLT soluciones digitales — Guía de marca (resumen)

Contexto de marca para desarrollo. Aplicar estas reglas en todo lo visual: web, app, componentes y documentos.

## 1. Marca

- **Nombre:** VOLT soluciones digitales (en textos: "VOLT"; nombre completo en pie de página y metadatos).
- **Qué es:** empresa de desarrollo de software y soluciones digitales para pymes (Bogotá, Tocaima y Girardot, Colombia).
- **Personalidad:** tecnológica, precisa, moderna, cercana. Energía (volt = voltaje) sin estética gamer.
- **Tono de voz:** español claro y directo, tuteo, frases cortas, sin tecnicismos innecesarios.

## 2. Logo

**Composición:** wordmark "VOLT" en mayúsculas + descriptor "soluciones digitales" en minúsculas debajo, centrado y del mismo ancho que "VOLT".

- **V (isotipo):** dos barras gruesas inclinadas y separadas, que no se tocan. La izquierda es larga y llega a la línea base; la derecha es más corta y termina antes de la base. Extremos superiores planos. Color cian.
- **O:** cuadrada, con hueco cuadrado y solo las esquinas superior izquierda e inferior derecha cortadas en diagonal.
- **L y T:** trazos rectos; el extremo derecho de la barra inferior de la L y de la barra superior de la T están cortados en diagonal.
- **O, L, T:** blancas, mismo grosor de trazo que la V, sin curvas.
- **Descriptor:** sans técnica y ancha (tipo Michroma), minúsculas, espaciado amplio, color cian.

**Versiones:**
| Versión | Uso |
|---|---|
| Horizontal completa (VOLT + descriptor) | Header web, portada, presentaciones |
| Firma corta (solo VOLT) | Navbar compacta, espacios pequeños |
| Isotipo (solo la V) | Favicon, icono de app, avatar redes |

**Reglas:** fondo oscuro por defecto. Sobre fondo claro: V en violeta `#5533BD` y O‑L‑T en `#10101B`. Monocromo permitido (todo blanco o todo `#10101B`). No deformar, no rotar, no añadir sombras, brillos ni degradados al logo. Área libre mínima alrededor = ancho de una barra de la V. Isotipo mínimo: 16 px.

**Archivos esperados** (exportar desde el diseño final):
```
/public/brand/volt-logo.svg        # horizontal completo
/public/brand/volt-wordmark.svg    # solo VOLT
/public/brand/volt-isotipo.svg     # solo la V
/public/favicon.svg                # isotipo sobre #10101B
```

Isotipo de referencia (SVG):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 201 181">
  <path d="M0,0 H46 L110,181 H65 Z" fill="#00E0EF"/>
  <path d="M155,0 H201 L150,129 H105 Z" fill="#00E0EF"/>
</svg>
```

## 3. Color

| Token | HEX | Uso |
|---|---|---|
| `--volt-cyan` | `#00E0EF` | Color protagonista: V, botones primarios, enlaces, acentos |
| `--volt-black` | `#10101B` | Fondo principal |
| `--volt-charcoal` | `#27272D` | Tarjetas, superficies, bordes |
| `--volt-white` | `#FFFFFF` | Texto principal, O‑L‑T del logo |
| `--volt-gray` | `#A0A0AE` | Texto secundario |
| `--volt-violet` | `#5533BD` | Acento secundario, V sobre fondos claros |
| `--volt-lavender` | `#AC8CFC` | Acento suave, etiquetas, detalles |

**Proporción:** ~70 % negro, ~20 % charcoal/blanco, ~10 % cian. El cian es escaso a propósito; el violeta solo como segundo acento, nunca compitiendo con el cian en el mismo elemento.

**Accesibilidad:** cian y blanco sobre `#10101B` sirven para texto. Cian sobre blanco NO sirve para texto. Sobre botones cian, el texto va en `#10101B`.

## 4. Tipografía (Google Fonts)

| Rol | Fuente | Uso |
|---|---|---|
| Display | **Michroma** | Títulos H1–H2, etiquetas cortas, en mayúsculas o minúsculas espaciadas |
| Texto | **Lexend** (400/500/600) | Párrafos, H3+, botones, formularios, UI |

- H1 48–64 px, H2 32–40 px, H3 22–24 px, cuerpo 16–18 px, interlineado 1.6.
- Michroma solo en textos cortos (es muy ancha); nunca en párrafos.

## 5. Estilo visual y UI

- **Modo oscuro por defecto.** Fondos planos `#10101B`; se permite un brillo difuso muy sutil cian/violeta en secciones hero.
- **Forma firma:** esquinas cortadas en diagonal (chaflán), como la O del logo. Úsala en botones, tarjetas e insignias (`clip-path: polygon(...)`). Evitar bordes muy redondeados; si hay radio, máximo 6 px.
- **Ángulos:** líneas diagonales y cortes inclinados como recurso gráfico; nada de formas orgánicas.
- **Botón primario:** fondo cian, texto `#10101B`, Lexend 600. Hover: fondo blanco.
- **Botón secundario:** borde 1.5 px cian, texto cian, fondo transparente. Hover: fondo cian, texto `#10101B`.
- **Tarjetas:** fondo `#27272D`, borde 1 px `rgba(255,255,255,0.06)`, chaflán en una esquina.
- **Iconos:** de línea (outline), trazo 1.5–2 px, en blanco o cian.
- **Imágenes:** fotos reales de pymes y equipos de trabajo, tono frío y oscuro; evitar stock genérico brillante.

## 6. Tokens CSS

```css
:root {
  --volt-cyan: #00E0EF;
  --volt-black: #10101B;
  --volt-charcoal: #27272D;
  --volt-white: #FFFFFF;
  --volt-gray: #A0A0AE;
  --volt-violet: #5533BD;
  --volt-lavender: #AC8CFC;

  --font-display: 'Michroma', 'Eurostile', sans-serif;
  --font-body: 'Lexend', system-ui, sans-serif;

  --chamfer: 12px;
  --radius: 6px;
}

.chamfer {
  clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)),
                     calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer));
}
```

## 7. Qué evitar

Degradados arcoíris, neón exagerado, estética gamer, sombras pesadas, más de dos acentos por pantalla, Arial/Roboto/Inter, bordes muy redondeados, textos largos en Michroma, y la V dibujada como una V sólida normal.
