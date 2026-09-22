import type { Preset } from '../types/balance.js';

export const THEMED_PRESETS: Preset[] = [
  {
    id: 'classic_village',
    name: 'Desa Klasik',
    theme: 'Desa Tradisional',
    description: 'Baseline permainan dengan kompleksitas minimal. Sangat cocok untuk pemain baru dan sesi santai.',
    emphasisCategory: 'investigative',
    suggestedRoles: ['werewolf', 'seer', 'guardian', 'villager'],
  },
  {
    id: 'village_spies',
    name: 'Mata-Mata Desa',
    theme: 'Investigasi & Pengawasan',
    description: 'Fokus pada pencarian informasi dan deduksi logika mendalam.',
    emphasisCategory: 'investigative',
    suggestedRoles: ['werewolf', 'seer', 'mason', 'villager'],
  },
  {
    id: 'mist_of_deception',
    name: 'Kabut Penyamaran',
    theme: 'Informasi Palsu & Manipulasi',
    description: 'Informasi hasil intip tidak bisa dipercaya begitu saja. Melatih social read dan psikologi lawan.',
    emphasisCategory: 'werewolf_deceptive',
    suggestedRoles: ['alpha_wolf', 'werewolf', 'lycan', 'seer', 'villager'],
  },
  {
    id: 'bloody_night',
    name: 'Malam Berdarah',
    theme: 'Kematian Cepat & Agresi Tinggi',
    description: 'Tempo permainan super cepat dengan potensi multi-kill tiap malam.',
    emphasisCategory: 'village_killer',
    suggestedRoles: ['werewolf', 'wolf_cub', 'vigilante', 'hunter', 'seer', 'villager'],
  },
  {
    id: 'village_bonds',
    name: 'Ikatan Desa',
    theme: 'Kepercayaan & Hubungan Pemain',
    description: 'Mengedepankan ikatan asmara dan aliansi kepercayaan antar warga desa.',
    emphasisCategory: 'association',
    suggestedRoles: ['werewolf', 'cupid', 'guardian', 'mason', 'villager'],
  },
  {
    id: 'neutral_chaos',
    name: 'Kekacauan Netral',
    theme: 'Banyak Tujuan Kemenangan',
    description: 'Penuh ketidakpastian dengan hadirnya faksi independen yang memiliki misi kemenangan unik.',
    emphasisCategory: 'neutral_independent',
    suggestedRoles: ['werewolf', 'seer', 'tanner', 'jester', 'serial_killer', 'villager'],
  },
];
