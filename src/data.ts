// Exercise structure only; all text lives in src/locales/*.json.
export type Exercise = {
  id: string;
  title: string;
  category: number;
  people: string;
  time: string;
  cards: string;
  face: string;
  description: string;
  mechanic: string;
  page: number;
  adaptation?: string;
};
type Translate = (key: string) => string;
export const categoryIcons = ["person", "pair", "group", "child"];
// minCards: the card count from an exercise's conditions (the upper end of a
// range like "5–7"). A deck limit set in Settings can't go below it.
// Exercises counted per person, per team or using the whole deck have none.
const exerciseMeta: {
  id: string;
  category: number;
  page: number;
  minCards?: number;
}[] = [
  { id: "now", category: 0, page: 49, minCards: 1 },
  { id: "bridge", category: 0, page: 51, minCards: 3 },
  { id: "future", category: 0, page: 53, minCards: 7 },
  { id: "essence", category: 0, page: 55 },
  { id: "challenge", category: 0, page: 57, minCards: 1 },
  { id: "why", category: 0, page: 59, minCards: 5 },
  { id: "dialogue", category: 0, page: 61, minCards: 1 },
  { id: "coffee", category: 1, page: 67 },
  { id: "story", category: 1, page: 69, minCards: 8 },
  { id: "perspective", category: 1, page: 71 },
  { id: "cluster", category: 2, page: 77 },
  { id: "market", category: 2, page: 79 },
  { id: "mime", category: 2, page: 81, minCards: 8 },
  { id: "trust", category: 2, page: 83 },
  { id: "words", category: 2, page: 85 },
  { id: "associations", category: 2, page: 87 },
  { id: "mission", category: 2, page: 89 },
  { id: "detective", category: 3, page: 97, minCards: 6 },
  { id: "draw", category: 3, page: 99 },
  { id: "gift", category: 3, page: 101 },
  { id: "feelings", category: 3, page: 103 },
];
// Adapted variants of base exercises, listed under another category.
const variants = [
  { suffix: "pair", category: 1, ids: exerciseMeta.slice(0, 7).map((m) => m.id) },
  {
    suffix: "group",
    category: 2,
    ids: ["now", "coffee", "story", "perspective", "bridge", "future"],
  },
  {
    suffix: "kids",
    category: 3,
    ids: ["now", "story", "cluster", "mime", "words", "associations", "mission"],
  },
];
export const minCards: Record<string, number> = Object.fromEntries(
  exerciseMeta.flatMap((m) => (m.minCards ? [[m.id, m.minCards]] : [])),
);
export function buildCategories(t: Translate) {
  return categoryIcons.map((icon, i) => ({
    icon,
    title: t(`categories.${i}.title`),
    sub: t(`categories.${i}.sub`),
    text: t(`categories.${i}.text`),
  }));
}
export function buildLibrary(t: Translate) {
  const exercises: Exercise[] = exerciseMeta.map(({ id, category, page }) => ({
    id,
    category,
    page,
    title: t(`exercises.${id}.title`),
    people: t(`exercises.${id}.people`),
    time: t(`exercises.${id}.time`),
    cards: t(`exercises.${id}.cards`),
    face: t(`exercises.${id}.face`),
    description: t(`exercises.${id}.description`),
    mechanic: t(`exercises.${id}.mechanic`),
  }));
  const adaptations = variants.flatMap((v) =>
    exercises
      .filter((e) => v.ids.includes(e.id))
      .map((e) => {
        const own = `variants.${v.suffix}.adaptation.${e.id}`;
        const text = t(own);
        return {
          ...e,
          id: `${e.id}-${v.suffix}`,
          category: v.category,
          people: t(`variants.${v.suffix}.people`),
          adaptation:
            text === own ? t(`variants.${v.suffix}.adaptation.default`) : text,
        };
      }),
  );
  return { exercises, library: [...exercises, ...adaptations] };
}
// Card ids are numbers: each deck owns a block of 1000 (Diarc 1–55,
// Pictus 1001–1036, Yoko 2001–2015), so ids stay stable as decks are added.
const deckDefs = [
  { key: "diarc", title: "Diarc", count: 55, file: (n: number) => `diarc/${n}.jpg` },
  {
    key: "pictus",
    title: "Pictus",
    count: 36,
    file: (n: number) => `pictus/${n}_Pictus.jpg`,
    cover: "pictus/deck_1.jpg",
  },
  { key: "yoko", title: "Yoko", count: 15, file: (n: number) => `yoko/YOKO_1_${n - 1}.jpg` },
];
const base = import.meta.env.BASE_URL;
const deckOf = (id: number) => deckDefs[Math.floor((id - 1) / 1000)] ?? deckDefs[0];
export const cardSrc = (id: number) => base + deckOf(id).file(((id - 1) % 1000) + 1);
export const cardLabel = (id: number) => {
  const i = Math.floor((id - 1) / 1000);
  return i > 0 ? `${deckOf(id).title} ${((id - 1) % 1000) + 1}` : `${id}`;
};
export const decks = deckDefs.map((d, i) => {
  const ids = Array.from({ length: d.count }, (_, n) => i * 1000 + n + 1);
  return {
    key: d.key,
    title: d.title,
    ids,
    cover: d.cover ? base + d.cover : cardSrc(ids[0]),
  };
});
export const deck = decks[0].ids;
export function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
