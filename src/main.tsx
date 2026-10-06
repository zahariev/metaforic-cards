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
  categories,
  exercises,
  library,
  deck,
  decks,
  cardSrc,
  cardLabel,
  shuffle,
  type Exercise,
} from "./data";
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
};
const FIRST_LINE = "Какво искаш да ми покажеш?";
// Choosing the first card alone doesn't count; writing or moving past the first step does.
function started(d: State, base: string) {
  return (
    d.stage > (base === "dialogue" ? 1 : 0) ||
    !!d.topic.trim() ||
    Object.values(d.answers).some((v) => v?.trim()) ||
    d.lines.some((l, i) => l.trim() && !(i === 0 && l === FIRST_LINE)) ||
    d.words.some((w) => w?.trim()) ||
    d.strokes.length > 0
  );
}
// Which deck each exercise draws from, chosen in Settings. Defaults to Diarc.
type DeckChoice = Record<string, string>;
const DECK_CHOICE = "mc-exercise-decks";
const deckFor = (choice: DeckChoice, base: string) =>
  decks.find((d) => d.key === choice[base]) ?? decks[0];
const exerciseCards = (base: string) =>
  deckFor(read<DeckChoice>(DECK_CHOICE, {}), base).ids;
const initial = (cards = deck): State => ({
  stage: 0,
  topic: "",
  selected: [],
  answers: {},
  pool: shuffle(cards),
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
  return (
    <button
      type="button"
      className={`card ${hidden ? "back" : ""} ${selected ? "selected" : ""} ${large ? "large" : ""}`}
      onClick={onClick}
      aria-label={hidden ? "Изтегли скрита карта" : `Карта ${cardLabel(id)}`}
    >
      {hidden ? (
        <>
          <Leaf size={40} />
          <span>Метафорични карти</span>
        </>
      ) : (
        <img
          src={cardSrc(id)}
          alt={`Метафорична карта ${cardLabel(id)}`}
          draggable={false}
        />
      )}
    </button>
  );
}
function App() {
  const [inspect, setInspect] = useState(0);
  const [favorites, setFavorites] = useLocal<number[]>("mc-favorites", []);
  return (
    <HashRouter>
      <div className="app">
        <aside>
          <Link className="brand" to="/">
            <span className="brand-leaf">◒</span>
            <span>
              Работа с<br />
              <b>метафорични карти</b>
            </span>
          </Link>
          <nav>
            {[
              ["/", "Начало", Home],
              ["/exercises", "Упражнения", BookOpen],
              ["/deck", "Колода карти", Layers],
              ["/notes", "Моите записки", NotebookPen],
              ["/favorites", "Любими", Heart],
              ["/settings", "Настройки", Settings],
            ].map(([path, label, Icon]) => (
              <NavLink key={String(path)} to={String(path)} end={path === "/"} className={({isActive})=>isActive?"active":""}>
                {React.createElement(Icon as typeof Home, { size: 18 })}
                {String(label)}
              </NavLink>
            ))}
          </nav>
          <div className="aside-bottom">
            <Leaf size={65} />
            <p>
              Вдъхновение
              <br />
              за по-дълбоки разговори
            </p>
            <small>По книгата на Яна Аврамова</small>
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
              aria-label="Затвори"
            >
              <X />
            </button>
            <img src={cardSrc(inspect)} alt={`Карта ${cardLabel(inspect)}`} />
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
                ? "Премахни от любими"
                : "Добави в любими"}
            </button>
          </div>
        </div>
      )}
    </HashRouter>
  );
}
function Library({ home = false }: { home?: boolean }) {
  const [cat, setCat] = useLocal("mc-filter-category", -1);
  const [q, setQ] = useState("");
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
      e.title.toLocaleLowerCase("bg").includes(q.toLocaleLowerCase("bg")),
  );
  return (
    <div className="library">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ПРОСТРАНСТВО ЗА ОТКРИВАНЕ</p>
          <h1>{home ? "Една карта. Много възможности." : "Упражнения"}</h1>
          <p>
            {home
              ? "Спри за момент. Разгледай образите. Чуй собствените си асоциации."
              : "Практически идеи за работа с метафорични карти"}
          </p>
        </div>
        <label className="search">
          <Search size={17} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Търси упражнение…"
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
              Разгледай {count(i)} упражнения <ArrowRight size={15} />
            </span>
            <Leaf className="decoration" />
          </button>
        ))}
      </div>
      <div className="quote">„Една картина казва повече от хиляди думи.“</div>
      <div className="list-heading" ref={listRef}>
        <h2>{cat < 0 ? "Избери своето упражнение" : categories[cat].title}</h2>
        {cat >= 0 && (
          <button className="text-button" onClick={() => setCat(-1)}>
            <X size={13} /> Всички упражнения
          </button>
        )}
        <label className="toggle">
          <input
            type="checkbox"
            checked={adapt}
            onChange={(e) => setAdapt(e.target.checked)}
          />{" "}
          Включи адаптациите от книгата
        </label>
        <span>{shown.length} упражнения</span>
      </div>
      <div className={`exercise-list ${cat < 0 ? "" : "filtered"}`}>
        {shown.map((e, i) => (
          <Link className="exercise-tile" to={`/exercise/${e.id}`} key={e.id}>
            <div className="tile-image">
              <img
                src={`${import.meta.env.BASE_URL}cards/${[3, 17, 29, 8, 44, 21, 12][i % 7]}.jpg`}
                alt=""
              />
              {/* The category is already clear from the active filter. */}
              {(cat < 0 || e.adaptation) && (
                <span className={`tag c${e.category}`}>
                  {e.adaptation ? "Адаптация" : categories[e.category].title}
                </span>
              )}
              {unfinished.has(e.id) && (
                <span className="unfinished-badge">
                  <NotebookPen size={12} /> Незавършено
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
                <span>{e.face} карти</span>
                <ArrowRight size={19} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!shown.length && <p>Няма упражнения за това търсене.</p>}
      <footer>
        Образите нямат предварително зададено значение. Ти определяш какво
        означават за теб.
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
  const [tab, setTab] = useLocal("mc-deck-tab", 0, (v) => !decks[v]);
  if (ids) {
    return (
      <div className="library">
        <p className="eyebrow">ОБРАЗИ ЗА ТВОИТЕ АСОЦИАЦИИ</p>
        <h1>Любими карти</h1>
        <p>
          {ids.length} карти · Избери изображение, за да го разгледаш отблизо.
        </p>
        <div className="spread deck-spread">
          {ids.map((id) => (
            <Card key={id} id={id} onClick={() => inspect(id)} />
          ))}
        </div>
        {!ids.length && (
          <p>Добави любими карти от увеличения изглед на изображението.</p>
        )}
      </div>
    );
  }
  const current = decks[tab];
  return (
    <div className="library">
      <p className="eyebrow">ОБРАЗИ ЗА ТВОИТЕ АСОЦИАЦИИ</p>
      <h1>Колода карти</h1>
      <p>
        {current.ids.length} карти · Избери изображение, за да го разгледаш
        отблизо.
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
          <p className="eyebrow">МОЕТО ПРОСТРАНСТВО</p>
          <h1>Моите записки</h1>
          <p>Мисли, истории и открития, които искаш да запазиш.</p>
        </div>
        <button
          className="secondary"
          disabled={!sessions.length}
          onClick={download}
        >
          <Download size={17} /> Експорт
        </button>
      </div>
      {sessions.length === 0 ? (
        <div className="empty">
          <NotebookPen size={40} />
          <h2>Тук ще живеят твоите открития.</h2>
          <p>Завърши упражнение и запази размислите си.</p>
          <Link className="primary" to="/exercises">
            Към упражненията <ArrowRight size={16} />
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
                  {new Date(s.date).toLocaleString("bg-BG")} · {s.data.topic}
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
                      <b>{k.replaceAll("_", " ")}</b>
                      <br />
                      {v}
                    </p>
                  ))}
                {s.data.lines.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
                {s.data.strokes.length > 0 && (
                  <p>Рисунката е включена в експорта и запазената сесия.</p>
                )}
                <button
                  className="secondary"
                  onClick={() => {
                    write("mc-draft-" + s.exercise, s.data);
                    location.hash = "/exercise/" + s.exercise;
                  }}
                >
                  Отвори сесията
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    if (confirm("Да изтрия тази записка?"))
                      setSessions(sessions.filter((n) => n.id !== s.id));
                  }}
                >
                  Изтрий
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
  const [choice, setChoice] = useLocal<DeckChoice>(DECK_CHOICE, {});
  const setAll = (key: string) =>
    setChoice(Object.fromEntries(exercises.map((e) => [e.id, key])));
  return (
    <section className="settings-card">
      <h2>Карти за упражненията</h2>
      <p>Избери от коя колода да се теглят картите във всяко упражнение.</p>
      <div className="row deck-all">
        <span>За всички:</span>
        {decks.map((d) => (
          <button key={d.key} className="secondary" onClick={() => setAll(d.key)}>
            {d.title}
          </button>
        ))}
      </div>
      <ul className="deck-bindings">
        {exercises.map((e) => {
          const current = deckFor(choice, e.id);
          return (
            <li key={e.id}>
              <span>{e.title}</span>
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
            </li>
          );
        })}
      </ul>
      <p className="hint">
        Важи и за вариантите на упражнението по двойки, в група и с деца.
        Започнато упражнение продължава със своите карти.
      </p>
    </section>
  );
}
function SettingsPage() {
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
          `Да възстановя ${entries.length} записа от файла? Текущите данни със същите имена ще бъдат заменени.`,
        )
      )
        return;
      if (!entries.every(([k, v]) => write(k, v)))
        alert("Част от данните не можаха да бъдат запазени.");
      location.reload();
    } catch {
      alert("Файлът не е валидно резервно копие.");
    }
  };
  const wipe = () => {
    if (
      !confirm(
        "Да изтрия ли всички записки, любими карти и незавършени упражнения? Това не може да се отмени.",
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
          <p className="eyebrow">ТВОЕТО ПРОСТРАНСТВО</p>
          <h1>Настройки</h1>
          <p>
            Всичко, което записваш, се пази само в този браузър на това
            устройство.
          </p>
        </div>
      </div>
      <DeckSettings />
      <section className="settings-card">
        <h2>Твоите данни</h2>
        <div className="stats">
          <div>
            <b>{notes}</b>
            <span>записки</span>
          </div>
          <div>
            <b>{favorites}</b>
            <span>любими карти</span>
          </div>
          <div>
            <b>{drafts}</b>
            <span>упражнения в процес</span>
          </div>
        </div>
        <div className="row">
          <button className="primary" onClick={backup}>
            <Download size={16} /> Изтегли резервно копие
          </button>
          <label className="secondary">
            <Upload size={16} /> Възстанови от файл
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
          Резервното копие съдържа записките, любимите карти и незавършените
          упражнения. С него можеш да пренесеш данните си на друго устройство
          или в друг браузър.
        </p>
      </section>
      <section className="settings-card">
        <h2>Изчисти всичко</h2>
        <p>
          Изтрива всички записки, любими карти и незавършени упражнения от този
          браузър.
        </p>
        <button className="secondary danger" onClick={wipe}>
          <Trash2 size={16} /> Изтрий всички данни
        </button>
      </section>
    </div>
  );
}
function Workspace({ inspect }: { inspect: (id: number) => void }) {
  const { id = "now" } = useParams();
  const ex = library.find((e) => e.id === id);
  return ex ? (
    <ExerciseWorkspace key={id} ex={ex} inspect={inspect} />
  ) : (
    <div className="library">
      <h1>Упражнението не е намерено</h1>
      <Link to="/exercises">Към упражненията</Link>
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
  const base = ex.id.split("-")[0];
  const [cards] = useState(() => exerciseCards(base));
  const key = "mc-draft-" + ex.id;
  const [resumed, setResumed] = useState(() => {
    const d = read<State>(key, initial(cards));
    return !d.done && started(d, base);
  });
  // Saved or not-yet-started drafts reopen at the first step: choosing a card.
  const [s, set] = useLocal<State>(
    key,
    initial(cards),
    (d) => !!d.done || !started(d, base),
  );
  const [saved, setSaved] = useState(false);
  const [choice, setChoice] = useState(0);
  const [draftLine, setDraftLine] = useState("");
  const update = (v: Partial<State>) => set((p) => ({ ...p, ...v }));
  const answer = (key: string, v: string) =>
    set((p) => ({ ...p, answers: { ...p.answers, [key]: v } }));
  const field = (
    key: string,
    label: string,
    placeholder = "Запиши своите мисли тук…",
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
  const next = (label = "Продължи", disabled = false, fn?: () => void) => (
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
      alert(
        "Упражнението не можа да бъде запазено – паметта на браузъра е пълна. Изтрий стари записки или ги изтегли.",
      );
      return;
    }
    setSaved(true);
  };
  const finish = () => (
    <div className="finish">
      <p>Отдели момент за това, което искаш да вземеш със себе си.</p>
      {field("Финален_размисъл", "Какво откри в това упражнение?")}
      <button className="primary" onClick={save} disabled={saved}>
        <Check size={17} />
        {saved ? "Запазено в „Моите записки“" : "Запази упражнението"}
      </button>
      {saved && (
        <Link className="secondary" to="/notes">
          Виж записките
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
          ? "Изтегляне без повторение"
          : `${s.selected.length} / ${count} избрани · Натисни избрана карта отново, за да я върнеш.`}
      </p>
    </>
  );
  const selected = () => (
    <div className="row">
      {s.selected.map((id, i) => (
        <div className="card-wrap" key={i}>
          <Card id={id} large onClick={() => inspect(id)} />
          <button className="inspect" onClick={() => inspect(id)}>
            <Expand size={14} /> Разгледай
          </button>
        </div>
      ))}
    </div>
  );
  const topic = () => (
    <label className="field">
      Какво искаш да изследваш?
      <input
        value={s.topic}
        onChange={(e) => update({ topic: e.target.value })}
        placeholder="Тема, въпрос, ситуация…"
      />
    </label>
  );
  const people = () => (
    <label className="field">
      Брой участници
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
    label: "Отначало",
    ask: "Започни това упражнение отначало?",
    run: () => {
      set(initial(cards));
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
    const steps: {
      title: string;
      questions: string[];
      sentences?: string[];
      choice?: boolean;
    }[] =
      base === "now"
        ? [
            {
              title: "Погледни картата",
              questions: [
                "Какво те привлече в нея?",
                "Какво се случва в изображението?",
                "Каква е атмосферата?",
                "Какво усещане предизвиква у теб?",
              ],
            },
            {
              title: "Открий себе си в нея",
              questions: [
                "Кое в картата най-силно отразява настоящото ти състояние?",
                "Има ли детайл, образ или усещане, в което разпознаваш нещо от себе си?",
                "Има ли нещо, което не си осъзнавал преди да я избереш?",
              ],
            },
            {
              title: "Довърши изреченията",
              questions: [],
              sentences: [
                "Точно сега се чувствам…",
                "В момента най-много ме занимава…",
                "Забелязвам, че…",
                "Имам нужда от…",
                "Иска ми се…",
              ],
            },
            {
              title: "Най-важното",
              questions: [
                "Кое от това, което откри, е най-важно за теб точно сега?",
              ],
            },
          ]
        : [
            {
              title: "Погледни картата",
              questions: [
                "Какво в нея те отблъсква?",
                "Какво чувство предизвиква у теб?",
                "Какво ти се иска да избегнеш в този образ?",
              ],
            },
            {
              title: "Друга гледна точка",
              questions: [
                "Отвъд това, което те отблъсква, дразни или плаши, има ли нещо, което можеш да интерпретираш по различен начин?",
                "Има ли нещо, което дори ти допада?",
              ],
            },
            {
              title: "Отново избор",
              questions: [
                "Тази карта все още ли би била последната, която би избрал?",
              ],
              choice: true,
            },
          ];
    const step = Math.min(s.stage, steps.length);
    const current = steps[step];
    const card = s.selected[0];
    progress = <StepCount current={step + 1} total={steps.length + 1} />;
    lead =
      step === 0
        ? base === "now"
          ? "Избери карта, която най-силно те привлича в този момент."
          : "Избери картата, която най-малко би искал да избереш."
        : current
          ? "Остани с избраната карта и потърси своите отговори."
          : "Отдели момент за това, което искаш да вземеш със себе си.";
    const panel = (
      <div className="side-panel">
        {current ? (
          <>
            <h3>{current.title}</h3>
            {current.questions.length > 0 && (
              <ul className="questions">
                {current.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            )}
            {current.sentences ? (
              current.sentences.map((t) => (
                <label className="mini-field" key={t}>
                  {t}
                  <input
                    value={s.answers[t] || ""}
                    onChange={(e) => answer(t, e.target.value)}
                  />
                </label>
              ))
            ) : (
              <textarea
                value={s.answers[current.title] || ""}
                onChange={(e) => answer(current.title, e.target.value)}
                placeholder="Запиши своите мисли тук…"
              />
            )}
            {current.choice && (
              <div className="row">
                {["Да", "Не", "Не съм сигурен"].map((v) => (
                  <button
                    className={
                      s.answers["Избор"] === v ? "primary" : "secondary"
                    }
                    onClick={() => answer("Избор", v)}
                    key={v}
                  >
                    {v}
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
                  Назад
                </button>
              )}
              {next("Продължи", !card, () => update({ stage: step + 1 }))}
            </div>
          </>
        ) : (
          <>
            <h3>Финален размисъл</h3>
            {finish()}
            <button
              className="text-button"
              onClick={() => update({ stage: step - 1 })}
            >
              Назад
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
    const labels = [
      "Къде съм сега?",
      "Къде искам да бъда?",
      "Какво ще ми помогне?",
    ];
    const hints = [
      "Каква е настоящата ми ситуация? Как се чувствам?",
      "Как изглежда желаното бъдеще? Как ще разбера, че съм там?",
      "Какви ресурси, качества или стъпки ще ми помогнат?",
    ];
    progress = <Steps current={done >= n ? 3 : (done % 3) + 1} total={3} />;
    lead =
      done < n
        ? "Изтегли по една карта за всяка позиция на моста."
        : "Погледни трите карти като една обща картина.";
    content = (
      <div className="board board-side">
        <div>
          {Array.from({ length: n / 3 }, (_, r) => (
            <div key={r}>
              {pair && <p className="eyebrow">Участник {r + 1}</p>}
              <div className="bridge-row">
                {/* Drawn as now → future → helper, shown as now → helper → future. */}
                {[0, 2, 1].map((k, j) => {
                  const i = r * 3 + k;
                  const id = s.selected[i];
                  const key = labels[k].slice(0, -1) + i;
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
              Следваща карта: {labels[done % 3]} · натисни нейния гръб.
            </p>
          )}
        </div>
        <div className="side-panel">
          <h3>Моите размисли</h3>
          <label className="mini-field">
            Тема
            <input
              value={s.topic}
              onChange={(e) => update({ topic: e.target.value })}
              placeholder="Тема, въпрос, ситуация…"
            />
          </label>
          <textarea
            value={s.answers["Обща_картина"] || ""}
            onChange={(e) => answer("Обща_картина", e.target.value)}
            placeholder={
              pair
                ? "Какви сходства, различия и общи възможности виждате?"
                : "Какво виждаш, когато разглеждаш трите карти като една обща картина?"
            }
          />
          {done === n && finish()}
        </div>
      </div>
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
        "Формулирай въпроса, с който искаш да стигнеш до същността."
      ) : roundOver ? (
        `Кръг ${s.round} завърши. Картите, които запази, продължават в следващия кръг.`
      ) : s.stage === 1 ? (
        <>
          Погледни трите карти. Коя от тях най-много резонира с въпроса?
          <br />
          Следващата стъпка ще те доближи до същността.
        </>
      ) : (
        "Това е картата, която остана. Какво ти казва тя?"
      );
    content =
      s.stage === 0 ? (
        <div className="paper narrow">
          {topic()}
          {next("Разбъркай и започни", !s.topic.trim())}
        </div>
      ) : roundOver ? (
        <div className="board board-side">
          <div className="round-end">
            <p className="remaining">
              <Layers size={15} />
              <span>
                Кръг {s.round} завърши · запазени <b>{s.winners.length}</b> карти
              </span>
            </p>
            <div className="spread deck-spread">
              {s.winners.map((id) => (
                <Card key={id} id={id} onClick={() => inspect(id)} />
              ))}
            </div>
            {next(`Започни кръг ${s.round + 1}`, false, nextRound)}
          </div>
          <div className="side-panel">
            <h3>Въпрос на този етап:</h3>
            <p className="question-box">{s.topic}</p>
            <p className="note-box">
              В кръг {s.round + 1} ще избираш отново по една от три, само сред
              тези {s.winners.length} карти.
            </p>
          </div>
        </div>
      ) : s.stage === 1 ? (
        <div className="board board-side">
          <div>
            <p className="remaining">
              <Layers size={15} />
              <span>
                Остават <b>{s.pool.length}</b> карти
              </span>
              <span>Кръг {s.round}</span>
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
                <small>Запазени в този кръг</small>
                {s.winners.map((id) => (
                  <Card key={id} id={id} onClick={() => inspect(id)} />
                ))}
              </div>
            )}
          </div>
          <div className="side-panel">
            <h3>Въпрос на този етап:</h3>
            <p className="question-box">{s.topic}</p>
            <p className="note-box">
              Щом избереш карта, продължаваме с нови три, за да стигнем до
              най-същественото.
            </p>
          </div>
        </div>
      ) : (
        <div className="board board-focus">
          <Preview id={s.selected[0]} inspect={inspect} />
          <div className="side-panel">
            <h3>Същността</h3>
            {field("Връзка", "Как я свързваш с темата, от която тръгна?")}
            {field(
              "Нова_идея",
              "Какво ново ти хрумва, когато я погледнеш сега?",
            )}
            {field(
              "Действие",
              "Хрумва ли ти нещо, което би искал да направиш?",
            )}
            {finish()}
          </div>
        </div>
      );
  } else if (base === "why") {
    const ord = ["първото", "второто", "третото", "четвъртото", "петото"];
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
        ? "Върни се към темата. Кой отговор те изненада най-много?"
        : `Избери карта за ${ord[w - 1]} „защо“ и отговори на въпроса.`;
    content = (
      <div className="board board-why">
        <ol className="why-list">
          {Array.from({ length: 5 }, (_, i) => (
            <li
              key={i}
              className={i + 1 === w ? "current" : i + 1 < w ? "done" : ""}
            >
              <span className="num">{i + 1}</span>
              <span>Защо това е важно за мен?</span>
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
                  Първо запиши темата, после изтегли една от скритите карти.
                </p>
              )}
              <label className="field">
                Защо „{prev || "това"}“ е важно за мен?
                <textarea
                  value={s.answers["Отговор_" + w] || ""}
                  onChange={(e) => answer("Отговор_" + w, e.target.value)}
                  placeholder="Запиши отговора си тук…"
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
                      Този ме изненада
                    </button>
                  </div>
                ))}
              </div>
              {finish()}
            </>
          )}
        </div>
        <div className="side-panel">
          <h3>Моята верига от отговори</h3>
          {s.topic && <p className="small-note">Тема: {s.topic}</p>}
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
                Назад
              </button>
            )}
            {w <= 5 &&
              next(
                "Продължи",
                !card || !s.answers["Отговор_" + w]?.trim(),
                () => update({ stage: w + 1 }),
              )}
          </div>
        </div>
      </div>
    );
  } else if (base === "dialogue") {
    const inspiration = [
      "Какво виждаш в мен?",
      "Какво е важно да знам сега?",
      "Какво ме спира?",
      "Какъв съвет би ми дала?",
      "Какво не забелязвам?",
      "Каква е първата стъпка?",
      "Какво още?",
    ];
    // Even lines are mine, odd lines are the card's.
    const cardTurn = s.lines.length % 2 === 1;
    const send = () => {
      if (!draftLine.trim()) return;
      update({ lines: [...s.lines, draftLine.trim()] });
      setDraftLine("");
    };
    lead =
      s.stage === 0
        ? "Запиши темата си и изтегли скрита карта."
        : "Проведи диалог с избраната карта. Пиши свободно, без да цензурираш отговорите.";
    if (s.stage > 0)
      reset = {
        label: "Изчисти",
        ask: "Да изчистя ли разговора?",
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
                lines: [FIRST_LINE],
              })
            }
          />
          <p className="hint">Натисни картата, за да я изтеглиш.</p>
        </div>
      ) : (
        <>
          <div className="board board-dialogue">
            <Preview id={s.selected[0]} inspect={inspect} />
            <div className="chat">
              <div className="chat-lines">
                {s.lines.map((line, i) => (
                  <div className={`chat-row ${i % 2 ? "card-says" : ""}`} key={i}>
                    <b>{i % 2 ? "КАРТАТА:" : "АЗ:"}</b>
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
                          ? "Какво ти хрумва от името на картата?"
                          : "Твоят въпрос"
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
                <span>{cardTurn ? "КАРТАТА" : "АЗ"}</span>
                <input
                  value={draftLine}
                  onChange={(e) => setDraftLine(e.target.value)}
                  placeholder={
                    cardTurn
                      ? "Какво отговаря картата?…"
                      : "Продължи диалога…"
                  }
                />
                <button
                  className="send"
                  type="submit"
                  aria-label="Изпрати"
                  disabled={!draftLine.trim()}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
            <div className="side-panel">
              <h3>Въпроси за вдъхновение</h3>
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
                {saved ? "Запазено в „Моите записки“" : "Запази разговора"}
              </button>
              {saved && (
                <Link className="text-button" to="/notes">
                  Виж записките
                </Link>
              )}
            </div>
          </div>
          {s.lines.some((l, i) => i % 2 && l.trim()) && (
            <div className="paper dialogue-after">
              <h3>
                Отбележи изречението, което най-силно те докосна или изненада.
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
              {field("Финален_размисъл", "Какво откри в този разговор?")}
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
        ? "Картите са скрити. Редувайте се и запазвайте вече разказаното."
        : "Историята е готова. Дайте ѝ заглавие.";
    content = (
      <>
        {!dealt && ex.category !== 1 && people()}
        <div className="story-cards">
          {cards.map((id, i) => (
            <div key={i}>
              <small>{i === total - 1 ? "ФИНАЛ" : `Ход ${i + 1}`}</small>
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
                <small>Участник {(i % players) + 1}</small>
                {l}
              </p>
            ))}
          </div>
        )}
        {s.turn < total ? (
          <>
            <h2>
              Участник {(s.turn % players) + 1} ·{" "}
              {s.turn === 0
                ? "Започни историята"
                : s.turn === total - 1
                  ? "Завърши историята"
                  : "Продължи историята"}
            </h2>
            {s.revealed ? (
              <>
                {field(
                  "Текущ_разказ",
                  "Добави 2–3 изречения, вдъхновени от новата карта.",
                )}
                {next(
                  "Запази този ход",
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
                Натисни картата за ход {s.turn + 1}, за да я обърнеш.
              </p>
            )}
          </>
        ) : (
          <>
            {field("Заглавие", "Как ще се казва историята?")}
            {field("Обрат", "Кой обрат те изненада най-много?")}
            {finish()}
          </>
        )}
      </>
    );
  } else if (base === "coffee") {
    content =
      s.stage === 0 ? (
        <>
          <h2>
            Участник {s.selected.length + 1}: избери изображение, което те
            грабва.
          </h2>
          {choose(2)}
          {next("Започнете разговора", s.selected.length < 2)}
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
              Разказва участник {(s.turn % 2) + 1} · Слуша участник{" "}
              {((s.turn + 1) % 2) + 1}
            </p>
          </div>
          <div>
            <h2>Разкажи ми повече…</h2>
            {field(
              "Разказ_" + s.turn,
              "Какво те привлече? Какви асоциации, спомени или желания събужда образът?",
            )}
            {field(
              "Обобщение_" + s.turn,
              "Слушател: Разбирам, че… Правилно ли те разбрах?",
            )}
            <div className="row">
              {["Потвърждавам", "Допълвам", "Поправям"].map((v) => (
                <button
                  key={v}
                  className={
                    s.answers["Проверка_" + s.turn] === v
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() => answer("Проверка_" + s.turn, v)}
                >
                  {v}
                </button>
              ))}
            </div>
            {field(
              "Уточнение_" + s.turn,
              "Допълнение или поправка (по желание)",
            )}
            {next("Разменете ролите", false, () =>
              update({ turn: s.turn + 1 }),
            )}
            <button
              className="secondary"
              onClick={() => update({ stage: 0, selected: [] })}
            >
              Още една карта
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
            <p>Една и съща карта за проблем и решение.</p>
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
                  `Участник ${(s.turn % 2) + 1} · Въображаем проблем`,
                )}
                {field(
                  "Решение_" + s.turn,
                  `Участник ${((s.turn + 1) % 2) + 1} · Решение от същия образ`,
                )}
                {field("Въпрос_" + s.turn, "Един уточняващ въпрос")}
                {field("Уточнение_" + s.turn, "Отговор и допълване на идеята")}
              </div>
            </div>
            {next("Нов кръг · размени ролите", false, () =>
              update({
                selected: [s.pool[0]],
                pool: s.pool.slice(1),
                turn: s.turn + 1,
                lines: [
                  ...s.lines,
                  `Карта ${s.selected[0]} · ${s.answers["Проблем_" + s.turn] || ""} → ${s.answers["Решение_" + s.turn] || ""}`,
                ],
              }),
            )}
            {field(
              "Променена_гледна_точка",
              "Коя използвана карта вече виждате по различен начин?",
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
              ? "Подредете картите в групи без думи. След пет минути обсъдете връзките."
              : "Изтеглете карта и я поставете при едно или между две чувства. Можете да смените своята карта."}
          </p>
          {next("Раздай по една карта", false, () => {
            deal(1);
            update({ timer: base === "cluster" ? 300 : 0 });
          })}
        </>
      ) : (
        <>
          <div className="table-labels">
            {(base === "feelings"
              ? ["Радост", "Тъга", "Страх", "Гняв", "Отвращение"]
              : ["Група 1", "Група 2", "Група 3"]
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
                    Смени карта · {i + 1}
                  </button>
                ))}
              </div>
              {field("Обяснения", "Тази карта ми напомня за…, защото…")}
            </>
          )}
          {(s.stage >= 2 || base === "feelings") && (
            <>
              {field(
                "Връзки",
                base === "cluster"
                  ? "Какво свързва тези карти?"
                  : "Някой вижда ли друго чувство в някоя от картите?",
              )}
              {field(
                "Преживяване",
                base === "cluster"
                  ? "Как успяхте да се разберете без думи? Какво ви изненада? Какво помогна на всеки да намери своето място?"
                  : "Човек се чувства така, когато…",
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
                Нов кръг · нови карти
              </button>
              {base === "cluster" && (
                <button
                  className="secondary"
                  onClick={() =>
                    update({ stage: 1, timer: 300, positions: {} })
                  }
                >
                  Същите карти · различен признак
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
          {next("Раздай картите", false, () => deal(1))}
        </>
      ) : (
        <>
          <h2>Кръг {s.round} · Картите остават. Думите се движат наляво.</h2>
          <div className="participants">
            {s.hands.map((h, i) => (
              <section className="paper" key={i}>
                <h3>Участник {i + 1}</h3>
                <Card id={h[0]} onClick={() => inspect(h[0])} />
                <label className="field">
                  {s.round === 1 ? "Една свързана дума" : "Получена дума"}
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
                  "Как свързвам думата с моята карта?",
                )}
              </section>
            ))}
          </div>
          {next(
            "Предай думите наляво",
            s.words.filter(Boolean).length < s.people,
            () =>
              update({
                words: s.words.map((_, i) => s.words[(i + 1) % s.people]),
                round: s.round + 1,
              }),
          )}
          {field(
            "Промяна",
            "Промени ли смяната на думите начина, по който виждаш картата?",
          )}
          {finish()}
        </>
      );
  } else if (base === "market") {
    content =
      s.stage === 0 ? (
        <>
          {people()}
          <p>55 карти позволяват до 18 участници с по три карти.</p>
          {next("Раздай по три карти", false, () => deal(3))}
        </>
      ) : (
        <>
          <div className="participants">
            {s.hands.map((h, i) => (
              <section className="paper" key={i}>
                <h3>Участник {i + 1}</h3>
                <div className="row">
                  {h.map((id) => (
                    <div key={id}>
                      <Card
                        id={id}
                        selected={s.answers["Важна_" + i] === String(id)}
                        onClick={() => answer("Важна_" + i, String(id))}
                      />
                      <input
                        aria-label={`Ценност за карта ${id}`}
                        placeholder="Моята ценност…"
                        value={s.answers["Ценност_" + id] || ""}
                        onChange={(e) =>
                          answer("Ценност_" + id, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
                <p>Избери една важна ценност, като натиснеш картата.</p>
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
          <h2>Групи от 3–4 · Общо събитие</h2>
          {Array.from({ length: Math.ceil(s.people / 4) }, (_, i) => (
            <section key={i}>
              {field(
                "Група_" + i,
                `Група ${i + 1} (участници ${groupMembers(s.people, i).join(", ")}): как ще дадете място на ценността на всеки? Запишете 3 конкретни решения.`,
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
          <p>
            Разделете се на групи по 4–6. Личната тема може да остане
            несподелена.
          </p>
          {next("Избирайте по две карти", false, () =>
            update({ stage: 1, selected: [] }),
          )}
        </>
      ) : s.stage === 1 ? (
        <>
          <h2>Участник {s.turn + 1}: избери две карти.</h2>
          {choose(2)}
          {next("Потвърди избора", s.selected.length < 2, () => {
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
          <h2>
            Участник {s.turn + 1} · Слушай и вземи това, което има смисъл за
            теб.
          </h2>
          {selected()}
          <p>
            Говорим от свое име. Без отгатване на личната тема, тълкуване на
            човека или съвети.
          </p>
          {field("Моят_образ_" + s.turn, "Какво виждам в своите изображения?")}
          {Array.from({ length: Math.min(s.people - 1, 5) }, (_, i) =>
            field(
              `Асоциация_${s.turn}_${i}`,
              `Глас ${i + 1}: Аз виждам… / На мен ми напомня… / За мен тези изображения…`,
            ),
          )}
          {field("Взимам_" + s.turn, "Какво взимам от чутото?")}
          {s.turn + 1 < s.people &&
            next("Следващ участник", false, () =>
              update({ turn: s.turn + 1, selected: s.hands[s.turn + 1] }),
            )}
          {finish()}
        </>
      );
  } else if (base === "mission") {
    const teams = Math.ceil(s.people / 4);
    const phases = [
      {
        title: "Идеи",
        minutes: 10,
        text: "Генерирайте поне три идеи от детайли, форми, настроение или асоциации.",
      },
      {
        title: "Общо решение",
        minutes: 5,
        text: "Съчетайте вдъхновение от трите карти в общо решение.",
      },
      {
        title: "Представяне",
        minutes: 3,
        text: "Представете решението. Друг отбор задава един въпрос.",
      },
    ];
    const phase = phases[Math.min(s.stage, 3) - 1];
    if (phase) progress = <Steps current={s.stage} total={3} />;
    lead = phase
      ? `${phase.minutes} минути · ${phase.text}`
      : "Формулирайте общото предизвикателство и разделете участниците на отбори.";
    content =
      s.stage === 0 ? (
        <div className="paper narrow">
          {people()}
          {topic()}
          <p className="hint">
            {teams} {teams === 1 ? "отбор" : "отбора"} · всеки получава по три
            скрити карти.
          </p>
          {next("Раздай по три карти на отбор", !s.topic.trim(), () => {
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
              <small>Мисия</small>
              <h2>{s.topic}</h2>
            </div>
            <Timer seconds={phase.minutes * 60} />
          </div>
          {s.hands.map((h, i) => (
            <section className="team" key={i}>
              <div className="team-cards">
                <h3>Отбор {i + 1}</h3>
                <p className="small-note">
                  Участници {groupMembers(s.people, i).join(", ")}
                </p>
                <div className="team-card-row">
                  {h.map((id) => (
                    <Card key={id} id={id} onClick={() => inspect(id)} />
                  ))}
                </div>
              </div>
              <div className="team-work">
                <h3>
                  Фаза {s.stage} · {phase.title}
                </h3>
                {s.stage === 1 ? (
                  [1, 2, 3].map((j) => field(`Идея_${i}_${j}`, `Идея ${j}`))
                ) : s.stage === 2 ? (
                  field("Решение_" + i, "Нашето общо решение")
                ) : (
                  <>
                    {field(
                      "Представяне_" + i,
                      "Как всяка карта допринесе за решението?",
                    )}
                    {field("Въпрос_" + i, "Един въпрос от друг отбор")}
                    {field("Отговор_" + i, "Отговор и уточнение")}
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
                Назад
              </button>
            )}
            {s.stage < 3 &&
              next(
                "Следваща фаза",
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
          <h2>Избери карта, около която искаш да създадеш свят.</h2>
          {choose()}
          {next("Започни да рисуваш", !s.selected.length)}
        </>
      ) : (
        <>
          <h2>Какво има извън краищата на картата?</h2>
          <p>Рисувай около изображението. Кой или какво може да има наблизо?</p>
          <Drawing
            id={s.selected[0]}
            strokes={s.strokes}
            onChange={(strokes) => update({ strokes })}
          />
          {field(
            "Моят_свят",
            "Какво добави? Какво в картата ти подсказа тези идеи?",
          )}
          {finish()}
        </>
      );
  } else if (base === "gift") {
    content =
      s.stage === 0 ? (
        <>
          {people()}
          {next("Изтегли имената", false, () => {
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
            Участник {s.turn + 1} подарява на участник {s.order[s.turn] + 1}
          </h2>
          <p>
            Помисли какво харесва другото дете, за какво мечтае и какво би го
            зарадвало.
          </p>
          {choose(1, false, (id) => update({ selected: [id] }))}
          {s.selected.length > 0 && (
            <>
              {field(
                "Подарък_" + s.turn,
                "Подарявам ти тази карта, защото знам, че обичаш…",
              )}
              {field(
                "Получател_" + s.turn,
                "Получател: какво означава подаръкът за мен? (по желание)",
              )}
              {s.turn + 1 < s.people ? (
                next("Подари · следващ участник", false, () =>
                  update({
                    lines: [
                      ...s.lines,
                      `${s.turn + 1} → ${s.order[s.turn] + 1}: карта ${s.selected[0]}`,
                    ],
                    turn: s.turn + 1,
                    selected: [],
                  }),
                )
              ) : (
                <>
                  {field(
                    "Чувство",
                    "Какво беше чувството да изберете и да получите подарък?",
                  )}
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
        <Link className="back" to="/exercises">
          <ArrowLeft size={16} /> Към упражненията
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
            {reset.label === "Изчисти" && <Trash2 size={14} />}
            {reset.label}
          </button>
        </div>
      </header>
      {resumed && (
        <div className="resume-note">
          <span>Продължаваш оттам, докъдето стигна последния път.</span>
          <button
            className="text-button"
            onClick={() => {
              set(initial(cards));
              setSaved(false);
              setResumed(false);
            }}
          >
            Започни отначало
          </button>
          <button
            className="resume-close"
            onClick={() => setResumed(false)}
            aria-label="Скрий"
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
              {field(
                "Наблюдател",
                "Наблюдател: уточняващ въпрос или обобщение",
              )}
              <p>„Разкажи ми повече…“ · „Правилно ли те разбрах?“</p>
            </>
          )}
        </div>
      )}
      {ex.category >= 2 && (
        <div className="facilitator">
          <Users size={17} />
          <span>
            Режим за водещ · Общуване на живо, работа на едно устройство
            {ex.category === 3
              ? " · Участието и споделянето са по желание."
              : ""}
          </span>
        </div>
      )}
      <div className="exercise-content">{content}</div>
      <footer>
        По „Работа с метафорични карти“, Яна Аврамова · с. {ex.page} ·
        Значението на образа определяш ти. · Отговорите се запазват
        автоматично в този браузър.
      </footer>
    </div>
  );
}
function Steps({ current, total }: { current: number; total: number }) {
  return (
    <ol className="steps" aria-label={`Стъпка ${current} от ${total}`}>
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
      Стъпка {current} от {total}
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
  if (!id) return <div className="preview empty-slot">Избери карта</div>;
  return (
    <div className="preview">
      <img
        src={cardSrc(id)}
        alt={`Метафорична карта ${cardLabel(id)}`}
        onClick={() => inspect(id)}
      />
      <button
        className="preview-expand"
        onClick={() => inspect(id)}
        aria-label="Разгледай отблизо"
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
              <Expand size={13} /> Карта {id}
            </button>
          </div>
        );
      })}
    </div>
  );
}
function Timer({ seconds, onEnd }: { seconds: number; onEnd?: () => void }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    setLeft(seconds);
    setRunning(false);
  }, [seconds]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(
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
    return () => clearInterval(t);
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
        {running ? "Пауза" : "Старт"}
      </button>
      <button
        className="text-button"
        onClick={() => {
          setRunning(false);
          setLeft(0);
          onEnd?.();
        }}
      >
        Приключи фазата
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
  return (
    <section className="paper">
      <h2>Предложи размяна</h2>
      <div className="row">
        {[0, 1].map((_, i) => (
          <div key={i}>
            <label>
              Участник{" "}
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
              Карта{" "}
              <select
                value={i ? bi : ai}
                onChange={(e) => {
                  i ? setBi(+e.target.value) : setAi(+e.target.value);
                  reset();
                }}
              >
                {hands[i ? b : a]?.map((id, j) => (
                  <option key={id} value={j}>
                    № {id}
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
              Съгласен съм
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
        Размени двете карти
      </button>
      <p>
        Размяната става само със съгласието и на двамата. Всеки запазва точно
        три карти.
      </p>
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
            ? "Личните ръце се разглеждат последователно. Подайте устройството на активния участник."
            : detective
              ? "Шест карти. Детективът избира една тайно и подготвя три видими детайла като улики."
              : "Избраният образ се пресъздава без думи или звуци. Останалите отгатват след представянето."}
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
          Подготви кръга <ArrowRight size={16} />
        </button>
      </>
    );
  if (s.stage === 1) {
    const hand = assoc ? s.hands[current] : cards;
    return (
      <>
        <h2>
          {assoc
            ? `Участник ${current + 1}${current === storyteller ? " · Разказвач" : ""}`
            : detective
              ? "Само детективът гледа"
              : "Само представящият гледа"}{" "}
          · Личен избор
        </h2>
        <p>
          Другите участници отвръщат поглед. Затворете личния изглед преди да
          подадете устройството.
        </p>
        {!privateOpen ? (
          <button className="primary" onClick={() => setPrivateOpen(true)}>
            Отвори личния изглед
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
              field("Подсказка", "Дай дума или кратка фраза като подсказка")}
            {assoc && current !== storyteller && (
              <h2>Подсказка: {s.answers["Подсказка"]}</h2>
            )}
            {detective &&
              [1, 2, 3].map((i) =>
                field("Улика_" + i, `Улика ${i}: видим детайл`),
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
              Скрий и потвърди избора
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
          ? `Подсказка: ${s.answers["Подсказка"]}`
          : detective
            ? "Следвайте уликите"
            : "Представяне без думи"}
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
          <p>Една минута за подготовка, после една минута за представяне.</p>
          <Timer seconds={60} />
          <button className="primary" onClick={() => update({ stage: 3 })}>
            Към отгатването
          </button>
        </>
      ) : (
        <>
          {detective && (
            <div className="paper">
              <p className="eyebrow">УЛИКА {s.turn + 1} / 3</p>
              <h2>{s.answers["Улика_" + (s.turn + 1)]}</h2>
            </div>
          )}
          {!s.revealed && s.guesses.length < s.people - 1 ? (
            <>
              <h3>
                Наблюдател{" "}
                {assoc
                  ? Array.from({ length: s.people }, (_, i) => i).filter(
                      (i) => i !== storyteller,
                    )[s.guesses.length] + 1
                  : (((s.round % s.people) + s.guesses.length) % s.people) + 1}
                : избери и заключи предположението си.
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
                "Какво те насочи? (по желание)",
              )}
            </>
          ) : !s.revealed ? (
            <div className="actions">
              {detective && s.turn < 2 && (
                <button
                  className="secondary"
                  onClick={() => update({ turn: s.turn + 1, guesses: [] })}
                >
                  Следваща улика
                </button>
              )}
              <button
                className="primary"
                onClick={() => update({ revealed: true })}
              >
                Разкрий картата
              </button>
            </div>
          ) : (
            <>
              <h2>Избраната карта</h2>
              <Card id={s.secret} large onClick={() => inspect(s.secret)} />
              <p>
                Предположения: {s.guesses.map((id) => `№ ${id}`).join(", ")}
              </p>
              {field(
                "Замисъл_" + s.round,
                detective
                  ? "Посочи трите детайла. Кое беше по-лесно: да измисляте улики или да познавате?"
                  : "Какво искаше да предадеш? Какво забелязахте?",
              )}
              <button className="secondary" onClick={roundNext}>
                Следващ участник · нов кръг
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
          aria-label="Цвят на молива"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <label>
          Дебелина{" "}
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
          Отмени линия
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
        <img src={cardSrc(id)} alt="Картата остава непроменена" />
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
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
            Съгласувана обща тема
            <input
              value={s.topic}
              onChange={(e) => update({ topic: e.target.value })}
              placeholder="Какво желаете да изследвате заедно?"
            />
          </label>
        )}
        <button
          className="primary"
          disabled={["bridge", "future"].includes(base) && !s.topic.trim()}
          onClick={begin}
        >
          Започнете заедно
        </button>
      </>
    );
  if (s.stage === 1)
    return (
      <>
        <h2>
          Участник {s.turn + 1} ·{" "}
          {base === "now" && ex.category === 1
            ? s.selected.length === 0
              ? "Карта за моето състояние"
              : "Карта за нашето общуване"
            : base === "bridge"
              ? ["Къде съм сега", "Къде искам да бъда", "Какво ще ми помогне"][
                  s.selected.length
                ]
              : "Избери своите изображения"}
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
            Разгледай избраната карта отблизо
          </button>
        )}
        <p>
          {s.selected.length} избрани · {need}
          {base === "future" ? "–7" : ""} карти за този участник
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
          Потвърди · {s.turn + 1 < count ? "следващ участник" : "споделяне"}
        </button>
      </>
    );
  return (
    <>
      {base === "future" ? (
        <>
          <h2>Нашата обща картина · {s.topic}</h2>
          <Composition
            ids={Array.from(new Set(s.selected))}
            positions={s.positions}
            setPositions={(positions) => update({ positions })}
            inspect={inspect}
          />
          {field(
            "Общо_бъдеще",
            "Къде желанията ни се срещат? Как различията намират място?",
          )}
          {field("Заглавие", "Как ще се казва общата ни картина?")}
        </>
      ) : base === "bridge" ? (
        <>
          {s.hands.map((h, i) => (
            <section className="paper" key={i}>
              <h2>Мостът на участник {i + 1}</h2>
              <div className="bridge">
                {[0, 2, 1].map((j) => (
                  <div key={j}>
                    <h3>
                      {
                        [
                          "Къде съм сега",
                          "Къде искам да бъда",
                          "Какво ще ми помогне",
                        ][j]
                      }
                    </h3>
                    <Card id={h[j]} onClick={() => inspect(h[j])} />
                    {field(`Мост_${i}_${j}`, "Какво виждам в този образ?")}
                  </div>
                ))}
              </div>
            </section>
          ))}
          {field(
            "Сравнение",
            "Кои възможности са полезни за всички? Какво е сходно и различно?",
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
            `Участник ${s.turn + 1}: какъв въображаем проблем подсказва образът?`,
          )}
          {s.hands.map(
            (_, i) =>
              i !== s.turn &&
              field(
                `Решение_${s.turn}_${i}`,
                `Участник ${i + 1}: решение и детайлът, който го подсказва`,
              ),
          )}
          {field(
            "Условия_" + s.turn,
            "При какви условия биха били полезни предложените решения?",
          )}
        </>
      ) : base === "coffee" ? (
        <>
          <h2>Разказва участник {s.turn + 1}. Следващият слуша и обобщава.</h2>
          <Card
            id={s.hands[s.turn][0]}
            large
            onClick={() => inspect(s.hands[s.turn][0])}
          />
          {field(
            "Разказ_" + s.turn,
            "Какво те привлече и какви асоциации събуди картата?",
          )}
          {field(
            "Слушател_" + s.turn,
            `Участник ${((s.turn + 1) % count) + 1}: Разбирам, че… Правилно ли те разбрах?`,
          )}
          {field(
            "Потвърждение_" + s.turn,
            "Потвърждение, допълнение или поправка",
          )}
        </>
      ) : (
        <>
          <div className="participants">
            {s.hands.map((h, i) => (
              <section className="paper" key={i}>
                <h2>Участник {i + 1}</h2>
                <div className="row">
                  {h.map((id, j) => (
                    <div key={j}>
                      <Card id={id} onClick={() => inspect(id)} />
                      <p>{j === 0 ? "Моето състояние" : "Нашето общуване"}</p>
                    </div>
                  ))}
                </div>
                {field(
                  "Състояние_" + i,
                  ex.category === 3
                    ? "Днес се чувствам… Какво в картата ти напомня за това?"
                    : "Какво в картата отразява моето състояние?",
                )}
                {ex.category === 1 &&
                  field("Общуване_" + i, "Как преживявам нашето общуване?")}
              </section>
            ))}
          </div>
          {field("Сходства", "Какво е сходно и различно в преживяванията ни?")}
        </>
      )}
      {["coffee", "perspective"].includes(base) && s.turn + 1 < count && (
        <button
          className="primary"
          onClick={() => update({ turn: s.turn + 1 })}
        >
          Следващ участник
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
