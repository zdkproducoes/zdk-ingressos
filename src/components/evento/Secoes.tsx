import { Calendar, MapPin, Clock } from "lucide-react"

const LAT = -23.65009070362278
const LNG = -46.5833898
const GMAPS_URL = `https://www.google.com/maps/search/?api=1&query=${LAT},${LNG}`
const WAZE_URL = `https://waze.com/ul?ll=${LAT},${LNG}&navigate=yes`
const GMAPS_EMBED = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3654.7171916307193!2d-46.585964725483855!3d-23.650297064864017!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce43cfa92d7d13%3A0x4777182a65766fc0!2sVilla%20Jardim!5e0!3m2!1spt-BR!2sbr!4v1777760721189!5m2!1spt-BR!2sbr"

export function CopyAbertura() {
  return (
    <section className="max-w-[850px] mx-auto px-5 pt-16 pb-10 text-center">
      <div className="font-display text-accent-400 tracking-[0.2em] text-sm mb-3">
        02 DE AGOSTO • SÃO BERNARDO DO CAMPO • SUPER EDIÇÃO
      </div>
      <h1 className="font-display-bold text-[clamp(2rem,5vw,3rem)] leading-[1.05] text-cream-200 mb-6">
        A 16ª edição virou{" "}
        <span className="text-accent-400 relative inline-block">
          Super Edição
          <span className="absolute left-0 right-0 -bottom-1 h-[5px] bg-muted-400 -skew-x-12 opacity-70" />
        </span>
      </h1>
      <p className="text-cream-300 text-[1.0625rem] leading-[1.7] max-w-[650px] mx-auto mb-5">
        O Sacode do Lacerda chega na 16ª edição em outro patamar:{" "}
        <strong className="text-cream-200">Milthinho</strong>, um dos maiores nomes do
        pagode nacional, vem cantar com a gente. Ao lado dele, o anfitrião{" "}
        <strong className="text-cream-200">Caio Lacerda</strong>, o{" "}
        <strong className="text-cream-200">Pagode Na Sena</strong> e o sertanejo de{" "}
        <strong className="text-cream-200">Nayara Oliveira</strong> — pagode, samba e
        sertanejo do meio-dia até a última música.
      </p>
      <p className="text-cream-300 text-[1.0625rem] leading-[1.7] max-w-[650px] mx-auto">
        Domingo, <strong className="text-cream-200">02 de agosto</strong>, a partir das{" "}
        <strong className="text-cream-200">12h</strong>, no{" "}
        <strong className="text-cream-200">Villa Jardim Bar</strong>, em{" "}
        <strong className="text-cream-200">São Bernardo do Campo</strong>. Chama a turma
        e vem viver o maior Sacode de todos.
      </p>
    </section>
  )
}

export function InfoEvento() {
  return (
    <section className="max-w-[1200px] mx-auto px-5 pt-2 pb-12">
      <div className="bg-surface-700 border border-muted-700 border-l-4 border-l-accent-400
                      rounded-xl px-7 py-6
                      grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2">
        <InfoRow
          icon={<Calendar className="w-[22px] h-[22px] stroke-accent-400" strokeWidth={2} />}
          label="Quando"
          value="02 de Agosto de 2026"
          sub="Domingo • a partir das 12h"
        />
        <InfoRow
          icon={<MapPin className="w-[22px] h-[22px] stroke-accent-400" strokeWidth={2} />}
          label="Onde"
          value="Villa Jardim Bar"
          sub="São Bernardo do Campo • ABC paulista • SP"
        />
        <InfoRow
          icon={<Clock className="w-[22px] h-[22px] stroke-accent-400" strokeWidth={2} />}
          label="Acesso"
          value="Maiores de 18 anos"
          sub="Menores apenas com pais ou responsáveis"
        />
      </div>
    </section>
  )
}

function InfoRow({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub: string
}) {
  return (
    <div className="flex gap-4 items-start py-3.5">
      <div className="w-[42px] h-[42px] bg-surface-800 border-2 border-muted-500
                      rounded-[10px] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.08em] text-cream-400 mb-0.5">{label}</div>
        <div className="font-display text-[1.375rem] tracking-[0.03em] text-cream-200 leading-[1.2]">{value}</div>
        <div className="text-[0.8125rem] text-cream-300 mt-0.5 leading-[1.4]">{sub}</div>
      </div>
    </div>
  )
}

export function LineupSection() {
  return (
    <section id="lineup" className="max-w-[1200px] mx-auto px-5 py-10">
      <div className="font-display text-accent-400 tracking-[0.2em] text-[0.85rem] text-center mb-2">
        QUEM SOBE NO PALCO
      </div>
      <h2 className="font-display-bold text-[clamp(2rem,4.5vw,2.75rem)] text-cream-200 text-center mb-2">
        Lineup <span className="text-accent-400">oficial</span>
      </h2>
      <p className="text-center text-cream-400 mb-10 text-[0.9375rem]">
        Pagode, samba e sertanejo — do começo ao fim
      </p>

      {/* Convidado especial: MILTHINHO — o grande destaque da Super Edição */}
      <div className="bg-gradient-to-br from-accent-400/15 to-surface-700
                      border-2 border-accent-400 rounded-2xl
                      p-8 mb-4 text-center relative overflow-hidden
                      shadow-[0_0_40px_-10px_rgba(228,160,63,0.35)]">
        <span className="absolute top-2 right-4 text-2xl opacity-40">🌟</span>
        <span className="inline-block bg-accent-400 text-surface-900
                         px-3.5 py-1 rounded-full text-[0.7rem] font-extrabold
                         tracking-[0.12em] uppercase mb-3.5">
          🌟 Convidado especial
        </span>
        <div className="font-display-bold text-[clamp(2.5rem,7vw,4rem)]
                        text-accent-300 leading-none tracking-wide mb-1.5">
          MILTHINHO
        </div>
        <div className="font-display text-lg text-cream-200 tracking-[0.1em]">
          Um dos maiores nomes do pagode nacional
        </div>
      </div>

      {/* Anfitrião: Caio Lacerda */}
      <div className="bg-gradient-to-br from-muted-700 to-surface-700
                      border-2 border-muted-400 rounded-2xl
                      p-8 mb-6 text-center relative overflow-hidden">
        <span className="absolute top-2 right-4 text-2xl opacity-40">👑</span>
        <span className="inline-block bg-muted-400 text-surface-900
                         px-3.5 py-1 rounded-full text-[0.7rem] font-extrabold
                         tracking-[0.12em] uppercase mb-3.5">
          ⭐ Anfitrião
        </span>
        <div className="font-display-bold text-[clamp(2.25rem,6vw,3.5rem)]
                        text-cream-100 leading-none tracking-wide mb-1.5">
          CAIO LACERDA
        </div>
        <div className="font-display text-lg text-accent-300 tracking-[0.1em]">
          Pagode &amp; Samba
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <ArtistCard name="Pagode Na Sena"   genre="Pagode & Samba" tipo="pagode" />
        <ArtistCard name="Nayara Oliveira"  genre="Sertanejo"      tipo="sertanejo" />
      </div>

      <div className="bg-surface-900 border border-dashed border-muted-600 rounded-[10px]
                      px-5 py-3.5 text-center text-cream-300 text-[0.9375rem]">
        🎧 Discotecagem nos intervalos com{" "}
        <strong className="text-accent-400 font-display tracking-wider text-lg ml-1">
          DJ SANT
        </strong>
      </div>
    </section>
  )
}

function ArtistCard({ name, genre, tipo }: {
  name: string; genre: string; tipo: "pagode" | "sertanejo"
}) {
  const borderColor = tipo === "pagode"  ? "border-t-accent-400" : "border-t-muted-400"
  const hoverBorder = tipo === "pagode"  ? "hover:border-t-accent-300" : "hover:border-t-muted-300"
  return (
    <div className={`bg-surface-700 border border-muted-700 border-t-[3px] ${borderColor}
                     rounded-xl px-5 py-5 text-center transition-all duration-200
                     ${hoverBorder} hover:-translate-y-1 hover:shadow-lg`}>
      <div className="font-display text-2xl text-cream-200 tracking-[0.03em] mb-1 leading-tight">{name}</div>
      <div className="text-xs text-cream-400 tracking-wider uppercase">{genre}</div>
    </div>
  )
}

export function MapaSection() {
  return (
    <section id="local" className="max-w-[1200px] mx-auto px-5 py-10">
      <div className="font-display text-accent-400 tracking-[0.2em] text-[0.85rem] text-center mb-2">
        COMO CHEGAR
      </div>
      <h2 className="font-display-bold text-[clamp(2rem,4.5vw,2.75rem)] text-cream-200 text-center mb-2">
        No <span className="text-accent-400">Villa Jardim Bar</span>
      </h2>
      <p className="text-center text-cream-400 mb-10 text-[0.9375rem]">
        Em São Bernardo do Campo, no coração do ABC paulista — fácil acesso pela Marginal
      </p>

      <div className="bg-surface-700 border border-muted-700 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-muted-700 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-display text-2xl text-cream-200 tracking-[0.03em] leading-tight">
              Villa Jardim Bar
            </div>
            <div className="text-sm text-cream-400 mt-1">
              Av. Marginal Direita, 235 — Taboão<br />
              São Bernardo do Campo — SP • CEP 09760-510
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href={GMAPS_URL} target="_blank" rel="noopener noreferrer"
               className="bg-surface-600 text-cream-100 px-3.5 py-2
                          border border-muted-500 rounded-lg text-[0.8125rem] font-semibold
                          no-underline inline-flex items-center gap-1.5
                          transition-all duration-200 hover:bg-surface-500 hover:-translate-y-0.5">
              📍 Google Maps
            </a>
            <a href={WAZE_URL} target="_blank" rel="noopener noreferrer"
               className="bg-muted-600 text-cream-100 px-3.5 py-2
                          border border-muted-400 rounded-lg text-[0.8125rem] font-semibold
                          no-underline inline-flex items-center gap-1.5
                          transition-all duration-200 hover:bg-muted-500 hover:-translate-y-0.5">
              🚗 Waze
            </a>
          </div>
        </div>
        <div className="w-full">
          <iframe
            src={GMAPS_EMBED}
            className="w-full rounded-lg shadow-lg border-0"
            style={{ height: '350px' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Localização do Villa Jardim Bar — Local do evento SACODE"
          />
        </div>
      </div>
    </section>
  )
}
