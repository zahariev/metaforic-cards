import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useParams,
  useNavigate,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import {
  Home,
  Layers,
  BookOpen,
  NotebookPen,
  ArrowLeft,
  ArrowRight,
  Search,
  Users,
  User,
  Heart,
  Expand,
  Shuffle,
  Check,
  Leaf,
  Clock,
  X,
  Download,
  Plus,
  PersonStanding,
  Send,
  Save,
  Trash2,
  Upload,
  Settings,
} from "lucide-react";
import {
  deck,
  decks,
  minCards,
  cardSrc,
  cardLabel,
  shuffle,
  type Exercise,
} from "./data";
import {
  I18nProvider,
  LanguageSwitcher,
  answerLabel,
  translate,
  translateList,
  useI18n,
  useLibrary,
} from "./i18n";
import "./style.css";
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
function read<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "null");
    if (v === null) return fallback;
    // Fill in fields added since the value was stored.
    return isObject(fallback) && isObject(v) ? { ...fallback, ...v } : v;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
    return true;
  } catch (e) {
    console.warn("Could not save " + key, e);
    return false;
  }
}
function useLocal<T>(key: string, initial: T, stale?: (v: T) => boolean) {
  const [v, set] = useState<T>(() => {
    const stored = read(key, initial);
    return stale?.(stored) ? initial : stored;
  });
  useEffect(() => {
    write(key, v);
  }, [key, v]);
  return [v, set] as const;
}
type Session = { id: string; exercise: string; date: string; data: State };
type State = {
  stage: number;
  topic: string;
  selected: number[];
  answers: Record<string, string>;
  pool: number[];
  winners: number[];
  round: number;
  positions: Record<string, { x: number; y: number }>;
  people: number;
  turn: number;
  lines: string[];
  hands: number[][];
  words: string[];
  secret: number;
  guesses: number[];
  revealed: boolean;
  order: number[];
  timer: number;
  strokes: { color: string; width?: number; points: number[][] }[];
  // Set once the exercise is saved to the notes; the next visit starts fresh.
  done?: boolean;
  // The cards this run of the exercise plays with (deck, possibly limited).
  cards?: number[];
};
// The dialogue's default first line, in any language, doesn't count as started.
const FIRST_LINES = (["bg", "en"] as const).map((l) =>
  translate(l, "ex.dialogue.firstLine"),
);
// Choosing the first card alone doesn't count; writing or moving past the first step does.
function started(d: State, base: string) {
  return (
    d.stage > (base === "dialogue" ? 1 : 0) ||
    !!d.topic.trim() ||
    Object.values(d.answers).some((v) => v?.trim()) ||
    d.lines.some((l, i) => l.trim() && !(i === 0 && FIRST_LINES.includes(l))) ||
    d.words.some((w) => w?.trim()) ||
    d.strokes.length > 0 ||
    Object.keys(d.positions).length > 0
  );
}
// Which deck each exercise draws from, chosen in Settings. Defaults to Diarc.
type DeckChoice = Record<string, string>;
const DECK_CHOICE = "mc-exercise-decks";
const deckFor = (choice: DeckChoice, base: string) =>
  decks.find((d) => d.key === choice[base]) ?? decks[0];
// Optional per-exercise card limit: a random subset of that size from the
// deck, never smaller than the number of cards the exercise needs.
type CardLimits = Record<string, number>;
const CARD_LIMITS = "mc-exercise-limits";
const exerciseCards = (id: string) => {
  const base = id.split("-")[0];
  const ids = deckFor(read<DeckChoice>(DECK_CHOICE, {}), base).ids;
  const limit = read<CardLimits>(CARD_LIMITS, {})[base];
  const n = limit && Math.max(limit, minCards[base] ?? 1);
  return n > 0 && n < ids.length
    ? shuffle(ids)
        .slice(0, n)
        .sort((a, b) => a - b)
    : ids;
};
const initial = (cards = deck): State => ({
  stage: 0,
  topic: "",
  selected: [],
  answers: {},
  pool: shuffle(cards),
  cards,
  winners: [],
  round: 1,
  positions: {},
  people: 6,
  turn: 0,
  lines: [],
  hands: [],
  words: [],
  secret: 0,
  guesses: [],
  revealed: false,
  order: [],
  timer: 0,
  strokes: [],
});
function Card({
  id,
  hidden = false,
  selected = false,
  onClick,
  large = false,
}: {
  id: number;
  hidden?: boolean;
  selected?: boolean;
  onClick?: () => void;
  large?: boolean;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={`card ${hidden ? "back" : ""} ${selected ? "selected" : ""} ${large ? "large" : ""}`}
      onClick={onClick}
      aria-label={hidden ? t("card.drawHidden") : t("card.label", { name: cardLabel(id) })}
    >
      {hidden ? (
        <>
          <Leaf size={40} />
          <span>{t("card.back")}</span>
        </>
      ) : (
        <img
          src={cardSrc(id)}
          alt={t("card.alt", { name: cardLabel(id) })}
          draggable={false}
        />
      )}
    </button>
  );
}
function App() {
  const { t } = useI18n();
  const [inspect, setInspect] = useState(0);
  const [coverOpen, setCoverOpen] = useState(false);
  useEffect(() => {
    if (!coverOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCoverOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [coverOpen]);
  const [favorites, setFavorites] = useLocal<number[]>("mc-favorites", []);
  return (
    <HashRouter>
      <div className="app">
        <aside>
          <Link className="brand" to="/">
            <img
              className="brand-logo"
              src={`${import.meta.env.BASE_URL}logo-256.png`}
              alt=""
            />
            <span>
              {t("brand.line1")}
              <b>{t("brand.line2")}</b>
            </span>
          </Link>
          <nav>
            {[
              ["/", t("nav.home"), Home],
              ["/exercises", t("nav.exercises"), BookOpen],
              ["/deck", t("nav.deck"), Layers],
              ["/notes", t("nav.notes"), NotebookPen],
              ["/favorites", t("nav.favorites"), Heart],
              ["/settings", t("nav.settings"), Settings],
            ].map(([path, label, Icon]) => (
              <NavLink key={String(path)} to={String(path)} end={path === "/"} className={({isActive})=>isActive?"active":""}>
                {React.createElement(Icon as typeof Home, { size: 18 })}
                {String(label)}
              </NavLink>
            ))}
          </nav>
          <LanguageSwitcher />
          <div className="aside-bottom">
            <button
              type="button"
              className="book-cover"
              onClick={() => setCoverOpen(true)}
              aria-label={t("brand.coverOpen")}
            >
              <img
                src={`${import.meta.env.BASE_URL}book-cover.jpg`}
                alt={t("brand.coverAlt")}
              />
            </button>
            <p>
              {t("brand.tagline1")}
              <br />
              {t("brand.tagline2")}
            </p>
            <small>{t("brand.book")}</small>
          </div>
        </aside>
        <main>
          <Routes>
            <Route path="/" element={<Library home />} />
            <Route path="/exercises" element={<Library />} />
            <Route path="/deck" element={<Deck inspect={setInspect} />} />
            <Route
              path="/favorites"
              element={<Deck inspect={setInspect} ids={favorites} />}
            />
            <Route path="/notes" element={<Notes />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/exercise/:id"
              element={
                <Workspace key={location.pathname} inspect={setInspect} />
              }
            />
          </Routes>
        </main>
      </div>
      {inspect > 0 && (
        <div className="overlay" onClick={() => setInspect(0)}>
          <div className="inspection" onClick={(e) => e.stopPropagation()}>
            <button
              className="close"
              onClick={() => setInspect(0)}
              aria-label={t("common.close")}
            >
              <X />
            </button>
            <img src={cardSrc(inspect)} alt={t("card.label", { name: cardLabel(inspect) })} />
            <button
              className="secondary"
              onClick={() =>
                setFavorites(
                  favorites.includes(inspect)
                    ? favorites.filter((x) => x !== inspect)
                    : [...favorites, inspect],
                )
              }
            >
              <Heart
                size={17}
                fill={favorites.includes(inspect) ? "currentColor" : "none"}
              />{" "}
              {favorites.includes(inspect)
                ? t("inspect.removeFavorite")
                : t("inspect.addFavorite")}
            </button>
          </div>
        </div>
      )}
      {coverOpen && (
        <div className="overlay" onClick={() => setCoverOpen(false)}>
          <div className="inspection" onClick={(e) => e.stopPropagation()}>
            <button
              className="close"
              onClick={() => setCoverOpen(false)}
              aria-label={t("common.close")}
            >
              <X />
            </button>
            <img
              src={`${import.meta.env.BASE_URL}book-cover-large.jpg`}
              alt={t("brand.coverAlt")}
            />
          </div>
        </div>
      )}
    </HashRouter>
  );
}
// The search text outlives the list so it is still there after an exercise.
let lastQuery = "";
function Library({ home = false }: { home?: boolean }) {
  const { t } = useI18n();
  const { lang, categories, library } = useLibrary();
  const location = useLocation();
  const navType = useNavigationType();
  // Coming back from an exercise (its back link or the browser's) keeps the
  // filters as they were.
  const from = (location.state as { from?: string } | null)?.from;
  const returning = !!from || navType === "POP";
  const [cat, setCat] = useLocal("mc-filter-category", -1);
  const [q, setQ] = useState(() => (returning ? lastQuery : ""));
  useEffect(() => {
    lastQuery = q;
  }, [q]);
  const [adapt, setAdapt] = useLocal("mc-filter-adapt", false);
  const cardsRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrolledPast, setScrolledPast] = useState(false);
  useEffect(() => {
    const el = cardsRef.current;
    if (!el) return;
    // The top margin matches the tabs bar, which covers that strip once shown.
    const io = new IntersectionObserver(
      ([e]) => setScrolledPast(!e.isIntersecting && e.boundingClientRect.top < 0),
      { rootMargin: "-90px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // The exercises page opens on the full, unfiltered list, scrolled down as
  // when a category is picked; home always starts at the top. Returning from
  // an exercise lands straight on the list, with the floating tabs showing,
  // and its tile in view.
  useEffect(() => {
    if (from) {
      listRef.current?.scrollIntoView();
      document.querySelector(`[data-exercise="${from}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (home) window.scrollTo({ top: 0, behavior: "smooth" });
    else {
      if (!returning) setCat(-1);
      listRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [home]);
  const pick = (i: number) => {
    setCat(cat === i ? -1 : i);
    if (cat !== i) listRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const count = (i: number) =>
    library.filter((e) => e.category === i && !e.adaptation).length;
  // Exercises with a saved draft that hasn't been finished yet.
  const [unfinished] = useState(
    () =>
      new Set(
        library
          .filter((e) => {
            const d = read<State | null>("mc-draft-" + e.id, null);
            return !!d && !d.done && started({ ...initial(), ...d }, e.id.split("-")[0]);
          })
          .map((e) => e.id),
      ),
  );
  const shown = library.filter(
    (e) =>
      (cat < 0 || e.category === cat) &&
      (adapt || !e.adaptation) &&
      e.title.toLocaleLowerCase(lang).includes(q.toLocaleLowerCase(lang)),
  );
  return (
    <div className="library">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("library.eyebrow")}</p>
          <h1>{home ? t("library.homeTitle") : t("library.title")}</h1>
          <p>
            {home
              ? t("library.homeIntro")
              : t("library.intro")}
          </p>
        </div>
        <label className="search">
          <Search size={17} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("library.search")}
          />
        </label>
      </div>
      <div className={`tabs-bar ${scrolledPast ? "visible" : ""}`}>
        <div className="categories tabs">
          {categories.map((c, i) => (
            <button
              className={`category c${i} ${cat === i ? "active" : ""}`}
              key={c.title}
              onClick={() => pick(i)}
              tabIndex={scrolledPast ? 0 : -1}
            >
              {React.createElement([User, Users, GroupIcon, PersonStanding][i])}
              <h2>{c.title}</h2>
              <em className="tab-count">{count(i)}</em>
            </button>
          ))}
        </div>
      </div>
      <div className="categories" ref={cardsRef}>
        {categories.map((c, i) => (
          <button
            className={`category c${i} ${cat === i ? "active" : ""}`}
            key={c.title}
            onClick={() => pick(i)}
          >
            {React.createElement([User, Users, GroupIcon, PersonStanding][i])}
            <h2>{c.title}</h2>
            <p>{c.text}</p>
            <span>
              {t("library.browse", { count: count(i) })} <ArrowRight size={15} />
            </span>
            <Leaf className="decoration" />
          </button>
        ))}
      </div>
      <div className="quote">{t("library.quote")}</div>
      <div className="list-heading" ref={listRef}>
        <h2>{cat < 0 ? t("library.choose") : categories[cat].title}</h2>
        {cat >= 0 && (
          <button className="text-button" onClick={() => setCat(-1)}>
            <X size={13} /> {t("library.all")}
          </button>
        )}
        <label className="toggle">
          <input
            type="checkbox"
            checked={adapt}
            onChange={(e) => setAdapt(e.target.checked)}
          />{" "}
          {t("library.includeAdaptations")}
        </label>
        <span>{t("library.shown", { count: shown.length })}</span>
      </div>
      <div className={`exercise-list ${cat < 0 ? "" : "filtered"}`}>
        {shown.map((e, i) => (
          <Link
            className="exercise-tile"
            to={`/exercise/${e.id}`}
            state={{ back: home ? "/" : "/exercises" }}
            data-exercise={e.id}
            key={e.id}
          >
            <div className="tile-image">
              <img
                src={cardSrc([3, 17, 29, 8, 44, 21, 12][i % 7])}
                alt=""
              />
              {/* The category is already clear from the active filter. */}
              {(cat < 0 || e.adaptation) && (
                <span className={`tag c${e.category}`}>
                  {e.adaptation ? t("library.adaptation") : categories[e.category].title}
                </span>
              )}
              {unfinished.has(e.id) && (
                <span className="unfinished-badge">
                  <NotebookPen size={12} /> {t("library.unfinished")}
                </span>
              )}
            </div>
            <div className="tile-copy">
              <small>{e.mechanic}</small>
              <h3>{e.title}</h3>
              <p>{e.description}</p>
              <div className="metadata">
                <span>
                  <Users size={13} />
                  {e.people}
                </span>
                <span>
                  <Clock size={13} />
                  {e.time}
                </span>
                <span>{e.cards}</span>
              </div>
              <div className="tile-bottom">
                <span>{t("library.faceCards", { face: e.face })}</span>
                <ArrowRight size={19} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!shown.length && <p>{t("library.empty")}</p>}
      <footer>
        {t("library.footer")}
        <div className="copyright">
          {t("common.copyright", { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}
function GroupIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="7" r="3.2" />
      <circle cx="4.8" cy="9" r="2.5" />
      <circle cx="19.2" cy="9" r="2.5" />
      <path d="M6 20.5a6 6 0 0 1 12 0z" />
      <path d="M.5 19.5a4.4 4.4 0 0 1 6.8-3.7A7.4 7.4 0 0 0 5 19.5z" />
      <path d="M23.5 19.5a4.4 4.4 0 0 0-6.8-3.7 7.4 7.4 0 0 1 2.3 3.7z" />
    </svg>
  );
}
function Deck({
  inspect,
  ids,
}: {
  inspect: (id: number) => void;
  ids?: number[];
}) {
  // Called before the early return: /deck and /favorites share this component instance.
  const { t } = useI18n();
  const [tab, setTab] = useLocal("mc-deck-tab", 0, (v) => !decks[v]);
  if (ids) {
    return (
      <div className="library">
        <p className="eyebrow">{t("deck.eyebrow")}</p>
        <h1>{t("deck.favoritesTitle")}</h1>
        <p>
          {t("deck.intro", { count: ids.length })}
        </p>
        <div className="spread deck-spread">
          {ids.map((id) => (
            <Card key={id} id={id} onClick={() => inspect(id)} />
          ))}
        </div>
        {!ids.length && (
          <p>{t("deck.favoritesEmpty")}</p>
        )}
      </div>
    );
  }
  const current = decks[tab];
  return (
    <div className="library">
      <p className="eyebrow">{t("deck.eyebrow")}</p>
      <h1>{t("deck.title")}</h1>
      <p>
        {t("deck.intro", { count: current.ids.length })}
      </p>
      <div className="categories tabs deck-tabs" role="tablist">
        {decks.map((d, i) => (
          <button
            key={d.title}
            role="tab"
            aria-selected={tab === i}
            className={`category c${i} ${tab === i ? "active" : ""}`}
            onClick={() => setTab(i)}
          >
            <img src={d.cover} alt="" />
            <h2>{d.title}</h2>
            <em className="tab-count">{d.ids.length}</em>
          </button>
        ))}
      </div>
      <div className="spread deck-spread" role="tabpanel">
        {current.ids.map((id) => (
          <Card key={id} id={id} onClick={() => inspect(id)} />
        ))}
      </div>
    </div>
  );
}
function Notes() {
  const { t } = useI18n();
  const { lang, library } = useLibrary();
  const [sessions, setSessions] = useLocal<Session[]>("mc-notes", []);
  const [open, setOpen] = useState("");
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(sessions, null, 2)], {
        type: "application/json",
      }),
    );
    a.download = "metaforichni-zapiski.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="library">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("notes.eyebrow")}</p>
          <h1>{t("notes.title")}</h1>
          <p>{t("notes.intro")}</p>
        </div>
        <button
          className="secondary"
          disabled={!sessions.length}
          onClick={download}
        >
          <Download size={17} /> {t("notes.export")}
        </button>
      </div>
      {sessions.length === 0 ? (
        <div className="empty">
          <NotebookPen size={40} />
          <h2>{t("notes.emptyTitle")}</h2>
          <p>{t("notes.emptyText")}</p>
          <Link className="primary" to="/exercises">
            {t("notes.toExercises")} <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        sessions.map((s) => (
          <article className="note" key={s.id}>
            <button
              className="note-heading"
              onClick={() => setOpen(open === s.id ? "" : s.id)}
            >
              <div>
                <h2>{library.find((e) => e.id === s.exercise)?.title}</h2>
                <p>
                  {new Date(s.date).toLocaleString(lang)} · {s.data.topic}
                </p>
              </div>
              <span>{open === s.id ? "−" : "+"}</span>
            </button>
            {open === s.id && (
              <>
                <div className="row">
                  {s.data.selected.map((id, i) => (
                    <Card id={id} key={i} />
                  ))}
                </div>
                {Object.entries(s.data.answers)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <p key={k}>
                      <b>{answerLabel(lang, k)}</b>
                      <br />
                      {v}
                    </p>
                  ))}
                {s.data.lines.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
                {s.data.strokes.length > 0 && (
                  <p>{t("notes.drawingIncluded")}</p>
                )}
                <button
                  className="secondary"
                  onClick={() => {
                    write("mc-draft-" + s.exercise, s.data);
                    location.hash = "/exercise/" + s.exercise;
                  }}
                >
                  {t("notes.open")}
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    if (confirm(t("notes.confirmDelete")))
                      setSessions(sessions.filter((n) => n.id !== s.id));
                  }}
                >
                  {t("notes.delete")}
                </button>
              </>
            )}
          </article>
        ))
      )}
    </div>
  );
}
function storedKeys() {
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith("mc-"));
  } catch {
    return [];
  }
}
function DeckSettings() {
  const { t } = useI18n();
  const { categories, exercises } = useLibrary();
  const [choice, setChoice] = useLocal<DeckChoice>(DECK_CHOICE, {});
  const [limits, setLimits] = useLocal<CardLimits>(CARD_LIMITS, {});
  const setLimit = (base: string, value: string) =>
    setLimits(({ [base]: _, ...rest }) => {
      const n = Math.floor(Number(value));
      return n > 0 ? { ...rest, [base]: n } : rest;
    });
  // Grouped by category and numbered within it: 1.1, 1.2, … 2.1, …
  const numbered = categories.flatMap((_, c) =>
    exercises
      .filter((e) => e.category === c)
      .map((e, i) => ({ e, num: `${c + 1}.${i + 1}` })),
  );
  const setAll = (key: string) =>
    setChoice(Object.fromEntries(exercises.map((e) => [e.id, key])));
  return (
    <section className="settings-card">
      <h2>{t("settings.decksTitle")}</h2>
      <p>
        {t("settings.decksIntro")}
      </p>
      <div className="row deck-all">
        <span>{t("settings.forAll")}</span>
        {decks.map((d) => (
          <button key={d.key} className="secondary" onClick={() => setAll(d.key)}>
            {d.title}
          </button>
        ))}
      </div>
      <ul className="deck-bindings">
        {numbered.map(({ e, num }) => {
          const current = deckFor(choice, e.id);
          const limit = limits[e.id];
          return (
            <li key={e.id}>
              <span>
                <b>{num}</b>
                {e.title}
              </span>
              <div className="deck-toggles" role="radiogroup" aria-label={e.title}>
                {decks.map((d) => (
                  <button
                    key={d.key}
                    role="radio"
                    aria-checked={d === current}
                    className={d === current ? "on" : ""}
                    onClick={() => setChoice((c) => ({ ...c, [e.id]: d.key }))}
                  >
                    <img src={d.cover} alt="" />
                    {d.title}
                  </button>
                ))}
              </div>
              <label className="card-limit">
                <input
                  type="number"
                  min={minCards[e.id] ?? 1}
                  max={current.ids.length}
                  value={limit ?? ""}
                  placeholder={String(current.ids.length)}
                  onChange={(ev) => setLimit(e.id, ev.target.value)}
                  aria-label={t("settings.cardCountFor", { title: e.title })}
                />
                {t("settings.cards")}
                {/* Always rendered so the column lines up across rows. */}
                <small>
                  {minCards[e.id] > 1 &&
                    t("settings.minCards", { n: minCards[e.id] })}
                </small>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="hint">
        {t("settings.limitHint")}
      </p>
    </section>
  );
}
function SettingsPage() {
  const { t } = useI18n();
  const keys = storedKeys();
  const notes = read<Session[]>("mc-notes", []).length;
  const favorites = read<number[]>("mc-favorites", []).length;
  const drafts = keys.filter((k) => {
    if (!k.startsWith("mc-draft-")) return false;
    const d = read<Partial<State>>(k, {});
    return (d.stage ?? 0) > 0 || (d.selected?.length ?? 0) > 0 || !!d.topic;
  }).length;
  const backup = () => {
    const data = Object.fromEntries(keys.map((k) => [k, read(k, null)]));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    a.download = `metaforichni-karti-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const restore = async (file: File) => {
    try {
      const data: unknown = JSON.parse(await file.text());
      const entries = isObject(data)
        ? Object.entries(data).filter(([k]) => k.startsWith("mc-"))
        : [];
      if (!entries.length) throw new Error("empty backup");
      if (
        !confirm(
          t("settings.confirmRestore", { count: entries.length }),
        )
      )
        return;
      if (!entries.every(([k, v]) => write(k, v)))
        alert(t("settings.restorePartial"));
      location.reload();
    } catch {
      alert(t("settings.restoreInvalid"));
    }
  };
  const wipe = () => {
    if (
      !confirm(
        t("settings.confirmWipe"),
      )
    )
      return;
    keys.forEach((k) => localStorage.removeItem(k));
    location.reload();
  };
  return (
    <div className="library settings">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("settings.eyebrow")}</p>
          <h1>{t("settings.title")}</h1>
          <p>
            {t("settings.intro")}
          </p>
        </div>
      </div>
      <DeckSettings />
      <section className="settings-card">
        <h2>{t("settings.dataTitle")}</h2>
        <div className="stats">
          <div>
            <b>{notes}</b>
            <span>{t("settings.statNotes", { count: notes })}</span>
          </div>
          <div>
            <b>{favorites}</b>
            <span>{t("settings.statFavorites", { count: favorites })}</span>
          </div>
          <div>
            <b>{drafts}</b>
            <span>{t("settings.statDrafts", { count: drafts })}</span>
          </div>
        </div>
        <div className="row">
          <button className="primary" onClick={backup}>
            <Download size={16} /> {t("settings.backup")}
          </button>
          <label className="secondary">
            <Upload size={16} /> {t("settings.restore")}
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) restore(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p className="hint">
          {t("settings.backupHint")}
        </p>
      </section>
      <section className="settings-card">
        <h2>{t("settings.wipeTitle")}</h2>
        <p>
          {t("settings.wipeText")}
        </p>
        <button className="secondary danger" onClick={wipe}>
          <Trash2 size={16} /> {t("settings.wipe")}
        </button>
      </section>
    </div>
  );
}
function Workspace({ inspect }: { inspect: (id: number) => void }) {
  const { id = "now" } = useParams();
  const { t } = useI18n();
  const { library } = useLibrary();
  const ex = library.find((e) => e.id === id);
  return ex ? (
    <ExerciseWorkspace key={id} ex={ex} inspect={inspect} />
  ) : (
    <div className="library">
      <h1>{t("workspace404.title")}</h1>
      <Link to="/exercises">{t("workspace404.back")}</Link>
    </div>
  );
}
function ExerciseWorkspace({
  ex,
  inspect,
}: {
  ex: Exercise;
  inspect: (id: number) => void;
}) {
  const { t, tList, lang } = useI18n();
  const location = useLocation();
  const base = ex.id.split("-")[0];
  const [fresh] = useState(() => exerciseCards(ex.id));
  // With the deck limited to no more cards than the exercise needs, there is
  // nothing to choose: all of them start selected and the pick step is skipped.
  const autoPick = (c: number[]) =>
    base === "future" && ex.category === 0 && c.length <= minCards.future;
  const start = (c: number[]): State =>
    autoPick(c) ? { ...initial(c), selected: c } : initial(c);
  const key = "mc-draft-" + ex.id;
  const [resumed, setResumed] = useState(() => {
    const d = read<State>(key, start(fresh));
    return !d.done && started(d, base);
  });
  // Saved or not-yet-started drafts reopen at the first step: choosing a card.
  const [s, set] = useLocal<State>(
    key,
    start(fresh),
    (d) => !!d.done || !started(d, base),
  );
  // A resumed draft keeps the cards it started with.
  const cards = s.cards ?? fresh;
  const [saved, setSaved] = useState(false);
  const [choice, setChoice] = useState(0);
  const [draftLine, setDraftLine] = useState("");
  const update = (v: Partial<State>) => set((p) => ({ ...p, ...v }));
  const answer = (key: string, v: string) =>
    set((p) => ({ ...p, answers: { ...p.answers, [key]: v } }));
  const field = (
    key: string,
    label: string,
    placeholder = t("common.writeThoughts"),
  ) => (
    <label className="field">
      {label}
      <textarea
        value={s.answers[key] || ""}
        onChange={(e) => answer(key, e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
  const next = (
    label = t("common.continue"),
    disabled = false,
    fn?: () => void,
  ) => (
    <button
      className="primary"
      disabled={disabled}
      onClick={fn || (() => update({ stage: s.stage + 1 }))}
    >
      {label}
      <ArrowRight size={16} />
    </button>
  );
  const save = () => {
    const notes = read<Session[]>("mc-notes", []);
    const ok = write("mc-notes", [
      {
        id: crypto.randomUUID(),
        exercise: ex.id,
        date: new Date().toISOString(),
        data: s,
      },
      ...notes,
    ]);
    if (ok) update({ done: true });
    if (!ok) {
      alert(t("workspace.saveFailed"));
      return;
    }
    setSaved(true);
  };
  const finish = () => (
    <div className="finish">
      <p>{t("workspace.finish.prompt")}</p>
      {field("Финален_размисъл", t("workspace.finish.question"))}
      <button className="primary" onClick={save} disabled={saved}>
        <Check size={17} />
        {saved ? t("workspace.finish.saved") : t("workspace.finish.save")}
      </button>
      {saved && (
        <Link className="secondary" to="/notes">
          {t("workspace.finish.viewNotes")}
        </Link>
      )}
    </div>
  );
  const choose = (
    count = 1,
    hidden = false,
    custom?: (id: number) => void,
    ids = hidden ? s.pool : cards,
  ) => (
    <>
      <div className="spread">
        {ids.map((id) => (
          <Card
            key={id}
            id={id}
            hidden={hidden}
            selected={s.selected.includes(id)}
            onClick={() => {
              if (custom) {
                custom(id);
                return;
              }
              if (hidden) {
                update({
                  selected: [...s.selected, id],
                  pool: s.pool.filter((c) => c !== id),
                });
                return;
              }
              update({
                selected: s.selected.includes(id)
                  ? s.selected.filter((c) => c !== id)
                  : s.selected.length < count
                    ? [...s.selected, id]
                    : count === 1
                      ? [id]
                      : s.selected,
              });
            }}
          />
        ))}
      </div>
      <p className="hint">
        {hidden
          ? t("workspace.drawNoRepeat")
          : t("workspace.chooseHint", {
              picked: s.selected.length,
              total: count,
            })}
      </p>
    </>
  );
  const selected = () => (
    <div className="row">
      {s.selected.map((id, i) => (
        <div className="card-wrap" key={i}>
          <Card id={id} large onClick={() => inspect(id)} />
          <button className="inspect" onClick={() => inspect(id)}>
            <Expand size={14} /> {t("common.inspect")}
          </button>
        </div>
      ))}
    </div>
  );
  const topic = () => (
    <label className="field">
      {t("workspace.topic.label")}
      <input
        value={s.topic}
        onChange={(e) => update({ topic: e.target.value })}
        placeholder={t("workspace.topic.placeholder")}
      />
    </label>
  );
  const people = () => (
    <label className="field">
      {t("workspace.people")}
      <input
        type="number"
        min={
          base === "associations"
            ? 4
            : base === "cluster" || base === "market" || base === "mission"
              ? 6
              : base === "trust"
                ? 5
                : 3
        }
        max={base === "market" ? 18 : base === "associations" ? 8 : 20}
        value={s.people}
        onChange={(e) =>
          update({
            people: Math.max(
              base === "associations"
                ? 4
                : base === "cluster" || base === "market" || base === "mission"
                  ? 6
                  : base === "trust"
                    ? 5
                    : 3,
              Math.min(
                base === "market" ? 18 : base === "associations" ? 8 : 20,
                Number(e.target.value) || 3,
              ),
            ),
          })
        }
      />
    </label>
  );
  const deal = (n: number) => {
    const pool = shuffle(cards);
    const hands = Array.from({ length: s.people }, (_, i) =>
      pool.slice(i * n, (i + 1) * n),
    );
    update({
      hands,
      pool: pool.slice(s.people * n),
      selected: hands.flat(),
      stage: 1,
      order: shuffle(Array.from({ length: s.people }, (_, i) => i)),
    });
  };
  let content: React.ReactNode;
  let lead: React.ReactNode = ex.description;
  let progress: React.ReactNode = null;
  let reset = {
    label: t("workspace.reset.label"),
    ask: t("workspace.reset.ask"),
    run: () => {
      set(start(exerciseCards(ex.id)));
      setSaved(false);
    },
  };
  if (
    (base === "now" && ex.category > 0) ||
    (base === "bridge" && ex.category === 2) ||
    (base === "future" && ex.category > 0) ||
    (base === "coffee" && ex.category === 2) ||
    (base === "perspective" && ex.category === 2)
  ) {
    content = (
      <Adapted
        ex={ex}
        s={s}
        update={update}
        field={field}
        people={people}
        inspect={inspect}
        finish={finish}
        cards={cards}
      />
    );
  } else if (base === "now" || base === "challenge") {
    // `key` is the Bulgarian answer key the step is saved under (it must not
    // change with the language); `id` picks the step's texts in the locale.
    const steps: {
      key: string;
      id: string;
      sentences?: string[];
      choice?: boolean;
    }[] =
      base === "now"
        ? [
            { key: "Погледни картата", id: "look" },
            { key: "Открий себе си в нея", id: "self" },
            {
              key: "Довърши изреченията",
              id: "sentences",
              // Each sentence prompt is also its answer key.
              sentences: [
                "Точно сега се чувствам…",
                "В момента най-много ме занимава…",
                "Забелязвам, че…",
                "Имам нужда от…",
                "Иска ми се…",
              ],
            },
            { key: "Най-важното", id: "important" },
          ]
        : [
            { key: "Погледни картата", id: "look" },
            { key: "Друга гледна точка", id: "perspective" },
            { key: "Отново избор", id: "again", choice: true },
          ];
    // Stored choice values stay Bulgarian; the buttons show the translation.
    const choices = [
      { value: "Да", id: "yes" },
      { value: "Не", id: "no" },
      { value: "Не съм сигурен", id: "unsure" },
    ];
    const step = Math.min(s.stage, steps.length);
    const current = steps[step];
    const stepText = current && `ex.${base}.steps.${current.id}`;
    const questions = current ? tList(`${stepText}.questions`) : [];
    const sentenceLabels = current?.sentences
      ? tList(`${stepText}.sentences`)
      : [];
    const card = s.selected[0];
    progress = <StepCount current={step + 1} total={steps.length + 1} />;
    lead =
      step === 0
        ? t(`ex.${base}.pick`)
        : current
          ? t("workspace.stayWithCard")
          : t("workspace.finish.prompt");
    const panel = (
      <div className="side-panel">
        {current ? (
          <>
            <h3>{t(`${stepText}.title`)}</h3>
            {questions.length > 0 && (
              <ul className="questions">
                {questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            )}
            {current.sentences ? (
              current.sentences.map((sentence, i) => (
                <label className="mini-field" key={sentence}>
                  {sentenceLabels[i] ?? sentence}
                  <input
                    value={s.answers[sentence] || ""}
                    onChange={(e) => answer(sentence, e.target.value)}
                  />
                </label>
              ))
            ) : (
              <textarea
                value={s.answers[current.key] || ""}
                onChange={(e) => answer(current.key, e.target.value)}
                placeholder={t("common.writeThoughts")}
              />
            )}
            {current.choice && (
              <div className="row">
                {choices.map(({ value, id }) => (
                  <button
                    className={
                      s.answers["Избор"] === value ? "primary" : "secondary"
                    }
                    onClick={() => answer("Избор", value)}
                    key={value}
                  >
                    {t(`ex.${base}.choices.${id}`)}
                  </button>
                ))}
              </div>
            )}
            <div className="actions">
              {step > 0 && (
                <button
                  className="secondary"
                  onClick={() => update({ stage: step - 1 })}
                >
                  {t("workspace.back")}
                </button>
              )}
              {next(t("common.continue"), !card, () =>
                update({ stage: step + 1 }),
              )}
            </div>
          </>
        ) : (
          <>
            <h3>{t("workspace.finalReflection")}</h3>
            {finish()}
            <button
              className="text-button"
              onClick={() => update({ stage: step - 1 })}
            >
              {t("workspace.back")}
            </button>
          </>
        )}
      </div>
    );
    content =
      step === 0 ? (
        <div className="board board-pick">
          <div className="pick-grid">
            {cards.map((id) => (
              <Card
                key={id}
                id={id}
                selected={card === id}
                onClick={() => update({ selected: [id] })}
              />
            ))}
          </div>
          <Preview id={card} inspect={inspect} />
          {panel}
        </div>
      ) : (
        <div className="board board-focus">
          <Preview id={card} inspect={inspect} />
          {panel}
        </div>
      );
  } else if (base === "bridge") {
    const pair = ex.id.endsWith("pair");
    const n = pair ? 6 : 3;
    const done = s.selected.length;
    // Answers are saved under these Bulgarian slot names plus the slot index
    // (e.g. "Къде съм сега0") in every language; only the labels are translated.
    const slotKeys = ["Къде съм сега", "Къде искам да бъда", "Какво ще ми помогне"];
    const labels = tList("ex.bridge.labels");
    const hints = tList("ex.bridge.hints");
    progress = <Steps current={done >= n ? 3 : (done % 3) + 1} total={3} />;
    lead =
      done < n ? t("ex.bridge.leadDraw") : t("ex.bridge.leadWhole");
    content = (
      <div className="board board-side">
        <div>
          {Array.from({ length: n / 3 }, (_, r) => (
            <div key={r}>
              {pair && (
                <p className="eyebrow">
                  {t("ex.bridge.participant", { n: r + 1 })}
                </p>
              )}
              <div className="bridge-row">
                {/* Drawn as now → future → helper, shown as now → helper → future. */}
                {[0, 2, 1].map((k, j) => {
                  const i = r * 3 + k;
                  const id = s.selected[i];
                  const key = slotKeys[k] + i;
                  return (
                    <React.Fragment key={i}>
                      {j > 0 && <ArrowRight className="bridge-arrow" />}
                      <section
                        className={`bridge-slot ${i === done ? "next" : ""}`}
                      >
                        <h3>{labels[k]}</h3>
                        {id ? (
                          <Card id={id} onClick={() => inspect(id)} />
                        ) : (
                          <Card
                            id={0}
                            hidden
                            onClick={() => {
                              if (i === done)
                                update({
                                  selected: [...s.selected, s.pool[0]],
                                  pool: s.pool.slice(1),
                                });
                            }}
                          />
                        )}
                        <textarea
                          value={s.answers[key] || ""}
                          onChange={(e) => answer(key, e.target.value)}
                          placeholder={hints[k]}
                          disabled={!id}
                        />
                      </section>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
          {done < n && (
            <p className="hint">
              {t("ex.bridge.nextCard", { label: labels[done % 3] ?? "" })}
            </p>
          )}
        </div>
        <div className="side-panel">
          <h3>{t("ex.bridge.reflections")}</h3>
          <label className="mini-field">
            {t("ex.bridge.topic")}
            <input
              value={s.topic}
              onChange={(e) => update({ topic: e.target.value })}
              placeholder={t("workspace.topic.placeholder")}
            />
          </label>
          <textarea
            value={s.answers["Обща_картина"] || ""}
            onChange={(e) => answer("Обща_картина", e.target.value)}
            placeholder={
              pair ? t("ex.bridge.wholePair") : t("ex.bridge.wholeSolo")
            }
          />
          {done === n && finish()}
        </div>
      </div>
    );
  } else if (base === "future") {
    content =
      s.stage === 0 && !autoPick(cards) ? (
        <>
          <h2>{t("ex.future.pick")}</h2>
          {choose(7)}
          {next(t("ex.future.arrange"), s.selected.length < 5)}
        </>
      ) : (
        <>
          <h2>{t("ex.future.arrangeTitle")}</h2>
          <p>{t("ex.future.arrangeHint")}</p>
          <Composition
            ids={s.selected}
            positions={s.positions}
            setPositions={(positions) => update({ positions })}
            inspect={inspect}
          />
          {field("Описание", t("ex.future.descriptionLabel"))}
          {field(
            "Заглавие",
            t("ex.future.titleLabel"),
            t("ex.future.titlePlaceholder"),
          )}
          {finish()}
        </>
      );
  } else if (base === "essence") {
    const pick = (id: number) => {
      const winners = [...s.winners, id];
      const remaining = s.pool.slice(3);
      if (remaining.length) {
        update({ pool: remaining, winners });
      } else if (winners.length === 1) {
        update({ selected: winners, pool: [], stage: 2 });
      } else update({ pool: [], winners });
    };
    // The round has ended: pause on the kept cards before starting the next one.
    const roundOver = s.stage === 1 && !s.pool.length && s.winners.length > 1;
    const nextRound = () =>
      update({ pool: shuffle(s.winners), winners: [], round: s.round + 1 });
    const three = s.pool.slice(0, 3);
    // Picking a card moves straight on, after a short pause to show the choice.
    const choose = (id: number) => {
      if (three.includes(choice)) return;
      setChoice(id);
      setTimeout(() => {
        pick(id);
        setChoice(0);
      }, 350);
    };
    progress = <StepLine current={Math.min(s.stage, 2) + 1} total={3} />;
    lead =
      s.stage === 0 ? (
        t("ex.essence.leadTopic")
      ) : roundOver ? (
        t("ex.essence.leadRoundOver", { round: s.round })
      ) : s.stage === 1 ? (
        <>
          {t("ex.essence.leadPick1")}
          <br />
          {t("ex.essence.leadPick2")}
        </>
      ) : (
        t("ex.essence.leadFinal")
      );
    content =
      s.stage === 0 ? (
        <div className="paper narrow">
          {topic()}
          {next(t("ex.essence.start"), !s.topic.trim())}
        </div>
      ) : roundOver ? (
        <div className="board board-side">
          <div className="round-end">
            <p className="remaining">
              <Layers size={15} />
              <span>
                {t("ex.essence.roundKeptBefore", { round: s.round })}{" "}
                <b>{s.winners.length}</b>{" "}
                {t("ex.essence.roundKeptAfter", { count: s.winners.length })}
              </span>
            </p>
            <div className="spread deck-spread">
              {s.winners.map((id) => (
                <Card key={id} id={id} onClick={() => inspect(id)} />
              ))}
            </div>
            {next(
              t("ex.essence.startRound", { round: s.round + 1 }),
              false,
              nextRound,
            )}
          </div>
          <div className="side-panel">
            <h3>{t("ex.essence.question")}</h3>
            <p className="question-box">{s.topic}</p>
            <p className="note-box">
              {t("ex.essence.nextRoundNote", {
                round: s.round + 1,
                count: s.winners.length,
              })}
            </p>
          </div>
        </div>
      ) : s.stage === 1 ? (
        <div className="board board-side">
          <div>
            <p className="remaining">
              <Layers size={15} />
              <span>
                {t("ex.essence.leftBefore", { count: s.pool.length })}{" "}
                <b>{s.pool.length}</b>{" "}
                {t("ex.essence.leftAfter", { count: s.pool.length })}
              </span>
              <span>{t("ex.essence.round", { round: s.round })}</span>
            </p>
            <div className="tournament">
              {three.map((id) => (
                <div className="radio-card" key={id}>
                  <Card
                    id={id}
                    selected={choice === id}
                    onClick={() => choose(id)}
                  />
                  <input
                    type="radio"
                    name="essence"
                    checked={choice === id}
                    onChange={() => choose(id)}
                    tabIndex={-1}
                    aria-hidden
                  />
                </div>
              ))}
            </div>
            {s.winners.length > 0 && (
              <div className="winner-strip">
                <small>{t("ex.essence.keptThisRound")}</small>
                {s.winners.map((id) => (
                  <Card key={id} id={id} onClick={() => inspect(id)} />
                ))}
              </div>
            )}
          </div>
          <div className="side-panel">
            <h3>{t("ex.essence.question")}</h3>
            <p className="question-box">{s.topic}</p>
            <p className="note-box">{t("ex.essence.pickNote")}</p>
          </div>
        </div>
      ) : (
        <div className="board board-focus">
          <Preview id={s.selected[0]} inspect={inspect} />
          <div className="side-panel">
            <h3>{t("ex.essence.title")}</h3>
            {field("Връзка", t("ex.essence.connection"))}
            {field("Нова_идея", t("ex.essence.newIdea"))}
            {field("Действие", t("ex.essence.action"))}
            {finish()}
          </div>
        </div>
      );
  } else if (base === "why") {
    const ord = tList("ex.why.ordinals");
    const w = Math.min(Math.max(s.stage, 1), 6);
    const card = s.selected[w - 1];
    const prev = w === 1 ? s.topic : s.answers["Отговор_" + (w - 1)];
    const draw = (id: number) => {
      if (!card && s.topic.trim())
        update({
          selected: [...s.selected.slice(0, w - 1), id],
          pool: s.pool.filter((c) => c !== id),
        });
    };
    progress = <Steps current={Math.min(w, 5)} total={5} />;
    lead =
      w > 5
        ? t("ex.why.leadDone")
        : t("ex.why.lead", { ord: ord[w - 1] });
    content = (
      <div className="board board-why">
        <ol className="why-list">
          {Array.from({ length: 5 }, (_, i) => (
            <li
              key={i}
              className={i + 1 === w ? "current" : i + 1 < w ? "done" : ""}
            >
              <span className="num">{i + 1}</span>
              <span>{t("ex.why.step")}</span>
              {s.selected[i] ? (
                <Card
                  id={s.selected[i]}
                  onClick={() => inspect(s.selected[i])}
                />
              ) : (
                <span className="slot" />
              )}
            </li>
          ))}
        </ol>
        <div>
          {w <= 5 ? (
            <>
              {w === 1 && !card && topic()}
              <div className={`why-cards ${card ? "drawn" : ""}`}>
                {card ? (
                  <>
                    <Card id={card} selected onClick={() => inspect(card)} />
                    {s.pool.slice(0, 3).map((id) => (
                      <Card key={id} id={0} hidden />
                    ))}
                  </>
                ) : (
                  s.pool
                    .slice(0, 4)
                    .map((id) => (
                      <Card key={id} id={0} hidden onClick={() => draw(id)} />
                    ))
                )}
              </div>
              {!s.topic.trim() && (
                <p className="hint">
                  {t("ex.why.topicFirst")}
                </p>
              )}
              <label className="field">
                {t("ex.why.question", { prev: prev || t("ex.why.this") })}
                <textarea
                  value={s.answers["Отговор_" + w] || ""}
                  onChange={(e) => answer("Отговор_" + w, e.target.value)}
                  placeholder={t("ex.why.answerPlaceholder")}
                  disabled={!card}
                />
              </label>
            </>
          ) : (
            <>
              <div className="why-cards summary">
                {s.selected.map((id, i) => (
                  <div key={i}>
                    <Card id={id} onClick={() => inspect(id)} />
                    <p>{s.answers["Отговор_" + (i + 1)]}</p>
                    <button
                      className={
                        s.answers["Изненада"] === String(i)
                          ? "primary"
                          : "secondary"
                      }
                      onClick={() => answer("Изненада", String(i))}
                    >
                      {t("ex.why.surprised")}
                    </button>
                  </div>
                ))}
              </div>
              {finish()}
            </>
          )}
        </div>
        <div className="side-panel">
          <h3>{t("ex.why.chain")}</h3>
          {s.topic && (
            <p className="small-note">{t("ex.why.topic", { topic: s.topic })}</p>
          )}
          <ol className="chain-list">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i}>
                <span>{i + 1}</span>
                {s.answers["Отговор_" + (i + 1)] || "…"}
              </li>
            ))}
          </ol>
          <div className="actions">
            {w > 1 && (
              <button
                className="secondary"
                onClick={() => update({ stage: w - 1 })}
              >
                {t("ex.why.back")}
              </button>
            )}
            {w <= 5 &&
              next(
                t("common.continue"),
                !card || !s.answers["Отговор_" + w]?.trim(),
                () => update({ stage: w + 1 }),
              )}
          </div>
        </div>
      </div>
    );
  } else if (base === "dialogue") {
    const inspiration = tList("ex.dialogue.inspiration");
    // Even lines are mine, odd lines are the card's.
    const cardTurn = s.lines.length % 2 === 1;
    const send = () => {
      if (!draftLine.trim()) return;
      update({ lines: [...s.lines, draftLine.trim()] });
      setDraftLine("");
    };
    lead =
      s.stage === 0
        ? t("ex.dialogue.leadStart")
        : t("ex.dialogue.lead");
    if (s.stage > 0)
      reset = {
        label: t("common.clear"),
        ask: t("ex.dialogue.clearAsk"),
        run: () =>
          update({ lines: [], answers: { ...s.answers, Изречение: "" } }),
      };
    content =
      s.stage === 0 ? (
        <div className="paper narrow center">
          {topic()}
          <Card
            id={0}
            hidden
            onClick={() =>
              update({
                selected: [s.pool[0]],
                pool: s.pool.slice(1),
                stage: 1,
                lines: [t("ex.dialogue.firstLine")],
              })
            }
          />
          <p className="hint">{t("ex.dialogue.drawHint")}</p>
        </div>
      ) : (
        <>
          <div className="board board-dialogue">
            <Preview id={s.selected[0]} inspect={inspect} />
            <div className="chat">
              <div className="chat-lines">
                {s.lines.map((line, i) => (
                  <div className={`chat-row ${i % 2 ? "card-says" : ""}`} key={i}>
                    <b>
                      {i % 2 ? t("ex.dialogue.card") : t("ex.dialogue.me")}:
                    </b>
                    <textarea
                      rows={1}
                      value={line}
                      onChange={(e) =>
                        update({
                          lines: s.lines.map((v, j) =>
                            j === i ? e.target.value : v,
                          ),
                        })
                      }
                      placeholder={
                        i % 2
                          ? t("ex.dialogue.cardPlaceholder")
                          : t("ex.dialogue.mePlaceholder")
                      }
                    />
                  </div>
                ))}
              </div>
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <span>
                  {cardTurn ? t("ex.dialogue.card") : t("ex.dialogue.me")}
                </span>
                <input
                  value={draftLine}
                  onChange={(e) => setDraftLine(e.target.value)}
                  placeholder={
                    cardTurn
                      ? t("ex.dialogue.cardDraft")
                      : t("ex.dialogue.meDraft")
                  }
                />
                <button
                  className="send"
                  type="submit"
                  aria-label={t("ex.dialogue.send")}
                  disabled={!draftLine.trim()}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
            <div className="side-panel">
              <h3>{t("ex.dialogue.inspirationTitle")}</h3>
              <ol className="inspiration">
                {inspiration.map((q) => (
                  <li key={q}>
                    <button
                      onClick={() =>
                        update({
                          lines: cardTurn ? [...s.lines, "", q] : [...s.lines, q],
                        })
                      }
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ol>
              <button
                className="secondary wide"
                onClick={save}
                disabled={saved || s.lines.filter((l) => l.trim()).length < 2}
              >
                <Save size={16} />
                {saved ? t("ex.dialogue.saved") : t("ex.dialogue.save")}
              </button>
              {saved && (
                <Link className="text-button" to="/notes">
                  {t("ex.dialogue.viewNotes")}
                </Link>
              )}
            </div>
          </div>
          {s.lines.some((l, i) => i % 2 && l.trim()) && (
            <div className="paper dialogue-after">
              <h3>
                {t("ex.dialogue.sentenceTitle")}
              </h3>
              {s.lines
                .filter((_, i) => i % 2)
                .flatMap((l) => l.split(/(?<=[.!?])\s+/))
                .filter(Boolean)
                .map((l, i) => (
                  <button
                    key={i}
                    className={
                      s.answers["Изречение"] === l
                        ? "sentence chosen"
                        : "sentence"
                    }
                    onClick={() => answer("Изречение", l)}
                  >
                    {l}
                  </button>
                ))}
              {field("Финален_размисъл", t("ex.dialogue.reflection"))}
            </div>
          )}
        </>
      );
  } else if (base === "story") {
    const total = ex.category === 1 ? 8 : s.people;
    const players = ex.category === 1 ? 2 : s.people;
    // The shuffled pool is the deal; it is committed when the first card is turned.
    const dealt = s.selected.length > 0;
    const cards = dealt ? s.selected : s.pool.slice(0, total);
    lead =
      s.turn < total
        ? t("ex.story.lead")
        : t("ex.story.leadDone");
    content = (
      <>
        {!dealt && ex.category !== 1 && people()}
        <div className="story-cards">
          {cards.map((id, i) => (
            <div key={i}>
              <small>
                {i === total - 1
                  ? t("ex.story.final")
                  : t("ex.story.turn", { n: i + 1 })}
              </small>
              <Card
                id={id}
                hidden={i > s.turn || (i === s.turn && !s.revealed)}
                onClick={() => {
                  if (i !== s.turn) return;
                  if (!dealt)
                    update({
                      selected: cards,
                      pool: s.pool.slice(total),
                      revealed: true,
                    });
                  else update({ revealed: true });
                }}
              />
            </div>
          ))}
        </div>
        {s.lines.length > 0 && (
          <div className="paper story-text">
            {s.lines.map((l, i) => (
              <p key={i}>
                <small>
                  {t("ex.story.participant", { n: (i % players) + 1 })}
                </small>
                {l}
              </p>
            ))}
          </div>
        )}
        {s.turn < total ? (
          <>
            <h2>
              {t("ex.story.participant", { n: (s.turn % players) + 1 })} ·{" "}
              {s.turn === 0
                ? t("ex.story.begin")
                : s.turn === total - 1
                  ? t("ex.story.end")
                  : t("ex.story.continue")}
            </h2>
            {s.revealed ? (
              <>
                {field(
                  "Текущ_разказ",
                  t("ex.story.addLabel"),
                )}
                {next(
                  t("ex.story.saveTurn"),
                  !s.answers["Текущ_разказ"]?.trim(),
                  () =>
                    update({
                      lines: [...s.lines, s.answers["Текущ_разказ"]],
                      answers: { ...s.answers, Текущ_разказ: "" },
                      turn: s.turn + 1,
                      revealed: false,
                    }),
                )}
              </>
            ) : (
              <p className="hint">
                {t("ex.story.flipHint", { n: s.turn + 1 })}
              </p>
            )}
          </>
        ) : (
          <>
            {field("Заглавие", t("ex.story.titleLabel"))}
            {field("Обрат", t("ex.story.twistLabel"))}
            {finish()}
          </>
        )}
      </>
    );
  } else if (base === "coffee") {
    content =
      s.stage === 0 ? (
        <>
          <h2>{t("ex.coffee.pick", { n: s.selected.length + 1 })}</h2>
          {choose(2)}
          {next(t("ex.coffee.start"), s.selected.length < 2)}
        </>
      ) : (
        <div className="focused">
          <div>
            <Card
              id={s.selected[s.turn % 2]}
              large
              onClick={() => inspect(s.selected[s.turn % 2])}
            />
            <p>
              {t("ex.coffee.roles", {
                speaker: (s.turn % 2) + 1,
                listener: ((s.turn + 1) % 2) + 1,
              })}
            </p>
          </div>
          <div>
            <h2>{t("ex.coffee.tellMore")}</h2>
            {field("Разказ_" + s.turn, t("ex.coffee.storyLabel"))}
            {field("Обобщение_" + s.turn, t("ex.coffee.summaryLabel"))}
            <div className="row">
              {/* The Bulgarian choice is stored; its translation is shown. */}
              {translateList("bg", "ex.coffee.checks").map((v, i) => (
                <button
                  key={v}
                  className={
                    s.answers["Проверка_" + s.turn] === v
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() => answer("Проверка_" + s.turn, v)}
                >
                  {tList("ex.coffee.checks")[i] ?? v}
                </button>
              ))}
            </div>
            {field("Уточнение_" + s.turn, t("ex.coffee.clarifyLabel"))}
            {next(t("ex.coffee.switch"), false, () =>
              update({ turn: s.turn + 1 }),
            )}
            <button
              className="secondary"
              onClick={() => update({ stage: 0, selected: [] })}
            >
              {t("ex.coffee.another")}
            </button>
            {s.turn > 0 && finish()}
          </div>
        </div>
      );
  } else if (base === "perspective") {
    content = (
      <>
        {!s.selected.length ? (
          <>
            <p>{t("ex.perspective.intro")}</p>
            <Card
              id={0}
              hidden
              onClick={() =>
                update({ selected: [s.pool[0]], pool: s.pool.slice(1) })
              }
            />
          </>
        ) : (
          <>
            <div className="focused">
              {selected()}
              <div className="two-columns">
                {field(
                  "Проблем_" + s.turn,
                  t("ex.perspective.problem", { n: (s.turn % 2) + 1 }),
                )}
                {field(
                  "Решение_" + s.turn,
                  t("ex.perspective.solution", { n: ((s.turn + 1) % 2) + 1 }),
                )}
                {field("Въпрос_" + s.turn, t("ex.perspective.question"))}
                {field("Уточнение_" + s.turn, t("ex.perspective.clarify"))}
              </div>
            </div>
            {next(t("ex.perspective.nextRound"), false, () =>
              update({
                selected: [s.pool[0]],
                pool: s.pool.slice(1),
                turn: s.turn + 1,
                lines: [
                  ...s.lines,
                  t("ex.perspective.log", {
                    card: s.selected[0],
                    problem: s.answers["Проблем_" + s.turn] || "",
                    solution: s.answers["Решение_" + s.turn] || "",
                  }),
                ],
              }),
            )}
            {field(
              "Променена_гледна_точка",
              t("ex.perspective.changedLabel"),
            )}
            {finish()}
          </>
        )}
      </>
    );
  } else if (base === "cluster" || base === "feelings") {
    content =
      s.stage === 0 ? (
        <>
          {people()}
          <p>
            {base === "cluster"
              ? t("ex.cluster.intro")
              : t("ex.feelings.intro")}
          </p>
          {next(t("ex.cluster.deal"), false, () => {
            deal(1);
            update({ timer: base === "cluster" ? 300 : 0 });
          })}
        </>
      ) : (
        <>
          <div className="table-labels">
            {(base === "feelings"
              ? tList("ex.feelings.emotions")
              : [1, 2, 3].map((n) => t("ex.cluster.group", { n }))
            ).map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          <Composition
            ids={s.selected}
            positions={s.positions}
            setPositions={(positions) => update({ positions })}
            inspect={inspect}
          />
          {base === "cluster" ? (
            <Timer
              seconds={s.timer}
              onEnd={() => update({ stage: 2, timer: 0 })}
            />
          ) : (
            <>
              <div className="row">
                {s.hands.map((h, i) => (
                  <button
                    className="secondary"
                    key={i}
                    disabled={!s.pool.length}
                    onClick={() => {
                      const old = h[0];
                      const fresh = s.pool[0];
                      update({
                        hands: s.hands.map((a, j) => (j === i ? [fresh] : a)),
                        selected: s.selected.map((c) =>
                          c === old ? fresh : c,
                        ),
                        pool: [...s.pool.slice(1), old],
                      });
                    }}
                  >
                    {t("ex.feelings.swap", { n: i + 1 })}
                  </button>
                ))}
              </div>
              {field("Обяснения", t("ex.feelings.explanations"))}
            </>
          )}
          {(s.stage >= 2 || base === "feelings") && (
            <>
              {field(
                "Връзки",
                base === "cluster"
                  ? t("ex.cluster.connections")
                  : t("ex.feelings.connections"),
              )}
              {field(
                "Преживяване",
                base === "cluster"
                  ? t("ex.cluster.experience")
                  : t("ex.feelings.experience"),
              )}
              <button
                className="secondary"
                onClick={() => {
                  deal(1);
                  update({
                    timer: base === "cluster" ? 300 : 0,
                    positions: {},
                  });
                }}
              >
                {t("ex.cluster.newRound")}
              </button>
              {base === "cluster" && (
                <button
                  className="secondary"
                  onClick={() =>
                    update({ stage: 1, timer: 300, positions: {} })
                  }
                >
                  {t("ex.cluster.sameCards")}
                </button>
              )}
              {finish()}
            </>
          )}
        </>
      );
  } else if (base === "words") {
    content =
      s.stage === 0 ? (
        <>
          {people()}
          {next(t("ex.words.deal"), false, () => deal(1))}
        </>
      ) : (
        <>
          <h2>{t("ex.words.round", { n: s.round })}</h2>
          <div className="participants">
            {s.hands.map((h, i) => (
              <section className="paper" key={i}>
                <h3>{t("ex.words.participant", { n: i + 1 })}</h3>
                <Card id={h[0]} onClick={() => inspect(h[0])} />
                <label className="field">
                  {s.round === 1
                    ? t("ex.words.firstWord")
                    : t("ex.words.received")}
                  <input
                    value={s.words[i] || ""}
                    readOnly={s.round > 1}
                    onChange={(e) =>
                      update({
                        words: Array.from({ length: s.people }, (_, j) =>
                          j === i ? e.target.value : s.words[j] || "",
                        ),
                      })
                    }
                  />
                </label>
                {field(
                  `Връзка_${s.round}_${i}`,
                  t("ex.words.link"),
                )}
              </section>
            ))}
          </div>
          {next(
            t("ex.words.pass"),
            s.words.filter(Boolean).length < s.people,
            () =>
              update({
                words: s.words.map((_, i) => s.words[(i + 1) % s.people]),
                round: s.round + 1,
              }),
          )}
          {field(
            "Промяна",
            t("ex.words.change"),
          )}
          {finish()}
        </>
      );
  } else if (base === "market") {
    content =
      s.stage === 0 ? (
        <>
          {people()}
          <p>{t("ex.market.capacity")}</p>
          {next(t("ex.market.deal"), false, () => deal(3))}
        </>
      ) : (
        <>
          <div className="participants">
            {s.hands.map((h, i) => (
              <section className="paper" key={i}>
                <h3>{t("ex.market.participant", { n: i + 1 })}</h3>
                <div className="row">
                  {h.map((id) => (
                    <div key={id}>
                      <Card
                        id={id}
                        selected={s.answers["Важна_" + i] === String(id)}
                        onClick={() => answer("Важна_" + i, String(id))}
                      />
                      <input
                        aria-label={t("ex.market.valueFor", { id })}
                        placeholder={t("ex.market.valuePlaceholder")}
                        value={s.answers["Ценност_" + id] || ""}
                        onChange={(e) =>
                          answer("Ценност_" + id, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
                <p>{t("ex.market.pickValue")}</p>
              </section>
            ))}
          </div>
          <Trade
            hands={s.hands}
            onTrade={(a, ai, b, bi) => {
              const h = s.hands.map((x) => [...x]);
              [h[a][ai], h[b][bi]] = [h[b][bi], h[a][ai]];
              update({ hands: h, selected: h.flat() });
            }}
          />
          <Timer seconds={420} />
          <h2>{t("ex.market.groupsTitle")}</h2>
          {Array.from({ length: Math.ceil(s.people / 4) }, (_, i) => (
            <section key={i}>
              {field(
                "Група_" + i,
                t("ex.market.groupTask", {
                  n: i + 1,
                  members: groupMembers(s.people, i).join(", "),
                }),
              )}
            </section>
          ))}
          {finish()}
        </>
      );
  } else if (
    base === "mime" ||
    base === "detective" ||
    base === "associations"
  ) {
    content = (
      <GuessGame
        base={base}
        s={s}
        update={update}
        field={field}
        people={people}
        deal={deal}
        inspect={inspect}
        finish={finish}
        kids={ex.category === 3}
      />
    );
  } else if (base === "trust") {
    content =
      s.stage === 0 ? (
        <>
          {people()}
          <p>{t("ex.trust.intro")}</p>
          {next(t("ex.trust.start"), false, () =>
            update({ stage: 1, selected: [] }),
          )}
        </>
      ) : s.stage === 1 ? (
        <>
          <h2>{t("ex.trust.pickTwo", { n: s.turn + 1 })}</h2>
          {choose(2)}
          {next(t("ex.trust.confirm"), s.selected.length < 2, () => {
            const hands = [...s.hands, s.selected];
            update({
              hands,
              selected: [],
              turn: s.turn + 1,
              stage: s.turn + 1 === s.people ? 2 : 1,
            });
            if (s.turn + 1 === s.people)
              update({ turn: 0, selected: hands[0] });
          })}
        </>
      ) : (
        <>
          <h2>{t("ex.trust.listen", { n: s.turn + 1 })}</h2>
          {selected()}
          <p>{t("ex.trust.rules")}</p>
          {field("Моят_образ_" + s.turn, t("ex.trust.myImage"))}
          {Array.from({ length: Math.min(s.people - 1, 5) }, (_, i) =>
            field(
              `Асоциация_${s.turn}_${i}`,
              t("ex.trust.voice", { n: i + 1 }),
            ),
          )}
          {field("Взимам_" + s.turn, t("ex.trust.takeAway"))}
          {s.turn + 1 < s.people &&
            next(t("ex.trust.nextParticipant"), false, () =>
              update({ turn: s.turn + 1, selected: s.hands[s.turn + 1] }),
            )}
          {finish()}
        </>
      );
  } else if (base === "mission") {
    const teams = Math.ceil(s.people / 4);
    const phases = [
      {
        title: t("ex.mission.ideasTitle"),
        minutes: 10,
        text: t("ex.mission.ideasText"),
      },
      {
        title: t("ex.mission.solutionTitle"),
        minutes: 5,
        text: t("ex.mission.solutionText"),
      },
      {
        title: t("ex.mission.presentTitle"),
        minutes: 3,
        text: t("ex.mission.presentText"),
      },
    ];
    const phase = phases[Math.min(s.stage, 3) - 1];
    if (phase) progress = <Steps current={s.stage} total={3} />;
    lead = phase
      ? t("ex.mission.phaseLead", { count: phase.minutes, text: phase.text })
      : t("ex.mission.lead");
    content =
      s.stage === 0 ? (
        <div className="paper narrow">
          {people()}
          {topic()}
          <p className="hint">{t("ex.mission.teams", { count: teams })}</p>
          {next(t("ex.mission.deal"), !s.topic.trim(), () => {
            const pool = shuffle(cards);
            update({
              hands: Array.from({ length: teams }, (_, i) =>
                pool.slice(i * 3, i * 3 + 3),
              ),
              selected: pool.slice(0, teams * 3),
              stage: 1,
            });
          })}
        </div>
      ) : (
        <>
          <div className="mission-bar">
            <div>
              <small>{t("ex.mission.mission")}</small>
              <h2>{s.topic}</h2>
            </div>
            <Timer seconds={phase.minutes * 60} />
          </div>
          {s.hands.map((h, i) => (
            <section className="team" key={i}>
              <div className="team-cards">
                <h3>{t("ex.mission.team", { n: i + 1 })}</h3>
                <p className="small-note">
                  {t("ex.mission.members", {
                    members: groupMembers(s.people, i).join(", "),
                  })}
                </p>
                <div className="team-card-row">
                  {h.map((id) => (
                    <Card key={id} id={id} onClick={() => inspect(id)} />
                  ))}
                </div>
              </div>
              <div className="team-work">
                <h3>
                  {t("ex.mission.phase", { n: s.stage, title: phase.title })}
                </h3>
                {s.stage === 1 ? (
                  [1, 2, 3].map((j) =>
                    field(`Идея_${i}_${j}`, t("ex.mission.idea", { n: j })),
                  )
                ) : s.stage === 2 ? (
                  field("Решение_" + i, t("ex.mission.ourSolution"))
                ) : (
                  <>
                    {field("Представяне_" + i, t("ex.mission.howCards"))}
                    {field("Въпрос_" + i, t("ex.mission.question"))}
                    {field("Отговор_" + i, t("ex.mission.answer"))}
                  </>
                )}
              </div>
            </section>
          ))}
          <div className="actions">
            {s.stage > 1 && (
              <button
                className="secondary"
                onClick={() => update({ stage: s.stage - 1 })}
              >
                {t("ex.mission.back")}
              </button>
            )}
            {s.stage < 3 &&
              next(
                t("ex.mission.nextPhase"),
                s.stage === 1 &&
                  s.hands.some((_, i) =>
                    [1, 2, 3].some((j) => !s.answers[`Идея_${i}_${j}`]?.trim()),
                  ),
              )}
          </div>
          {s.stage === 3 && finish()}
        </>
      );
  } else if (base === "draw") {
    content =
      s.stage === 0 ? (
        <>
          <h2>{t("ex.draw.pick")}</h2>
          {choose()}
          {next(t("ex.draw.start"), !s.selected.length)}
        </>
      ) : (
        <>
          <h2>{t("ex.draw.beyond")}</h2>
          <p>{t("ex.draw.hint")}</p>
          <Drawing
            id={s.selected[0]}
            strokes={s.strokes}
            onChange={(strokes) => update({ strokes })}
          />
          {field("Моят_свят", t("ex.draw.myWorld"))}
          {finish()}
        </>
      );
  } else if (base === "gift") {
    content =
      s.stage === 0 ? (
        <>
          {people()}
          {next(t("ex.gift.drawNames"), false, () => {
            const order = shuffle(
              Array.from({ length: s.people }, (_, i) => i),
            );
            const recipients = Array.from(
              { length: s.people },
              (_, i) => order[(order.indexOf(i) + 1) % s.people],
            );
            update({ order: recipients, stage: 1 });
          })}
        </>
      ) : (
        <>
          <h2>
            {t("ex.gift.givesTo", {
              from: s.turn + 1,
              to: s.order[s.turn] + 1,
            })}
          </h2>
          <p>{t("ex.gift.think")}</p>
          {choose(1, false, (id) => update({ selected: [id] }))}
          {s.selected.length > 0 && (
            <>
              {field("Подарък_" + s.turn, t("ex.gift.giftLine"))}
              {field("Получател_" + s.turn, t("ex.gift.recipient"))}
              {s.turn + 1 < s.people ? (
                next(t("ex.gift.giveNext"), false, () =>
                  update({
                    lines: [
                      ...s.lines,
                      // A readable log line, in the language used while playing.
                      t("ex.gift.logLine", {
                        from: s.turn + 1,
                        to: s.order[s.turn] + 1,
                        card: s.selected[0],
                      }),
                    ],
                    turn: s.turn + 1,
                    selected: [],
                  }),
                )
              ) : (
                <>
                  {field("Чувство", t("ex.gift.feeling"))}
                  {finish()}
                </>
              )}
            </>
          )}
        </>
      );
  }
  return (
    <div className="workspace">
      <header className="exercise-header">
        <Link
          className="back"
          to={(location.state as { back?: string } | null)?.back ?? "/exercises"}
          state={{ from: ex.id }}
        >
          <ArrowLeft size={16} /> {t("shell.back")}
        </Link>
        <div className="exercise-title">
          <h1>{ex.title}</h1>
          <p>{lead}</p>
        </div>
        <div className="exercise-meta">
          {progress ?? (
            <span className="step-count">
              <Clock size={15} />
              {ex.time}
            </span>
          )}
          <button
            className="text-button"
            onClick={() => {
              if (confirm(reset.ask)) {
                reset.run();
                setResumed(false);
              }
            }}
          >
            {reset.label === t("common.clear") && <Trash2 size={14} />}
            {reset.label}
          </button>
        </div>
      </header>
      {resumed && (
        <div className="resume-note">
          <span>{t("shell.resumed")}</span>
          <button
            className="text-button"
            onClick={() => {
              set(start(exerciseCards(ex.id)));
              setSaved(false);
              setResumed(false);
            }}
          >
            {t("shell.restart")}
          </button>
          <button
            className="resume-close"
            onClick={() => setResumed(false)}
            aria-label={t("shell.hide")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {ex.adaptation && (
        <div className="adaptation">
          {ex.adaptation}
          {ex.id.endsWith("pair") && (
            <>
              {field("Наблюдател", t("shell.observer"))}
              <p>{t("shell.observerPrompts")}</p>
            </>
          )}
        </div>
      )}
      {ex.category >= 2 && (
        <div className="facilitator">
          <Users size={17} />
          <span>
            {t("shell.facilitator")}
            {ex.category === 3 ? t("shell.optional") : ""}
          </span>
        </div>
      )}
      <div className="exercise-content">{content}</div>
      <footer>
        {t("shell.footer", { page: ex.page })}
        <div className="copyright">
          {t("common.copyright", { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}
function Steps({ current, total }: { current: number; total: number }) {
  const { t } = useI18n();
  return (
    <ol className="steps" aria-label={t("steps.of", { current, total })}>
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          className={
            i + 1 < current ? "done" : i + 1 === current ? "current" : ""
          }
        >
          {i + 1}
        </li>
      ))}
    </ol>
  );
}
function StepLine({ current, total }: { current: number; total: number }) {
  const { t } = useI18n();
  return (
    <div className="step-line">
      <div
        className="track"
        style={
          {
            "--progress": `${((current - 1) / (total - 1)) * 100}%`,
          } as React.CSSProperties
        }
      >
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={i < current ? "on" : ""} />
        ))}
      </div>
      {t("steps.of", { current, total })}
    </div>
  );
}
function StepCount({ current, total }: { current: number; total: number }) {
  return (
    <span className="step-count">
      <Clock size={17} />
      {current} / {total}
    </span>
  );
}
function Preview({
  id,
  inspect,
}: {
  id?: number;
  inspect: (id: number) => void;
}) {
  const { t } = useI18n();
  if (!id)
    return <div className="preview empty-slot">{t("preview.choose")}</div>;
  return (
    <div className="preview">
      <img
        src={cardSrc(id)}
        alt={t("preview.alt", { label: cardLabel(id) })}
        onClick={() => inspect(id)}
      />
      <button
        className="preview-expand"
        onClick={() => inspect(id)}
        aria-label={t("preview.zoom")}
      >
        <Expand size={16} />
      </button>
    </div>
  );
}
function Composition({
  ids,
  positions,
  setPositions,
  inspect,
}: {
  ids: number[];
  positions: State["positions"];
  setPositions: (p: State["positions"]) => void;
  inspect: (id: number) => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    dx: number;
    dy: number;
    height: number;
    width: number;
  } | null>(null);
  return (
    <div
      className="composition"
      style={ids.length > 10 ? { height: 1200 } : undefined}
      ref={ref}
      onPointerMove={(e) => {
        if (!drag.current || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(
            100 - (drag.current.width / rect.width) * 100,
            ((e.clientX - rect.left - drag.current.dx) / rect.width) * 100,
          ),
        );
        const y = Math.max(
          0,
          Math.min(
            100 - (drag.current.height / rect.height) * 100,
            ((e.clientY - rect.top - drag.current.dy) / rect.height) * 100,
          ),
        );
        setPositions({ ...positions, [drag.current.id]: { x, y } });
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      {ids.map((id, i) => {
        const p = positions[id] || {
          x: (i % 5) * 19 + 2,
          y: Math.floor(i / 5) * (ids.length > 10 ? 23 : 28) + 4,
        };
        return (
          <div
            key={i}
            className="movable"
            style={{ left: p.x + "%", top: p.y + "%" }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest(".inspect")) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              const rect = e.currentTarget.getBoundingClientRect();
              drag.current = {
                id,
                dx: e.clientX - rect.left,
                dy: e.clientY - rect.top,
                height: rect.height,
                width: rect.width,
              };
            }}
          >
            <Card id={id} />
            <button className="inspect" onClick={() => inspect(id)}>
              <Expand size={13} /> {t("composition.card", { id })}
            </button>
          </div>
        );
      })}
    </div>
  );
}
function Timer({ seconds, onEnd }: { seconds: number; onEnd?: () => void }) {
  const { t } = useI18n();
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    setLeft(seconds);
    setRunning(false);
  }, [seconds]);
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(
      () =>
        setLeft((l) => {
          if (l <= 1) {
            setRunning(false);
            onEnd?.();
            return 0;
          }
          return l - 1;
        }),
      1000,
    );
    return () => clearInterval(interval);
  }, [running, onEnd]);
  return (
    <div className="timer">
      <Clock size={19} />
      <strong>
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </strong>
      <button
        className="secondary"
        disabled={left === 0}
        onClick={() => setRunning(!running)}
      >
        {running ? t("timer.pause") : t("timer.start")}
      </button>
      <button
        className="text-button"
        onClick={() => {
          setRunning(false);
          setLeft(0);
          onEnd?.();
        }}
      >
        {t("timer.endPhase")}
      </button>
    </div>
  );
}
function Trade({
  hands,
  onTrade,
}: {
  hands: number[][];
  onTrade: (a: number, ai: number, b: number, bi: number) => void;
}) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(1);
  const [ai, setAi] = useState(0);
  const [bi, setBi] = useState(0);
  const [yes, setYes] = useState([false, false]);
  const reset = () => setYes([false, false]);
  const { t } = useI18n();
  return (
    <section className="paper">
      <h2>{t("trade.title")}</h2>
      <div className="row">
        {[0, 1].map((_, i) => (
          <div key={i}>
            <label>
              {t("trade.participant")}{" "}
              <select
                value={i ? b : a}
                onChange={(e) => {
                  i ? setB(+e.target.value) : setA(+e.target.value);
                  reset();
                }}
              >
                {hands.map((_, j) => (
                  <option key={j} value={j}>
                    {j + 1}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("trade.card")}{" "}
              <select
                value={i ? bi : ai}
                onChange={(e) => {
                  i ? setBi(+e.target.value) : setAi(+e.target.value);
                  reset();
                }}
              >
                {hands[i ? b : a]?.map((id, j) => (
                  <option key={id} value={j}>
                    {t("trade.cardNumber", { id })}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={yes[i]}
                onChange={(e) =>
                  setYes(yes.map((v, j) => (j === i ? e.target.checked : v)))
                }
              />{" "}
              {t("trade.agree")}
            </label>
          </div>
        ))}
      </div>
      <button
        className="primary"
        disabled={a === b || !yes.every(Boolean)}
        onClick={() => {
          onTrade(a, ai, b, bi);
          reset();
        }}
      >
        {t("trade.swap")}
      </button>
      <p>{t("trade.rule")}</p>
    </section>
  );
}
type GuessProps = {
  base: string;
  s: State;
  update: (v: Partial<State>) => void;
  field: (k: string, l: string, p?: string) => React.ReactNode;
  people: () => React.ReactNode;
  deal: (n: number) => void;
  inspect: (id: number) => void;
  finish: () => React.ReactNode;
  kids: boolean;
};
function GuessGame({
  base,
  s,
  update,
  field,
  people,
  deal,
  inspect,
  finish,
  kids,
}: GuessProps) {
  const { t } = useI18n();
  const assoc = base === "associations";
  const detective = base === "detective";
  const cards = assoc ? s.order : s.selected;
  const [privateOpen, setPrivateOpen] = useState(false);
  const current = assoc ? s.turn : s.stage === 1 ? 0 : s.guesses.length + 1;
  const storyteller = (s.round - 1) % s.people;
  const roundNext = () => {
    if (assoc) {
      let pool = [...s.pool, ...s.order];
      const hands = s.hands.map((h, i) => {
        const kept = h.filter((id) => id !== s.selected[i]);
        const next = pool.shift()!;
        return [...kept, next];
      });
      update({
        hands,
        pool,
        selected: [],
        order: [],
        secret: 0,
        guesses: [],
        revealed: false,
        stage: 1,
        turn: s.round % s.people,
        round: s.round + 1,
        answers: { ...s.answers, Подсказка: "" },
      });
    } else
      update({
        stage: 1,
        secret: 0,
        guesses: [],
        revealed: false,
        round: s.round + 1,
        turn: 0,
      });
    setPrivateOpen(false);
  };
  if (s.stage === 0)
    return (
      <>
        {people()}
        <p>
          {assoc
            ? t("guess.introAssociations")
            : detective
              ? t("guess.introDetective")
              : t("guess.introMime")}
        </p>
        <button
          className="primary"
          onClick={() => {
            if (assoc) deal(kids ? 4 : 5);
            else
              update({
                selected: s.pool.slice(0, detective ? 6 : kids ? 6 : 8),
                pool: s.pool.slice(detective ? 6 : kids ? 6 : 8),
                stage: 1,
              });
          }}
        >
          {t("guess.prepare")} <ArrowRight size={16} />
        </button>
      </>
    );
  if (s.stage === 1) {
    const hand = assoc ? s.hands[current] : cards;
    return (
      <>
        <h2>
          {assoc
            ? t("guess.participant", { n: current + 1 }) +
              (current === storyteller ? " · " + t("guess.storyteller") : "")
            : detective
              ? t("guess.detectiveOnly")
              : t("guess.presenterOnly")}{" "}
          · {t("guess.privateChoice")}
        </h2>
        <p>{t("guess.lookAway")}</p>
        {!privateOpen ? (
          <button className="primary" onClick={() => setPrivateOpen(true)}>
            {t("guess.openPrivate")}
          </button>
        ) : (
          <>
            <div className="row">
              {hand.map((id) => (
                <Card
                  key={id}
                  id={id}
                  large
                  selected={
                    assoc ? s.selected[current] === id : s.secret === id
                  }
                  onClick={() =>
                    assoc
                      ? update({
                          selected: Array.from({ length: s.people }, (_, i) =>
                            i === current ? id : s.selected[i] || 0,
                          ),
                          secret: current === storyteller ? id : s.secret,
                        })
                      : update({ secret: id })
                  }
                />
              ))}
            </div>
            {assoc &&
              current === storyteller &&
              field("Подсказка", t("guess.hintLabel"))}
            {assoc && current !== storyteller && (
              <h2>{t("guess.hint", { hint: s.answers["Подсказка"] ?? "" })}</h2>
            )}
            {detective &&
              [1, 2, 3].map((i) =>
                field("Улика_" + i, t("guess.clueLabel", { n: i })),
              )}
            <button
              className="primary"
              disabled={
                assoc
                  ? !s.selected[current] ||
                    (current === storyteller && !s.answers["Подсказка"]?.trim())
                  : !s.secret ||
                    (detective &&
                      [1, 2, 3].some((i) => !s.answers["Улика_" + i]?.trim()))
              }
              onClick={() => {
                setPrivateOpen(false);
                if (assoc && (current + 1) % s.people !== storyteller)
                  update({ turn: (current + 1) % s.people });
                else
                  update({
                    stage: 2,
                    turn: 0,
                    order: assoc ? shuffle(s.selected) : [],
                    revealed: false,
                  });
              }}
            >
              {t("guess.confirmChoice")}
            </button>
          </>
        )}
      </>
    );
  }
  return (
    <>
      <h2>
        {assoc
          ? t("guess.hint", { hint: s.answers["Подсказка"] ?? "" })
          : detective
            ? t("guess.followClues")
            : t("guess.mimeTitle")}
      </h2>
      <div className="row">
        {cards.map((id) => (
          <Card
            key={id}
            id={id}
            selected={s.revealed && s.secret === id}
            onClick={() => inspect(id)}
          />
        ))}
      </div>
      {!assoc && !detective && s.stage === 2 ? (
        <>
          <p>{t("guess.mimeTiming")}</p>
          <Timer seconds={60} />
          <button className="primary" onClick={() => update({ stage: 3 })}>
            {t("guess.toGuessing")}
          </button>
        </>
      ) : (
        <>
          {detective && (
            <div className="paper">
              <p className="eyebrow">
                {t("guess.clueEyebrow", { n: s.turn + 1 })}
              </p>
              <h2>{s.answers["Улика_" + (s.turn + 1)]}</h2>
            </div>
          )}
          {!s.revealed && s.guesses.length < s.people - 1 ? (
            <>
              <h3>
                {t("guess.observer", {
                  n: assoc
                    ? Array.from({ length: s.people }, (_, i) => i).filter(
                        (i) => i !== storyteller,
                      )[s.guesses.length] + 1
                    : (((s.round % s.people) + s.guesses.length) % s.people) +
                      1,
                })}
              </h3>
              <div className="row">
                {cards.map((id) => (
                  <Card
                    key={id}
                    id={id}
                    onClick={() => update({ guesses: [...s.guesses, id] })}
                  />
                ))}
              </div>
              {field(
                "Причина_" + s.round + "_" + s.guesses.length,
                t("guess.reasonLabel"),
              )}
            </>
          ) : !s.revealed ? (
            <div className="actions">
              {detective && s.turn < 2 && (
                <button
                  className="secondary"
                  onClick={() => update({ turn: s.turn + 1, guesses: [] })}
                >
                  {t("guess.nextClue")}
                </button>
              )}
              <button
                className="primary"
                onClick={() => update({ revealed: true })}
              >
                {t("guess.reveal")}
              </button>
            </div>
          ) : (
            <>
              <h2>{t("guess.chosenCard")}</h2>
              <Card id={s.secret} large onClick={() => inspect(s.secret)} />
              <p>
                {t("guess.guesses", {
                  list: s.guesses
                    .map((id) => t("guess.cardNumber", { id }))
                    .join(", "),
                })}
              </p>
              {field(
                "Замисъл_" + s.round,
                detective
                  ? t("guess.intentDetective")
                  : t("guess.intentMime"),
              )}
              <button className="secondary" onClick={roundNext}>
                {t("guess.nextRound")}
              </button>
              {finish()}
            </>
          )}
        </>
      )}
    </>
  );
}
function Drawing({
  id,
  strokes,
  onChange,
}: {
  id: number;
  strokes: State["strokes"];
  onChange: (s: State["strokes"]) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const active = useRef(false);
  const { t } = useI18n();
  const [color, setColor] = useState("#b54a38");
  const [width, setWidth] = useState(5);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 1000, 650);
    for (const stroke of strokes) {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width || 5;
      ctx.lineCap = "round";
      stroke.points.forEach(([x, y], i) =>
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
      );
      ctx.stroke();
    }
    ctx.clearRect(400, 175, 200, 290);
  }, [strokes, width]);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width) * 1000,
      ((e.clientY - r.top) / r.height) * 650,
    ];
  };
  return (
    <>
      <div className="drawing-tools">
        <input
          aria-label={t("drawing.color")}
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <label>
          {t("drawing.thickness")}{" "}
          <input
            type="range"
            min="2"
            max="15"
            value={width}
            onChange={(e) => setWidth(+e.target.value)}
          />
        </label>
        <button
          className="secondary"
          onClick={() => onChange(strokes.slice(0, -1))}
        >
          {t("drawing.undo")}
        </button>
      </div>
      <div className="drawing">
        <canvas
          width={1000}
          height={650}
          ref={ref}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            active.current = true;
            onChange([...strokes, { color, width, points: [point(e)] }]);
          }}
          onPointerMove={(e) => {
            if (!active.current) return;
            const last = strokes.at(-1);
            if (last)
              onChange([
                ...strokes.slice(0, -1),
                { ...last, points: [...last.points, point(e)] },
              ]);
          }}
          onPointerUp={() => {
            active.current = false;
          }}
          onPointerCancel={() => {
            active.current = false;
          }}
        />
        <img src={cardSrc(id)} alt={t("drawing.alt")} />
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
function Adapted({
  ex,
  s,
  update,
  field,
  people,
  inspect,
  finish,
  cards,
}: {
  ex: Exercise;
  s: State;
  update: (s: Partial<State>) => void;
  field: (k: string, l: string, p?: string) => React.ReactNode;
  people: () => React.ReactNode;
  inspect: (id: number) => void;
  finish: () => React.ReactNode;
  cards: number[];
}) {
  const { t, tList } = useI18n();
  const bridgeSteps = tList("adapted.bridgeSteps");
  const base = ex.id.split("-")[0];
  const count = ex.category === 1 ? 2 : s.people;
  const need =
    base === "now"
      ? ex.category === 1
        ? 2
        : 1
      : base === "bridge"
        ? 3
        : base === "future"
          ? 5
          : 1;
  const [peek, setPeek] = useState(0);
  const begin = () => update({ stage: 1, turn: 0, selected: [], hands: [] });
  if (s.stage === 0)
    return (
      <>
        {ex.category !== 1 && people()}
        {["bridge", "future"].includes(base) && (
          <label className="field">
            {t("adapted.topicLabel")}
            <input
              value={s.topic}
              onChange={(e) => update({ topic: e.target.value })}
              placeholder={t("adapted.topicPlaceholder")}
            />
          </label>
        )}
        <button
          className="primary"
          disabled={["bridge", "future"].includes(base) && !s.topic.trim()}
          onClick={begin}
        >
          {t("adapted.start")}
        </button>
      </>
    );
  if (s.stage === 1)
    return (
      <>
        <h2>
          {t("adapted.participant", { n: s.turn + 1 })} ·{" "}
          {base === "now" && ex.category === 1
            ? s.selected.length === 0
              ? t("adapted.cardMyState")
              : t("adapted.cardOurCommunication")
            : base === "bridge"
              ? bridgeSteps[s.selected.length]
              : t("adapted.chooseImages")}
        </h2>
        <div className="spread">
          {cards.map((id) => (
            <Card
              key={id}
              id={id}
              selected={s.selected.includes(id)}
              onClick={() => {
                setPeek(id);
                update({
                  selected: s.selected.includes(id)
                    ? s.selected.filter((c) => c !== id)
                    : s.selected.length < (base === "future" ? 7 : need)
                      ? [...s.selected, id]
                      : s.selected,
                });
              }}
            />
          ))}
        </div>
        {peek > 0 && (
          <button className="secondary" onClick={() => inspect(peek)}>
            {t("adapted.inspectSelected")}
          </button>
        )}
        <p>
          {t("adapted.selectedCount", {
            count: base === "future" ? 7 : need,
            selected: s.selected.length,
            need: base === "future" ? need + "–7" : need,
          })}
        </p>
        <button
          className="primary"
          disabled={s.selected.length < need}
          onClick={() => {
            const hands = [...s.hands, s.selected];
            update({
              hands,
              selected: s.turn + 1 === count ? hands.flat() : [],
              turn: s.turn + 1 === count ? 0 : s.turn + 1,
              stage: s.turn + 1 === count ? 2 : 1,
            });
          }}
        >
          {s.turn + 1 < count
            ? t("adapted.confirmNext")
            : t("adapted.confirmShare")}
        </button>
      </>
    );
  return (
    <>
      {base === "future" ? (
        <>
          <h2>{t("adapted.futureTitle", { topic: s.topic })}</h2>
          <Composition
            ids={Array.from(new Set(s.selected))}
            positions={s.positions}
            setPositions={(positions) => update({ positions })}
            inspect={inspect}
          />
          {field(
            "Общо_бъдеще",
            t("adapted.futureMeet"),
          )}
          {field("Заглавие", t("adapted.futureName"))}
        </>
      ) : base === "bridge" ? (
        <>
          {s.hands.map((h, i) => (
            <section className="paper" key={i}>
              <h2>{t("adapted.bridgeOf", { n: i + 1 })}</h2>
              <div className="bridge">
                {[0, 2, 1].map((j) => (
                  <div key={j}>
                    <h3>{bridgeSteps[j]}</h3>
                    <Card id={h[j]} onClick={() => inspect(h[j])} />
                    {field(`Мост_${i}_${j}`, t("adapted.seeInImage"))}
                  </div>
                ))}
              </div>
            </section>
          ))}
          {field(
            "Сравнение",
            t("adapted.compare"),
          )}
        </>
      ) : base === "perspective" ? (
        <>
          <Card
            id={s.hands[s.turn][0]}
            large
            onClick={() => inspect(s.hands[s.turn][0])}
          />
          {field(
            "Проблем_" + s.turn,
            t("adapted.problem", { n: s.turn + 1 }),
          )}
          {s.hands.map(
            (_, i) =>
              i !== s.turn &&
              field(
                `Решение_${s.turn}_${i}`,
                t("adapted.solution", { n: i + 1 }),
              ),
          )}
          {field("Условия_" + s.turn, t("adapted.conditions"))}
        </>
      ) : base === "coffee" ? (
        <>
          <h2>{t("adapted.coffeeTitle", { n: s.turn + 1 })}</h2>
          <Card
            id={s.hands[s.turn][0]}
            large
            onClick={() => inspect(s.hands[s.turn][0])}
          />
          {field(
            "Разказ_" + s.turn,
            t("adapted.story"),
          )}
          {field(
            "Слушател_" + s.turn,
            t("adapted.listener", { n: ((s.turn + 1) % count) + 1 }),
          )}
          {field("Потвърждение_" + s.turn, t("adapted.confirmation"))}
        </>
      ) : (
        <>
          <div className="participants">
            {s.hands.map((h, i) => (
              <section className="paper" key={i}>
                <h2>{t("adapted.participant", { n: i + 1 })}</h2>
                <div className="row">
                  {h.map((id, j) => (
                    <div key={j}>
                      <Card id={id} onClick={() => inspect(id)} />
                      <p>
                        {j === 0
                          ? t("adapted.myState")
                          : t("adapted.ourCommunication")}
                      </p>
                    </div>
                  ))}
                </div>
                {field(
                  "Състояние_" + i,
                  ex.category === 3
                    ? t("adapted.stateToday")
                    : t("adapted.stateCard"),
                )}
                {ex.category === 1 &&
                  field("Общуване_" + i, t("adapted.communication"))}
              </section>
            ))}
          </div>
          {field("Сходства", t("adapted.similarities"))}
        </>
      )}
      {["coffee", "perspective"].includes(base) && s.turn + 1 < count && (
        <button
          className="primary"
          onClick={() => update({ turn: s.turn + 1 })}
        >
          {t("adapted.nextParticipant")}
        </button>
      )}
      {finish()}
    </>
  );
}

function groupMembers(total: number, index: number) {
  const groups = Math.ceil(total / 4);
  return Array.from({ length: total }, (_, i) => i + 1).filter(
    (_, i) => i % groups === index,
  );
}
