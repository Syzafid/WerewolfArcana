import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore.js';
import { X, Users, Heart, Sparkles, RefreshCw } from 'lucide-react';
import { soundManager } from '../../utils/soundManager.js';

const roleCardImages: Record<string, string> = {
  seer: '/cards/seer.jpg',
  werewolf: '/cards/werewolf.jpg',
  witch: '/cards/witch.jpg',
  guardian: '/cards/guardian.jpg',
  hunter: '/cards/hunter.jpg',
  jester: '/cards/jester.jpg',
  serial_killer: '/cards/serial_killer.jpg',
  alpha_wolf: '/cards/alpha_wolf.jpg',
  mayor: '/cards/mayor.jpg',
  sheriff: '/cards/sheriff.jpg',
  bodyguard: '/cards/bodyguard.jpg',
  villager: '/cards/villager.jpg',
  cupid: '/cards/cupid.jpg',
  elder: '/cards/elder.jpg',
  vigilante: '/cards/vigilante.jpg',
  wolf_cub: '/cards/wolf_cub.jpg',
  tanner: '/cards/tanner.jpg',
};

const roleCaptions: Record<string, string> = {
  villager: 'Hanya punya suara, tapi itulah kekuatanku',
  sorcerer: 'Satu tebakan tepat, petir menyambar',
  seer: 'Melihat apa yang tersembunyi di malam hari',
  werewolf: 'Kegelapan adalah rumah kami',
  witch: 'Sembuhkan satu, racuni satu',
  guardian: 'Satu nyawa terselamatkan tiap malam',
  hunter: 'Kalau aku jatuh, kau ikut jatuh',
  jester: 'Tebak siapa yang tertawa terakhir',
  serial_killer: 'Satu per satu, sesuai keinginanku',
  alpha_wolf: 'Mereka takkan pernah curiga padaku',
  mayor: 'Suaraku, dua kali lipat',
  sheriff: 'Hukum tak pernah tidur',
  bodyguard: 'Serangan untukmu, jatuh padaku',
  aura_seer: 'Warna jiwa tak bisa berbohong',
  apprentice_seer: 'Menunggu giliran untuk melihat',
  paranormal_investigator: 'Dua petunjuk, satu malam',
  psychic: 'Identitas tak lagi jadi misteri',
  tracker: 'Setiap langkah meninggalkan cerita',
  lookout: 'Yang datang dan pergi, semua tercatat',
  little_girl: 'Rasa ingin tahu yang berbahaya',
  fox: 'Insting tak pernah salah, sampai suatu saat',
  bear_tamer: 'Bahaya menggeram di dekatnya',
  beholder: 'Tahu siapa yang melihat lebih dulu',
  defender: 'Tak bisa melindungi yang sama dua kali',
  jailer: 'Malam ini, dia milikku',
  crusader: 'Melindungi lebih dari satu, jika berani',
  herbalist: 'Api tak selalu bisa dipadamkan',
  elder: 'Umur panjang, kekuatan tersembunyi',
  vigilante: 'Keadilan, atau kesalahan fatal',
  veteran: 'Jangan ganggu yang sedang beristirahat',
  cupid: 'Terikat sampai ajal memisahkan',
  mason: 'Kami tahu, kami percaya',
  two_sisters: 'Darah lebih kental dari kecurigaan',
  transporter: 'Malam ini, semua bisa tertukar',
  escort: 'Tidak malam ini, sayang',
  thief: 'Kesempatan datang sekali',
  gypsy: 'Bicaralah, tak ada yang mendengar',
  stuttering_judge: 'Sekali lagi, demi keadilan',
  priest: 'Aku menyaksikan, bukan menghakimi',
  drunk: 'Aku merasa sangat berkuasa malam ini',
  village_idiot: 'Mereka pikir aku berbahaya',
  recluse: 'Terlihat jahat, hanya kesepian',
  lycan: 'Bayanganku berbohong tentang diriku',
  wild_child: 'Aku akan jadi sepertinya',
  angel: 'Bebas lebih cepat dari yang lain',
  actor: 'Malam ini, aku jadi siapa saja',
  mystic_wolf: 'Aku melihat lebih dari sekadar mangsa',
  wolf_cub: 'Kematianku baru permulaan',
  big_bad_wolf: 'Satu saja tak pernah cukup',
  white_werewolf: 'Bahkan pack-ku bukan milikku',
  cursed_wolf_father: 'Kutukanku, keluargamu',
  minion: 'Aku tahu, mereka tidak',
  lone_wolf: 'Semua orang, musuhku',
  tanner: 'Kematian adalah kemenanganku',
  arsonist: 'Semua akan menyala bersama',
  cult_leader: 'Bergabunglah, atau tersingkir',
  piper: 'Dengarkan laguku sampai akhir',
  vampire: 'Selamanya, bersamaku',
  survivor: 'Aku hanya ingin pulang',
  executioner: 'Satu nama, satu tujuan',
  amnesiac: 'Siapa aku sebenarnya?',
  doppelganger: 'Wajahmu, kini wajahku',
  ghost: 'Mati bukan berarti diam',
};

export const RoleCardModal: React.FC = () => {
  const { role, teammates, partner, isRoleModalOpen, setIsRoleModalOpen } = usePlayerStore();
  const [isFlipped, setIsFlipped] = useState(true); // default shows role front
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [role?.id]);

  if (!isRoleModalOpen || !role) return null;

  const teamColors = {
    werewolf: {
      bg: 'bg-gradient-to-b from-blood-950 via-slate-900 to-black border-blood-700 glow-crimson',
      badge: 'bg-blood-900/80 text-blood-300 border-blood-700',
      badgeIcon: '🩸',
      watermark: '🌙',
      title: 'text-blood-400',
      accent: 'border-blood-600',
    },
    village: {
      bg: 'bg-gradient-to-b from-slate-900 via-emerald-950/40 to-black border-emerald-600/40 glow-amber',
      badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700',
      badgeIcon: '🛡️',
      watermark: '☀️',
      title: 'text-emerald-400',
      accent: 'border-emerald-500',
    },
    neutral: {
      bg: 'bg-gradient-to-b from-purple-950 via-slate-900 to-black border-purple-700 glow-blue',
      badge: 'bg-purple-900/80 text-purple-300 border-purple-700',
      badgeIcon: '🎭',
      watermark: '⏳',
      title: 'text-purple-400',
      accent: 'border-purple-600',
    },
  };

  const style = teamColors[role.team] || teamColors.village;
  const caption = roleCaptions[role.id] || 'Kekuatan rahasiamu menentukan takdir desa';
  const cardImagePath = roleCardImages[role.id] || `/cards/${role.id}.jpg`;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center space-y-4">
        {/* Close Button Top Right */}
        <div className="w-full flex justify-end">
          <button
            onClick={() => setIsRoleModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white bg-slate-900/90 border border-slate-700 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Flip Card Container */}
        <div
          onClick={() => {
            soundManager.playCardFlip();
            setIsFlipped(!isFlipped);
          }}
          className="w-full h-[470px] perspective-1000 cursor-pointer select-none"
        >
          <div
            className={`w-full h-full relative transform-style-3d transition-transform duration-700 ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
          >
            {/* CARD BACK: Mysterious Tarot Sigil */}
            <div className="absolute inset-0 backface-hidden rounded-3xl border-2 border-amber-500/50 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 p-6 flex flex-col items-center justify-between text-center shadow-2xl overflow-hidden">
              <div className="w-full flex justify-between items-center text-xs text-amber-500/60 font-cinzel">
                <span>✦ ARCANA ✦</span>
                <span>ARCANA WEREWOLF</span>
              </div>

              <div className="relative my-auto">
                <div className="w-32 h-32 rounded-full border border-amber-500/30 flex items-center justify-center glow-amber animate-spin-orbital">
                  <div className="w-24 h-24 rounded-full border border-dashed border-amber-400/40 flex items-center justify-center">
                    <span className="text-5xl">🐺</span>
                  </div>
                </div>
                <div className="mt-4 text-sm font-cinzel font-bold tracking-widest text-amber-300">
                  KARTU TAKDIR
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-amber-400/80 bg-amber-950/40 px-4 py-2 rounded-xl border border-amber-700/40">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Ketuk kartu untuk membuka peran rahasia</span>
              </div>
            </div>

            {/* CARD FRONT: Revealed Role */}
            <div
              className={`absolute inset-0 backface-hidden rotate-y-180 rounded-3xl border-4 border-amber-900/60 ring-2 ring-amber-600/30 ${style.bg} p-3.5 flex flex-col justify-between shadow-2xl overflow-hidden`}
            >
              {/* If full card art is available, display it proudly. If file is missing, fallback gracefully */}
              {!imageError ? (
                <div className="relative w-full h-[325px] rounded-2xl overflow-hidden border border-amber-500/40 shadow-inner group bg-slate-950">
                  <img
                    src={cardImagePath}
                    alt={role.name}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm border border-amber-500/50 text-[10px] text-amber-300 font-cinzel font-bold">
                    {role.indonesianName}
                  </div>
                </div>
              ) : (
                /* Fallback styling that follows Master Prompt card anatomy */
                <div className="relative w-full h-[325px] rounded-2xl border-2 border-amber-700/50 bg-slate-950/80 p-3 flex flex-col justify-between overflow-hidden shadow-inner">
                  {/* Top Banner Ribbon */}
                  <div className="w-full flex items-center justify-between z-10">
                    <div className="px-3 py-1 rounded-md bg-amber-950/80 border border-amber-600/60 text-xs font-cinzel font-bold text-amber-200 shadow-md">
                      {role.name}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-amber-900/60 border border-amber-500/60 flex items-center justify-center text-xs shadow-md">
                      {style.badgeIcon}
                    </div>
                  </div>

                  {/* Centered Character Icon / Avatar */}
                  <div className="my-auto text-center">
                    <span className="text-6xl inline-block drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] filter">
                      {role.team === 'werewolf' ? '🐺' : role.id === 'seer' ? '🔮' : role.id === 'guardian' ? '🛡️' : role.id === 'witch' ? '🧙‍♀️' : role.id === 'hunter' ? '🏹' : role.id === 'jester' ? '🃏' : '📜'}
                    </span>
                    <h2 className={`text-xl font-cinzel font-black tracking-wider mt-2 ${style.title}`}>
                      {role.indonesianName}
                    </h2>
                    <span className="text-[10px] font-mono text-slate-400">Tim {role.team.toUpperCase()} • P#{role.resolutionPriority}</span>
                  </div>

                  {/* Watermark and Bottom Plaque */}
                  <div className="w-full flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-amber-900/40">
                    <span className="italic text-[10.5px] text-amber-300/80 font-serif">"{caption}"</span>
                    <span className="text-xs">{style.watermark}</span>
                  </div>
                </div>
              )}

              {/* Role Rules & Description */}
              <div className="p-2 bg-slate-950/85 border border-slate-800 rounded-xl text-[11.5px] text-slate-200 leading-snug max-h-20 overflow-y-auto">
                {role.description}
              </div>

              {/* Extra info for teammates / lovers */}
              <div className="space-y-1">
                {teammates.length > 0 && (
                  <div className="p-1.5 bg-blood-950/70 border border-blood-800/80 rounded-lg text-[11px] text-blood-200 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-blood-400 shrink-0" />
                    <span>Kawanan: <strong>{teammates.map((t) => t.name).join(', ')}</strong></span>
                  </div>
                )}

                {partner && (
                  <div className="p-1.5 bg-pink-950/70 border border-pink-800/80 rounded-lg text-[11px] text-pink-200 flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-pink-400 fill-current shrink-0" />
                    <span>Pasangan: <strong>{partner.name}</strong></span>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(!isFlipped);
                }}
                className="w-full py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tutup / Balikkan Kartu</span>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsRoleModalOpen(false)}
          className="px-6 py-2 bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl hover:text-white"
        >
          Selesai Melihat
        </button>
      </div>
    </div>
  );
};
