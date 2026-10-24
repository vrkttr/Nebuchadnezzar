import { getZones } from './zoneLoader.js';

export const NPC_INTERACT_RANGE = 4;

const NPC_DEFINITIONS = {
  gildenverwalter: {
    id: 'gildenverwalter',
    name: 'Gildenverwalter',
    color: 0x6a4a3a,
    greeting: 'Allein überlebt man ein paar Wochen. Wer Rückhalt will, gründet eine Gilde oder schließt sich einer an.',
    guild: true,
  },
  waffenhaendler: {
    id: 'waffenhaendler',
    name: 'Waffenhändler',
    color: 0x4a3a30,
    greeting: 'Schau dir die Ware in Ruhe an. Keine Garantie, keine Rückgabe, keine Fragen.',
    vendor: {
      stock: [
        { itemId: 'usp_s', price: 140 },
        { itemId: 'revolver', price: 210 },
        { itemId: 'ak47', price: 280 },
        { itemId: 'shotgun', price: 330 },
        { itemId: 'hunting_rifle', price: 400 },
        { itemId: 'machete', price: 95 },
        { itemId: 'fire_axe', price: 130 },
        { itemId: 'sledgehammer', price: 190 },
        { itemId: 'ammo_9mm', price: 1 },
        { itemId: 'ammo_762', price: 2 },
        { itemId: 'ammo_357', price: 3 },
        { itemId: 'ammo_shell', price: 4 },
        { itemId: 'pocket_knife', price: 55 },
        { itemId: 'hatchet', price: 161 },
        { itemId: 'short_spear', price: 198 },
        { itemId: 'iron_bar', price: 175 },
        { itemId: 'hunting_knife', price: 115 },
        { itemId: 'hockey_stick', price: 221 },
        { itemId: 'felling_axe', price: 435 },
        { itemId: 'club_hammer', price: 345 },
        { itemId: 'makarov', price: 67 },
        { itemId: 'glock_17', price: 145 },
        { itemId: 'cz_75', price: 202 },
        { itemId: 'skorpion', price: 122 },
        { itemId: 'sks', price: 161 },
        { itemId: 'double_barrel', price: 343 },
        { itemId: 'crossbow', price: 228 },
        { itemId: 'ammo_45', price: 3 },
        { itemId: 'ammo_44', price: 5 },
        { itemId: 'ammo_556', price: 3 },
        { itemId: 'ammo_bolt', price: 2 },
      ],
    },
  },
  ruestungshaendler: {
    id: 'ruestungshaendler',
    name: 'Rüstungshändler',
    color: 0x3a4a48,
    greeting: 'Ein Loch in der Jacke ist billiger als ein Loch im Bauch. Such dir etwas aus.',
    vendor: {
      stock: [
        { itemId: 'scrap_helmet', price: 25 },
        { itemId: 'hard_hat', price: 22 },
        { itemId: 'motorcycle_helmet', price: 55 },
        { itemId: 'riot_helmet', price: 65 },
        { itemId: 'gas_mask', price: 160 },
        { itemId: 'work_overall', price: 18 },
        { itemId: 'padded_vest', price: 42 },
        { itemId: 'leather_jacket', price: 70 },
        { itemId: 'kevlar_vest', price: 210 },
        { itemId: 'patched_trousers', price: 19 },
        { itemId: 'work_pants', price: 22 },
        { itemId: 'cargo_pants', price: 80 },
        { itemId: 'military_pants', price: 175 },
        { itemId: 'head_01a', price: 14 },
        { itemId: 'shoulders_01a', price: 14 },
        { itemId: 'chest_01a', price: 30 },
        { itemId: 'hands_01a', price: 7 },
        { itemId: 'belt_01a', price: 7 },
        { itemId: 'legs_01a', price: 23 },
        { itemId: 'feet_01a', price: 14 },
        { itemId: 'head_02a', price: 30 },
        { itemId: 'shoulders_02a', price: 23 },
        { itemId: 'chest_02a', price: 60 },
        { itemId: 'hands_02a', price: 23 },
        { itemId: 'belt_02a', price: 14 },
        { itemId: 'legs_02a', price: 44 },
        { itemId: 'feet_02a', price: 23 },
        { itemId: 'head_03a', price: 44 },
        { itemId: 'shoulders_03a', price: 37 },
        { itemId: 'chest_03a', price: 80 },
        { itemId: 'hands_03a', price: 30 },
        { itemId: 'belt_03a', price: 30 },
        { itemId: 'legs_03a', price: 60 },
        { itemId: 'feet_03a', price: 37 },
      ],
    },
  },
  apotheker: {
    id: 'apotheker',
    name: 'Apotheker',
    color: 0x6a6a5a,
    greeting: 'Verbände, Tabletten, Desinfektionsmittel. Bezahlen kannst du auch später, wenn du dann noch lebst.',
    vendor: {
      stock: [
        { itemId: 'bandage', price: 6 },
        { itemId: 'painkillers', price: 14 },
        { itemId: 'medkit', price: 45 },
      ],
    },
  },
  allgemeinhaendler: {
    id: 'allgemeinhaendler',
    name: 'Allgemeinhändler',
    color: 0x5a4a3a,
    greeting: 'Konserven, Werkzeug, Kleinkram. Wer bei mir nichts findet, braucht es nicht.',
    vendor: {
      stock: [
        { itemId: 'canned_food', price: 8 },
        { itemId: 'duct_tape', price: 9 },
        { itemId: 'battery', price: 12 },
        { itemId: 'scrap_metal', price: 3 },
        { itemId: 'rag_bundle', price: 3 },
        { itemId: 'kitchen_knife', price: 14 },
        { itemId: 'baseball_bat', price: 38 },
        { itemId: 'bag_pouch', price: 40 },
        { itemId: 'bag_satchel', price: 90 },
        { itemId: 'bag_rucksack', price: 220 },
        { itemId: 'bag_duffel', price: 480 },
      ],
    },
  },
  barbier: {
    id: 'barbier',
    name: 'Barbier',
    color: 0x5a3a3a,
    greeting: 'Setz dich. Eine neue Frisur macht aus einem Verlierer keinen Gewinner, aber man sieht dem Tod besser ins Gesicht.',
    barber: true,
  },
  schmied: {
    id: 'schmied',
    name: 'Schmied',
    color: 0x4a3a2e,
    greeting: 'Gib mir deine Waffe und ein paar Münzen. Ich schlage ihr etwas ein, das kein Händler verkaufen kann. Gefällt dir das Ergebnis nicht, schmieden wir sie neu.',
    smith: true,
  },
  gastwirt: {
    id: 'gastwirt',
    name: 'Gastwirt',
    color: 0x6a4a34,
    greeting: 'Setz dich, ruh dich aus. Wenn du bei mir Rast machst, findet dich dein Heimstein von überall wieder hierher.',
    inn: true,
    vendor: {
      stock: [
        { itemId: 'hearthstone', price: 20 },
        { itemId: 'canned_food', price: 8 },
        { itemId: 'bandage', price: 6 },
      ],
    },
  },
  greta: {
    id: 'greta',
    name: 'Greta',
    color: 0x5a4a5a,
    greeting: 'Wenn du Zeit hast, wenn du jemanden suchen kannst, der nicht zurückgekommen ist ... Entschuldige. Ich weiß nicht, wen ich sonst fragen soll.',
  },
  kolja: {
    id: 'kolja',
    name: 'Kolja',
    color: 0x4a4a3a,
    greeting: 'Was willst du? Ich habe zu tun.',
  },
  hubert: {
    id: 'hubert',
    name: 'Hubert',
    color: 0x5a5a3a,
    greeting: 'Wenn es um das Beet geht: Es gehört mir. Alles andere geht dich nichts an.',
  },
  baron: {
    id: 'baron',
    name: 'Baron',
    color: 0x4a3428,
    greeting: 'Was starrst du? Ich beiße nicht. Meistens nicht.',
  },
  annelie: {
    id: 'annelie',
    name: 'Annelie',
    color: 0x6a5a4a,
    greeting: 'Bitte nicht so laut. Wer bist du?',
  },
  tamara: {
    id: 'tamara',
    name: 'Tamara',
    color: 0x8a3a30,
    greeting: 'Leise! Sie hören alles hier unten. Wer hat dich geschickt?',
  },
  pumpenwart: {
    id: 'pumpenwart',
    name: 'Pumpenwart',
    color: 0x3a4a5a,
    greeting: 'Solange der Turm Wasser hält, hält die Siedlung. Ich sorge dafür, dass das so bleibt. Und bete, dass nichts kaputtgeht.',
  },
  jaeger: {
    id: 'jaeger',
    name: 'Ruprecht',
    color: 0x4a5a34,
    greeting: 'Leise. Was du hier hörst, ist selten der Wind. Wenn du Wild jagen oder etwas Größeres loswerden willst, bist du bei mir richtig.',
  },
  karawanenfuehrerin: {
    id: 'karawanenfuehrerin',
    name: 'Isolde',
    color: 0x6a4a3a,
    greeting: 'Wenn du etwas transportiert haben willst, kommst du zu spät. Wenn du dir einen Namen machen willst, kommst du genau richtig.',
  },
  funkerin: {
    id: 'funkerin',
    name: 'Funkerin',
    color: 0x5a3a4a,
    greeting: 'Psst. Hörst du das Rauschen? Dazwischen verstecken sich Stimmen. Man muss nur wissen, wann man zuhört und wann nicht.',
  },
  kanalwaerter: {
    id: 'kanalwaerter',
    name: 'Kanalwärter',
    color: 0x3a3a34,
    greeting:
      'Siehst du den Deckel dort? Die Tore sind bewacht, die Zäune hoch, aber unter der Erde läuft ein Weg, der auf keiner Karte steht. Wer wirklich raus will aus Sektor 7, geht nicht durchs Tor. Nimm Licht mit, eine Waffe und gute Nerven. Die Ratten sind das kleinste Problem.',
  },
  streuner: {
    id: 'streuner',
    name: 'Streuner',
    color: 0x5a5240,
    greeting: 'Bleib in Deckung, Fremder. Draußen im Ödland überlebt nicht jeder die Nacht.',
  },
  haendler: {
    id: 'haendler',
    name: 'Schrotthändler',
    color: 0x4a5a3a,
    greeting: 'Metall, Stoff, Konserven – ich nehme alles, was noch einen Wert hat.',
    vendor: {
      stock: [
        { itemId: 'canned_food', price: 8 },
        { itemId: 'duct_tape', price: 9 },
        { itemId: 'bandage', price: 6 },
        { itemId: 'painkillers', price: 14 },
        { itemId: 'medkit', price: 45 },
        { itemId: 'ammo_357', price: 3 },
        { itemId: 'ammo_shell', price: 4 },
        { itemId: 'kitchen_knife', price: 14 },
        { itemId: 'baseball_bat', price: 38 },
        { itemId: 'work_overall', price: 18 },
        { itemId: 'work_pants', price: 24 },
        { itemId: 'hard_hat', price: 26 },
        { itemId: 'revolver', price: 210 },
        { itemId: 'ammo_9mm', price: 1 },
        { itemId: 'ammo_762', price: 2 },
        { itemId: 'patched_trousers', price: 25 },
        { itemId: 'scrap_helmet', price: 30 },
        { itemId: 'rusty_pipe', price: 40 },
        { itemId: 'padded_vest', price: 60 },
      ],
    },
  },
};

const NPCS_BY_ZONE = new Map();

for (const zone of getZones()) {
  const placed = {};
  for (const placement of zone.npcs) {
    const definition = NPC_DEFINITIONS[placement.npcId];
    if (!definition) throw new Error(`Zonendatei: Unbekannte npcId "${placement.npcId}".`);
    placed[definition.id] = { ...definition, x: placement.x, y: 0, z: placement.z, rotationY: placement.rotationY };
  }
  NPCS_BY_ZONE.set(zone.id, placed);
}

export function getNpcsOfZone(zoneId) {
  return Object.values(NPCS_BY_ZONE.get(zoneId) ?? {});
}

export function getNpc(npcId, zoneId) {
  const placed = NPCS_BY_ZONE.get(zoneId);
  return placed && typeof npcId === 'string' && Object.hasOwn(placed, npcId) ? placed[npcId] : null;
}

export function getNpcDefinition(npcId) {
  return typeof npcId === 'string' && Object.hasOwn(NPC_DEFINITIONS, npcId) ? NPC_DEFINITIONS[npcId] : null;
}

export function serializeNpcs(zoneId) {
  return getNpcsOfZone(zoneId).map((npc) => ({
    id: npc.id,
    name: npc.name,
    x: npc.x,
    y: npc.y,
    z: npc.z,
    rotationY: npc.rotationY,
    color: npc.color,
  }));
}
