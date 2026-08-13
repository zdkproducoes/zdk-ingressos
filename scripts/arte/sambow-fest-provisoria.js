// Arte PROVISÓRIA do SAMBOW FEST (hero 2:1) — substituir pela arte oficial
// quando o Danilo entregar. Gera um banner tipográfico na identidade ZDK
// (Preto Palco + Ouro ZDK + barras de equalizador do símbolo da marca).
//
// Uso: npm install --no-save sharp && node scripts/arte/sambow-fest-provisoria.js
// Saída: scripts/arte/sambow-fest-provisoria.jpg (1600x800)
//
// O sharp NÃO está no package.json de propósito — é ferramenta de bastidor,
// não dependência do app. Instale com --no-save quando for gerar a arte.
//
// Fontes: usa Arial Black / Arial do sistema (a Archivo Expanded da marca não
// está instalada na máquina). É arte temporária — o que importa é não deixar
// a página sem banner.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const W = 1600;
const H = 800;

const OURO = '#D9A63F';
const OURO_CLARO = '#F0C25E';
const PRETO_PALCO = '#0D0E12';
const GRAFITE = '#1D2029';
const GELO = '#F4F4F2';
const PRATA = '#A6A8AB';

// Barras de equalizador do símbolo da marca, repetidas como textura de fundo.
function barrasEqualizador() {
  const alturas = [16, 28, 40, 52, 34, 18, 30, 46, 24, 38];
  const partes = [];
  const larguraBarra = 14;
  const espaco = 26;
  const total = Math.ceil(W / espaco) + 1;
  for (let i = 0; i < total; i++) {
    const h = alturas[i % alturas.length] * 3.2;
    const x = i * espaco;
    const y = H - h - 40;
    partes.push(
      `<rect x="${x}" y="${y}" width="${larguraBarra}" height="${h}" rx="7" fill="${OURO}" opacity="0.10"/>`,
    );
  }
  return partes.join('\n    ');
}

// Moldura de ingresso com picote (mesma silhueta do símbolo ZDK).
function molduraIngresso() {
  const m = 34;          // margem
  const r = 26;          // raio dos cantos
  const notch = 30;      // raio do picote lateral
  const meio = H / 2;
  return `
    <path fill="none" stroke="${OURO}" stroke-width="3" opacity="0.55"
      d="M ${m + r} ${m}
         H ${W - m - r} Q ${W - m} ${m} ${W - m} ${m + r}
         V ${meio - notch}
         A ${notch} ${notch} 0 0 0 ${W - m} ${meio + notch}
         V ${H - m - r} Q ${W - m} ${H - m} ${W - m - r} ${H - m}
         H ${m + r} Q ${m} ${H - m} ${m} ${H - m - r}
         V ${meio + notch}
         A ${notch} ${notch} 0 0 0 ${m} ${meio - notch}
         V ${m + r} Q ${m} ${m} ${m + r} ${m} Z"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="fundo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PRETO_PALCO}"/>
      <stop offset="55%" stop-color="${GRAFITE}"/>
      <stop offset="100%" stop-color="${PRETO_PALCO}"/>
    </linearGradient>
    <linearGradient id="ouro" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${OURO_CLARO}"/>
      <stop offset="100%" stop-color="${OURO}"/>
    </linearGradient>
    <radialGradient id="brilho" cx="50%" cy="38%" r="55%">
      <stop offset="0%" stop-color="${OURO}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${OURO}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#fundo)"/>
  <rect width="${W}" height="${H}" fill="url(#brilho)"/>
  <g>
    ${barrasEqualizador()}
  </g>
  ${molduraIngresso()}

  <!-- Chapéu -->
  <text x="${W / 2}" y="132" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="bold"
        letter-spacing="9" fill="${OURO}">ZDK INGRESSOS APRESENTA</text>

  <!-- Título -->
  <text x="${W / 2}" y="286" text-anchor="middle"
        font-family="Arial Black, Arial, sans-serif" font-size="146" font-weight="900"
        letter-spacing="6" fill="url(#ouro)">SAMBOW FEST</text>

  <!-- Subtítulo -->
  <text x="${W / 2}" y="340" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="27" font-style="italic"
        letter-spacing="2" fill="${PRATA}">um domingo inteiro de pagode</text>

  <!-- Régua -->
  <rect x="${W / 2 - 210}" y="374" width="420" height="2" fill="${OURO}" opacity="0.5"/>

  <!-- Data e local -->
  <text x="${W / 2}" y="432" text-anchor="middle"
        font-family="Arial Black, Arial, sans-serif" font-size="42" font-weight="900"
        letter-spacing="4" fill="${GELO}">20 DE SETEMBRO · DOMINGO · 12H</text>
  <text x="${W / 2}" y="474" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="bold"
        letter-spacing="4" fill="${OURO_CLARO}">VILLA JARDIM BAR · SÃO BERNARDO DO CAMPO</text>

  <!-- Atrações principais -->
  <text x="${W / 2}" y="562" text-anchor="middle"
        font-family="Arial Black, Arial, sans-serif" font-size="38" font-weight="900"
        letter-spacing="3" fill="${GELO}">PAGODE DO GORDINHO · PAGODE DO DB · GICA</text>

  <!-- Participações -->
  <text x="${W / 2}" y="612" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="22"
        letter-spacing="2" fill="${PRATA}">COM ALEX FERNANDES · TIBÉRIO · SING SANTIAGO · CAIO LACERDA · SAMBA NA REDE · AGITAI</text>

  <!-- DJs -->
  <text x="${W / 2}" y="652" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold"
        letter-spacing="3" fill="${PRATA}">DJ DHUPAN · DJ DYO · DJ DUH</text>

  <!-- Selo de abertura das vendas -->
  <rect x="${W / 2 - 250}" y="694" width="500" height="52" rx="26" fill="${OURO}"/>
  <text x="${W / 2}" y="729" text-anchor="middle"
        font-family="Arial Black, Arial, sans-serif" font-size="26" font-weight="900"
        letter-spacing="3" fill="${PRETO_PALCO}">VENDAS ABREM 13/08 ÀS 18H</text>
</svg>`;

const destino = path.join(__dirname, 'sambow-fest-provisoria.jpg');

sharp(Buffer.from(svg))
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(destino)
  .then((info) => {
    fs.writeFileSync(path.join(__dirname, 'sambow-fest-provisoria.svg'), svg);
    console.log(`OK ${destino} — ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)}KB`);
  })
  .catch((err) => {
    console.error('Falha ao gerar a arte:', err);
    process.exit(1);
  });
