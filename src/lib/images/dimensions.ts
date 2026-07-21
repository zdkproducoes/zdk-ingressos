// Lê largura/altura de PNG, JPEG e WebP direto do buffer, sem dependências.
// Usado para validar a hero do evento no servidor (não dá pra burlar pelo cliente).
export function imageSize(buf: Buffer): { width: number; height: number } | null {
  // PNG — assinatura 0x89504E47; IHDR traz width/height big-endian
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // JPEG — procura o marcador SOFn (0xFFC0..0xFFCF, exceto C4/C8/CC)
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) { off++; continue; }
      let marker = buf[off + 1];
      while (marker === 0xff && off + 2 < buf.length) { off++; marker = buf[off + 1]; }
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
      }
      // Marcadores sem payload (RSTn, SOI/EOI, TEM)
      if ((marker >= 0xd0 && marker <= 0xd9) || marker === 0x01) { off += 2; continue; }
      const len = buf.readUInt16BE(off + 2);
      off += 2 + len;
    }
    return null;
  }

  // WebP — RIFF....WEBP + VP8 / VP8L / VP8X
  if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const fmt = buf.toString('ascii', 12, 16);
    if (fmt === 'VP8 ') {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (fmt === 'VP8L') {
      const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
      return {
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      };
    }
    if (fmt === 'VP8X') {
      return {
        width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
        height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
      };
    }
  }

  return null;
}

// Regras da hero do evento (banner 2:1). Aceita a partir de 1200×600,
// mantendo a proporção 2:1 com pequena tolerância.
export const HERO = {
  ratio: 2,
  ratioTolerance: 0.04, // ±4%
  minWidth: 1200,
  minHeight: 600,
} as const;

export function validateHeroSize(width: number, height: number): string | null {
  if (width < HERO.minWidth || height < HERO.minHeight) {
    return `Imagem pequena demais. Envie no mínimo ${HERO.minWidth}×${HERO.minHeight} (ideal 2160×1080).`;
  }
  const ratio = width / height;
  if (Math.abs(ratio - HERO.ratio) > HERO.ratioTolerance) {
    return `Proporção incorreta (${width}×${height}). A hero precisa ser 2:1 — ex.: 2160×1080.`;
  }
  return null;
}
