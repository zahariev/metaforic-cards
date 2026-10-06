import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
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
} from "lucide-react";
import { categories, library, deck, shuffle, type Exercise } from "./data";
import "./style.css";
function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function useLocal<T>(key: string, initial: T) {
  const [v, set] = useState<T>(() => read(key, initial));
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(v));
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
};
const initial = (): State => ({
  stage: 0,
  topic: "",
  selected: [],
  answers: {},
  pool: shuffle(deck),
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
      aria-label={hidden ? "Изтегли скрита карта" : `Карта ${id}`}
    >
      {hidden ? (
        <>
          <Leaf size={40} />
          <span>Метафорични карти</span>
        </>
      ) : (
        <img
          src={`/cards/${id}.jpg`}
          alt={`Метафорична карта ${id}`}
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
    <BrowserRouter>
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
            <img src={`/cards/${inspect}.jpg`} alt={`Карта ${inspect}`} />
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
    </BrowserRouter>
  );
}
function Library({ home = false }: { home?: boolean }) {
  const [cat, setCat] = useState(-1);
  const [q, setQ] = useState("");
  const [adapt, setAdapt] = useState(false);
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
      <div className="categories">
        {categories.map((c, i) => (
          <button
            className={`category c${i} ${cat === i ? "active" : ""}`}
            key={c.title}
            onClick={() => setCat(cat === i ? -1 : i)}
          >
            {i === 0 ? <User /> : <Users />}
            <small>{c.sub}</small>
            <h2>{c.title}</h2>
            <p>{c.text}</p>
            <span>
              Разгледай{" "}
              {library.filter((e) => e.category === i && !e.adaptation).length}{" "}
              упражнения <ArrowRight size={15} />
            </span>
            <Leaf className="decoration" />
          </button>
        ))}
      </div>
      <div className="quote">„Една картина казва повече от хиляди думи.“</div>
      <div className="list-heading">
        <h2>{cat < 0 ? "Избери своето упражнение" : categories[cat].title}</h2>
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
      <div className="exercise-list">
        {shown.map((e, i) => (
          <Link className="exercise-tile" to={`/exercise/${e.id}`} key={e.id}>
            <div className="tile-image">
              <img
                src={`/cards/${[3, 17, 29, 8, 44, 21, 12][i % 7]}.jpg`}
                alt=""
              />
              <span className={`tag c${e.category}`}>
                {e.adaptation ? "Адаптация" : categories[e.category].title}
              </span>
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
function Deck({
  inspect,
  ids = deck,
}: {
  inspect: (id: number) => void;
  ids?: number[];
}) {
  return (
    <div className="library">
      <p className="eyebrow">ОБРАЗИ ЗА ТВОИТЕ АСОЦИАЦИИ</p>
      <h1>{ids === deck ? "Колода карти" : "Любими карти"}</h1>
      <p>
        {ids.length} карти · Избери изображение, за да го разгледаш отблизо.
      </p>
      <div className="spread">
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
                    localStorage.setItem(
                      "mc-draft-" + s.exercise,
                      JSON.stringify(s.data),
                    );
                    location.href = "/exercise/" + s.exercise;
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
  const [s, set] = useLocal<State>("mc-draft-" + ex.id, initial());
  const [saved, setSaved] = useState(false);
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
    localStorage.setItem(
      "mc-notes",
      JSON.stringify([
        {
          id: crypto.randomUUID(),
          exercise: ex.id,
          date: new Date().toISOString(),
          data: s,
        },
        ...notes,
      ]),
    );
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
    ids = hidden ? s.pool : deck,
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
    const pool = shuffle(deck);
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
      />
    );
  } else if (base === "now" || base === "challenge") {
    const prompts =
      base === "now"
        ? [
            "Какво те привлече в нея?",
            "Какво се случва в изображението?",
            "Каква е атмосферата?",
            "Какво усещане предизвиква у теб?",
            "Кое в картата най-силно отразява настоящото ти състояние?",
            "Има ли детайл, образ или усещане, в което разпознаваш нещо от себе си?",
            "Има ли нещо, което не си осъзнавал преди да я избереш?",
            "Довърши: Точно сега се чувствам… / В момента най-много ме занимава… / Забелязвам, че… / Имам нужда от… / Иска ми се…",
            "Кое от това, което откри, е най-важно за теб точно сега?",
          ]
        : [
            "Какво в нея те отблъсква?",
            "Какво чувство предизвиква у теб?",
            "Какво ти се иска да избегнеш в този образ?",
            "Отвъд това, което те отблъсква, дразни или плаши, има ли нещо, което можеш да интерпретираш по различен начин?",
            "Има ли нещо, което дори ти допада?",
            "Тази карта все още ли би била последната, която би избрал?",
          ];
    content =
      s.stage === 0 ? (
        <>
          <h2>
            {base === "now"
              ? "Избери карта, която най-добре представя как се чувстваш в момента."
              : "Коя карта най-малко би искал да избереш?"}
          </h2>
          {choose()}{" "}
          {s.selected.length > 0 && (
            <div className="selection-bar">
              <Card id={s.selected[0]} onClick={() => inspect(s.selected[0])} />
              <span>Разгледай картата преди да потвърдиш.</span>
              {next("Избирам тази карта")}
            </div>
          )}
        </>
      ) : (
        <div className="focused">
          {selected()}
          <div className="paper">
            <p className="eyebrow">
              ПОГЛЕДНИ КАРТАТА · {Math.min(s.stage, prompts.length)} /{" "}
              {prompts.length}
            </p>
            {s.stage <= prompts.length ? (
              <>
                {field(prompts[s.stage - 1], prompts[s.stage - 1])}
                {base === "challenge" && s.stage === prompts.length && (
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
                  <button
                    className="secondary"
                    onClick={() => update({ stage: Math.max(0, s.stage - 1) })}
                  >
                    Назад
                  </button>
                  {next()}
                </div>
              </>
            ) : (
              finish()
            )}
          </div>
        </div>
      );
  } else if (base === "bridge") {
    const pair = ex.id.endsWith("pair");
    const n = pair ? 6 : 3;
    const labels = [
      "Къде съм сега",
      "Къде искам да бъда",
      "Какво ще ми помогне",
    ];
    const order = pair ? [0, 2, 1, 3, 5, 4] : [0, 2, 1];
    content = (
      <>
        {topic()}
        <p>
          Изтегли първо настоящето, после желаното бъдеще. Третата карта свързва
          двете.
        </p>
        <div className="bridge">
          {order.map((i) => (
            <section key={i}>
              <h3>
                {pair ? `Участник ${Math.floor(i / 3) + 1} · ` : ""}
                {labels[i % 3]}
              </h3>
              {s.selected[i] ? (
                <Card
                  id={s.selected[i]}
                  large
                  onClick={() => inspect(s.selected[i])}
                />
              ) : (
                <Card
                  id={0}
                  hidden
                  onClick={() => {
                    if (i === s.selected.length && s.selected.length < n)
                      update({
                        selected: [...s.selected, s.pool[0]],
                        pool: s.pool.slice(1),
                      });
                  }}
                />
              )}
              {s.selected[i] &&
                field(
                  labels[i % 3] + i,
                  [
                    "Какво в изображението ми помага да видя къде съм?",
                    "Как искам нещата да бъдат?",
                    "Какво ще ми помогне да стигна дотам?",
                  ][i % 3],
                )}
            </section>
          ))}
        </div>
        {s.selected.length < n && (
          <p className="hint">
            Следваща карта: {labels[s.selected.length % 3]} · натисни нейния
            гръб.
          </p>
        )}
        {s.selected.length === n && (
          <>
            {field(
              "Обща_картина",
              pair
                ? "Какви сходства, различия и общи възможности виждате?"
                : "Какво виждаш, когато разглеждаш трите карти като една обща картина?",
            )}
            {finish()}
          </>
        )}
      </>
    );
  } else if (base === "future") {
    content =
      s.stage === 0 ? (
        <>
          <h2>Избери 5–7 карти за бъдещето, което искаш да изследваш.</h2>
          {choose(7)}
          {next("Подреди своята картина", s.selected.length < 5)}
        </>
      ) : (
        <>
          <h2>Подреди картите свободно върху масата.</h2>
          <p>Премести всяка карта. Запазваме точното ѝ място.</p>
          <Composition
            ids={s.selected}
            positions={s.positions}
            setPositions={(positions) => update({ positions })}
            inspect={inspect}
          />
          {field(
            "Описание",
            "Ако трябва да опишеш тази картина с няколко думи, кои биха били те?",
          )}
          {field(
            "Заглавие",
            "Дай заглавие на своята картина на бъдещето.",
            "Ако бъдещето ти беше филм, как би се казвал той?",
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
      } else
        update({ pool: shuffle(winners), winners: [], round: s.round + 1 });
    };
    content =
      s.stage === 0 ? (
        <>
          {topic()}
          {next("Разбъркай и започни", !s.topic.trim())}
        </>
      ) : s.stage === 1 ? (
        <>
          <p className="eyebrow">
            КРЪГ {s.round} · {s.pool.length + s.winners.length * 3} →{" "}
            {s.winners.length} запазени карти
          </p>
          <h2>Коя карта свързваш най-силно с „{s.topic}“?</h2>
          <div className="tournament">
            {s.pool.slice(0, 3).map((id) => (
              <Card key={id} id={id} large onClick={() => pick(id)} />
            ))}
          </div>
          <p className="hint">Избери една. Останалите отпадат от този кръг.</p>
          <div className="winner-strip">
            {s.winners.map((id) => (
              <Card key={id} id={id} onClick={() => inspect(id)} />
            ))}
          </div>
        </>
      ) : (
        <div className="focused">
          {selected()}
          <div>
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
    content = (
      <>
        {topic()}
        <div className="chain">
          {s.selected.map((id, i) => (
            <div key={i}>
              <p className="eyebrow">ЗАЩО {i + 1}</p>
              <Card id={id} onClick={() => inspect(id)} />
              <p>
                {s.answers["Отговор_" + (i + 1)] || "Твоят следващ отговор"}
              </p>
              {s.selected.length === 5 && (
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
              )}
            </div>
          ))}
        </div>
        {s.selected.length < 5 && (
          <div className="focused">
            <div>
              {s.selected.length === 0 ||
              s.answers["Отговор_" + s.selected.length] ? (
                <Card
                  id={0}
                  hidden
                  onClick={() => {
                    if (s.topic.trim())
                      update({
                        selected: [...s.selected, s.pool[0]],
                        pool: s.pool.slice(1),
                      });
                  }}
                />
              ) : (
                <Card
                  id={s.selected.at(-1)!}
                  large
                  onClick={() => inspect(s.selected.at(-1)!)}
                />
              )}
            </div>
            <div>
              <h2>
                Защо „
                {s.answers["Отговор_" + s.selected.length] ||
                  (s.selected.length > 1
                    ? s.answers["Отговор_" + (s.selected.length - 1)]
                    : s.topic) ||
                  "това"}
                “ е важно за мен?
              </h2>
              {s.selected.length > 0 &&
                field("Отговор_" + s.selected.length, "Моят отговор")}
              {s.answers["Отговор_" + s.selected.length] && (
                <p>
                  Следващият въпрос започва от този отговор. Изтегли следващата
                  карта.
                </p>
              )}
            </div>
          </div>
        )}
        {s.selected.length === 5 && (
          <>
            {field("Отговор_5", "Пети отговор")}
            <h2>
              Върни се към „{s.topic}“. Кой отговор те изненада най-много?
            </h2>
            {finish()}
          </>
        )}
      </>
    );
  } else if (base === "dialogue") {
    content =
      s.stage === 0 ? (
        <>
          {topic()}
          <Card
            id={0}
            hidden
            onClick={() =>
              update({
                selected: [s.pool[0]],
                pool: s.pool.slice(1),
                stage: 1,
                lines: ["Какво искаш да ми покажеш?", ""],
              })
            }
          />
        </>
      ) : (
        <div className="focused">
          {selected()}
          <div className="paper">
            <h2>Твоят разговор с образа</h2>
            <p>
              Ти пишеш и своите въпроси, и въображаемите отговори на картата.
            </p>
            {s.lines.map((line, i) => (
              <label
                className={`dialogue-line ${i % 2 ? "response" : ""}`}
                key={i}
              >
                <b>{i % 2 ? "КАРТАТА:" : "АЗ:"}</b>
                <textarea
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
              </label>
            ))}
            <button
              className="secondary"
              onClick={() => update({ lines: [...s.lines, "", ""] })}
            >
              <Plus size={15} /> Добави реплика
            </button>
            <button
              className="text-button"
              onClick={() =>
                update({
                  lines: [...s.lines, "Какво още искаш да ми кажеш?", ""],
                })
              }
            >
              Въпрос за вдъхновение
            </button>
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
            {finish()}
          </div>
        </div>
      );
  } else if (base === "story") {
    const total = ex.category === 1 ? 8 : s.people;
    content = (
      <>
        {s.stage === 0 ? (
          <>
            {ex.category !== 1 && people()}
            <p>
              Картите са скрити. Редувайте се и запазвайте вече разказаното.
            </p>
            {next("Раздай картите", false, () =>
              update({
                selected: s.pool.slice(0, total),
                pool: s.pool.slice(total),
                stage: 1,
              }),
            )}
          </>
        ) : (
          <>
            <div className="story-cards">
              {s.selected.map((id, i) => (
                <div key={i}>
                  <small>{i === total - 1 ? "ФИНАЛ" : `Ход ${i + 1}`}</small>
                  <Card
                    id={id}
                    hidden={i > s.turn || (i === s.turn && !s.revealed)}
                    onClick={() => i === s.turn && update({ revealed: true })}
                  />
                </div>
              ))}
            </div>
            <div className="paper story-text">
              {s.lines.map((l, i) => (
                <p key={i}>
                  <small>
                    Участник {(i % (ex.category === 1 ? 2 : s.people)) + 1}
                  </small>
                  {l}
                </p>
              ))}
            </div>
            {s.turn < total ? (
              <>
                <h2>
                  Участник {(s.turn % (ex.category === 1 ? 2 : s.people)) + 1} ·{" "}
                  {s.turn === total - 1
                    ? "Завърши историята"
                    : "Продължи историята"}
                </h2>
                {s.revealed && (
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
    content =
      s.stage === 0 ? (
        <>
          {people()}
          {topic()}
          {next("Раздай по три карти на отбор", !s.topic.trim(), () => {
            const pool = shuffle(deck);
            update({
              hands: Array.from({ length: teams }, (_, i) =>
                pool.slice(i * 3, i * 3 + 3),
              ),
              selected: pool.slice(0, teams * 3),
              stage: 1,
            });
          })}
        </>
      ) : (
        <>
          <h2>Мисия: {s.topic}</h2>
          <Timer seconds={s.stage === 1 ? 600 : s.stage === 2 ? 300 : 180} />
          <p>
            {s.stage === 1
              ? "10 минути · Генерирайте поне три идеи от детайли, форми, настроение или асоциации."
              : s.stage === 2
                ? "5 минути · Съчетайте вдъхновение от трите карти в общо решение."
                : "3 минути · Представете решението. Друг отбор задава един въпрос."}
          </p>
          {s.hands.map((h, i) => (
            <section className="paper" key={i}>
              <h2>
                Отбор {i + 1} · участници {groupMembers(s.people, i).join(", ")}
              </h2>
              <div className="row">
                {h.map((id) => (
                  <Card key={id} id={id} onClick={() => inspect(id)} />
                ))}
              </div>
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
            </section>
          ))}
          {s.stage < 3
            ? next(
                "Следваща фаза",
                s.stage === 1 &&
                  s.hands.some((_, i) =>
                    [1, 2, 3].some((j) => !s.answers[`Идея_${i}_${j}`]?.trim()),
                  ),
              )
            : finish()}
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
      <div className="workspace-top">
        <Link to="/exercises">
          <ArrowLeft size={16} /> Към упражненията
        </Link>
        <span>
          <Clock size={15} />
          {ex.time} · Запазва се автоматично
        </span>
        <button
          className="text-button"
          onClick={() => {
            if (confirm("Започни това упражнение отначало?")) {
              set(initial());
              setSaved(false);
            }
          }}
        >
          Отначало
        </button>
      </div>
      <header className="workspace-heading">
        <p className="eyebrow">
          {categories[ex.category].title} · {ex.mechanic}
        </p>
        <h1>{ex.title}</h1>
        <p>{ex.description}</p>
      </header>
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
        Значението на образа определяш ти.
      </footer>
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
        <img src={`/cards/${id}.jpg`} alt="Картата остава непроменена" />
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
}: {
  ex: Exercise;
  s: State;
  update: (s: Partial<State>) => void;
  field: (k: string, l: string, p?: string) => React.ReactNode;
  people: () => React.ReactNode;
  inspect: (id: number) => void;
  finish: () => React.ReactNode;
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
          {deck.map((id) => (
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
