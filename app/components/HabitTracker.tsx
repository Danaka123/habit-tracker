"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Habit = {
  id: string;
  name: string;
  emoji: string;
  weeklyGoal: number; // 1–7
  completedDays: string[]; // "YYYY-MM-DD"
  createdAt: number;
};

type Theme = "light" | "dark";
type MainTab = "habits" | "stats";
type StatsView = "year" | "month" | "day";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_HABITS = "habit-tracker-habits";
const STORAGE_THEME  = "habit-tracker-theme";
const EMOJI_OPTIONS  = ["🏃","📚","💧","🧘","🎨","💪","🌿","✍️","🎯","🍎","😴","🎵"];
const DAYS_SHORT     = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const MONTHS_RU      = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MONTHS_SHORT   = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
function today() { return toDateStr(new Date()); }
function uid()   { return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }

function getWeekDates(): string[] {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - dow + i);
    return toDateStr(d);
  });
}

function weeklyCount(habit: Habit) {
  const w = getWeekDates();
  return habit.completedDays.filter(d => w.includes(d)).length;
}

function weeklyPct(habit: Habit) {
  return Math.min(100, Math.round((weeklyCount(habit) / habit.weeklyGoal) * 100));
}

function calcStreak(habit: Habit) {
  const set = new Set(habit.completedDays);
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    if (set.has(toDateStr(d))) { streak++; }
    else if (streak > 0 || i > 1) break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function achievementLabel(pct: number) {
  if (pct === 0)  return { emoji: "🌱", text: "Только старт!" };
  if (pct < 30)   return { emoji: "🔥", text: "Хороший разгон!" };
  if (pct < 60)   return { emoji: "💪", text: "Отличный прогресс!" };
  if (pct < 90)   return { emoji: "⭐", text: "Почти идеально!" };
  return            { emoji: "🏆", text: "Потрясающе!" };
}

function pluralDays(n: number) {
  if (n === 1) return "день";
  if (n >= 2 && n <= 4) return "дня";
  return "дней";
}

// ─── Circular Progress ────────────────────────────────────────────────────────

function Ring({ pct, size = 52, sw = 4, dark }: { pct: number; size?: number; sw?: number; dark: boolean }) {
  const r     = (size - sw * 2) / 2;
  const circ  = 2 * Math.PI * r;
  const off   = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={dark ? "#2e2e2e" : "#e8ddd4"} strokeWidth={sw}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#B5845A" strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset .5s ease" }}/>
    </svg>
  );
}

// ─── Add Habit Modal ──────────────────────────────────────────────────────────

function AddModal({ dark, onAdd, onClose }: { dark: boolean; onAdd: (n: string, e: string, g: number) => void; onClose: () => void }) {
  const [name, setName]       = useState("");
  const [emoji, setEmoji]     = useState("🏃");
  const [goal, setGoal]       = useState(7);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const card  = dark ? "bg-[#1e1e1e] border border-[#2e2e2e]" : "bg-white";
  const inp   = dark ? "bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder-zinc-500 focus:border-[#B5845A]"
                     : "bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-[#B5845A]";
  const txt   = dark ? "text-white" : "text-zinc-800";
  const sub   = dark ? "text-zinc-400" : "text-zinc-500";

  function submit() {
    if (!name.trim()) return;
    onAdd(name.trim(), emoji, goal);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${card} rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in`}>
        <h2 className={`text-lg font-semibold mb-5 ${txt}`}>Новая привычка</h2>

        <p className={`text-xs font-medium mb-2 ${sub}`}>Иконка</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {EMOJI_OPTIONS.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className={`w-10 h-10 text-xl rounded-xl transition-all ${
                emoji === e ? "bg-[#B5845A]/20 ring-2 ring-[#B5845A]"
                : dark ? "bg-[#2a2a2a] hover:bg-[#333]" : "bg-zinc-100 hover:bg-zinc-200"
              }`}>{e}</button>
          ))}
        </div>

        <p className={`text-xs font-medium mb-2 ${sub}`}>Название</p>
        <input ref={ref} type="text" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Например, утренняя зарядка..."
          className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${inp}`}/>

        <p className={`text-xs font-medium mt-4 mb-2 ${sub}`}>Раз в неделю</p>
        <div className="flex gap-1.5">
          {[1,2,3,4,5,6,7].map(n => (
            <button key={n} onClick={() => setGoal(n)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                goal === n
                  ? "bg-[#B5845A] text-white"
                  : dark ? "bg-[#2a2a2a] text-zinc-400 hover:bg-[#333]" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}>{n}</button>
          ))}
        </div>
        <p className={`text-xs mt-1.5 ${sub}`}>
          {goal === 7 ? "Каждый день" : goal === 1 ? "1 раз в неделю" : `${goal} раза в неделю`}
        </p>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              dark ? "bg-[#2a2a2a] text-zinc-300 hover:bg-[#333]" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}>Отмена</button>
          <button onClick={submit} disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-[#B5845A] hover:bg-[#9e6e45] disabled:opacity-40 transition-colors">
            Добавить</button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab({ habits, dark }: { habits: Habit[]; dark: boolean }) {
  const [view,        setView]        = useState<StatsView>("year");
  const [filterHabit, setFilterHabit] = useState<string>("all");
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month
  const [selectedDay, setSelectedDay] = useState(today());

  const txt  = dark ? "text-white"    : "text-zinc-800";
  const sub  = dark ? "text-zinc-400" : "text-zinc-500";
  const card = dark ? "bg-[#1e1e1e] border border-[#2a2a2a]" : "bg-white";
  const pill = (active: boolean) =>
    active ? "bg-[#B5845A] text-white" : dark ? "bg-[#2a2a2a] text-zinc-300 hover:bg-[#333]" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200";

  // Which habits to count
  const filtered = filterHabit === "all" ? habits : habits.filter(h => h.id === filterHabit);

  // Count completions for a given date string across filtered habits
  function countForDay(d: string) {
    return filtered.filter(h => h.completedDays.includes(d)).length;
  }
  function maxPossible() { return filtered.length || 1; }

  // Intensity colour
  function heatColor(count: number, total: number) {
    if (total === 0 || count === 0) return dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const pct = count / total;
    if (pct <= 0.33) return "rgba(181,132,90,0.4)";
    if (pct <= 0.66) return "rgba(181,132,90,0.7)";
    return "#B5845A";
  }

  // ── Year view ──────────────────────────────────────────────────────────────
  function YearView() {
    const year = new Date().getFullYear();
    const start = new Date(`${year}-01-01`);
    // Align to Monday
    const startDow = (start.getDay() + 6) % 7;
    const cells: { date: string | null }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null });
    for (let d = new Date(start); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
      cells.push({ date: toDateStr(new Date(d)) });
    }
    // Pad to full weeks
    while (cells.length % 7 !== 0) cells.push({ date: null });

    const weeks: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    // Month label positions
    const monthLabels: { label: string; col: number }[] = [];
    weeks.forEach((week, wi) => {
      const firstReal = week.find(c => c.date);
      if (firstReal?.date) {
        const d = new Date(firstReal.date);
        if (d.getDate() <= 7) monthLabels.push({ label: MONTHS_SHORT[d.getMonth()], col: wi });
      }
    });

    const totalDone = filtered.reduce((s, h) => {
      return s + h.completedDays.filter(d => d.startsWith(`${year}`)).length;
    }, 0);

    return (
      <div>
        <div className={`${card} rounded-2xl p-4 mb-3`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-sm font-semibold ${txt}`}>{year} год</p>
            <p className={`text-xs ${sub}`}>{totalDone} выполнений</p>
          </div>
          {/* Month labels */}
          <div className="overflow-x-auto pb-1">
            <div style={{ minWidth: weeks.length * 13 }}>
              <div className="flex mb-0.5 ml-7">
                {weeks.map((_, wi) => {
                  const lbl = monthLabels.find(m => m.col === wi);
                  return (
                    <div key={wi} style={{ width: 11, marginRight: 2, flexShrink: 0 }}
                      className={`text-[9px] ${sub} truncate`}>
                      {lbl?.label ?? ""}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-0.5">
                {/* Day labels */}
                <div className="flex flex-col gap-0.5 mr-1">
                  {DAYS_SHORT.map((d, i) => (
                    <div key={d} style={{ height: 11 }}
                      className={`text-[9px] ${sub} flex items-center`}>
                      {i % 2 === 0 ? d : ""}
                    </div>
                  ))}
                </div>
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5" style={{ flexShrink: 0 }}>
                    {week.map((cell, di) => {
                      if (!cell.date) return <div key={di} style={{ width: 11, height: 11 }}/>;
                      const count = countForDay(cell.date);
                      const isFuture = cell.date > today();
                      return (
                        <button key={di} title={`${cell.date}: ${count}/${maxPossible()}`}
                          onClick={() => { setSelectedDay(cell.date!); setView("day"); }}
                          style={{ width: 11, height: 11, backgroundColor: isFuture ? (dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)") : heatColor(count, maxPossible()), borderRadius: 2 }}
                          className="transition-opacity hover:opacity-70"/>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-1 mt-2 justify-end">
            <span className={`text-[10px] ${sub}`}>Меньше</span>
            {[0, 0.4, 0.7, 1].map((op, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 2,
                backgroundColor: op === 0 ? (dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)") : `rgba(181,132,90,${op})` }}/>
            ))}
            <span className={`text-[10px] ${sub}`}>Больше</span>
          </div>
        </div>

        {/* Monthly summary bars */}
        <div className={`${card} rounded-2xl p-4`}>
          <p className={`text-sm font-semibold mb-3 ${txt}`}>По месяцам</p>
          <div className="space-y-2">
            {MONTHS_SHORT.map((m, mi) => {
              const prefix = `${year}-${String(mi + 1).padStart(2, "0")}`;
              const count  = filtered.reduce((s, h) => s + h.completedDays.filter(d => d.startsWith(prefix)).length, 0);
              const daysInMonth = new Date(year, mi + 1, 0).getDate();
              const max    = filtered.reduce((s, h) => s + Math.round(h.weeklyGoal / 7 * daysInMonth), 0) || 1;
              const pct    = max > 0 ? (count / max) * 100 : 0;
              const isFuture = mi > new Date().getMonth();
              return (
                <div key={m} className="flex items-center gap-2">
                  <span className={`text-xs w-8 flex-shrink-0 ${sub}`}>{m}</span>
                  <div className={`flex-1 h-5 rounded-lg overflow-hidden ${dark ? "bg-[#2a2a2a]" : "bg-[#f0e8e0]"}`}>
                    {!isFuture && (
                      <div className="h-full rounded-lg bg-[#B5845A] transition-all duration-500"
                        style={{ width: `${pct}%` }}/>
                    )}
                  </div>
                  <span className={`text-xs w-8 text-right flex-shrink-0 ${isFuture ? "opacity-30" : ""} ${sub}`}>
                    {isFuture ? "—" : count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Month view ─────────────────────────────────────────────────────────────
  function MonthView() {
    const base  = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + monthOffset);
    const year  = base.getFullYear();
    const month = base.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0

    const cells: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const monthDone = filtered.reduce((s, h) =>
      s + h.completedDays.filter(d => d.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).length, 0);

    return (
      <div className={`${card} rounded-2xl p-4`}>
        {/* Nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonthOffset(o => o - 1)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${dark ? "hover:bg-[#2a2a2a] text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div className="text-center">
            <p className={`text-sm font-semibold ${txt}`}>{MONTHS_RU[month]} {year}</p>
            <p className={`text-xs ${sub}`}>{monthDone} выполнений</p>
          </div>
          <button onClick={() => setMonthOffset(o => o + 1)} disabled={monthOffset >= 0}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 ${dark ? "hover:bg-[#2a2a2a] text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_SHORT.map(d => (
            <div key={d} className={`text-center text-[10px] font-medium pb-1 ${sub}`}>{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i}/>;
            const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const count   = countForDay(dateStr);
            const isToday = dateStr === today();
            const isFuture = dateStr > today();
            const pct = maxPossible() > 0 ? count / maxPossible() : 0;
            return (
              <button key={i} onClick={() => { setSelectedDay(dateStr); setView("day"); }}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all hover:opacity-80 relative ${
                  isToday ? "ring-2 ring-[#B5845A]" : ""
                }`}
                style={{ backgroundColor: isFuture ? "transparent" : heatColor(count, maxPossible()) }}>
                <span className={`text-xs font-medium ${
                  isFuture ? (dark ? "text-zinc-700" : "text-zinc-300")
                  : pct > 0.5 ? "text-white" : txt
                }`}>{day}</span>
                {!isFuture && count > 0 && (
                  <span className={`text-[8px] ${pct > 0.5 ? "text-white/70" : sub}`}>{count}/{maxPossible()}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Day view ───────────────────────────────────────────────────────────────
  function DayView() {
    const d = new Date(selectedDay + "T12:00:00");
    const dateLabel = d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
    const isFuture  = selectedDay > today();

    function changeDay(delta: number) {
      const nd = new Date(selectedDay + "T12:00:00");
      nd.setDate(nd.getDate() + delta);
      if (toDateStr(nd) <= today()) setSelectedDay(toDateStr(nd));
    }

    const doneFull  = filtered.filter(h => h.completedDays.includes(selectedDay));
    const notDone   = filtered.filter(h => !h.completedDays.includes(selectedDay));

    return (
      <div>
        {/* Date nav */}
        <div className={`${card} rounded-2xl p-4 mb-3`}>
          <div className="flex items-center justify-between">
            <button onClick={() => changeDay(-1)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${dark ? "hover:bg-[#2a2a2a] text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <p className={`text-sm font-semibold capitalize ${txt}`}>{dateLabel}</p>
            <button onClick={() => changeDay(1)} disabled={selectedDay >= today()}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30 ${dark ? "hover:bg-[#2a2a2a] text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className={`${card} rounded-2xl p-8 text-center`}>
            <p className={`text-sm ${sub}`}>Нет привычек для отображения</p>
          </div>
        )}

        {doneFull.length > 0 && (
          <div className={`${card} rounded-2xl mb-3 overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${dark ? "border-[#2a2a2a]" : "border-zinc-100"}`}>
              <p className={`text-xs font-semibold ${sub}`}>✅ Выполнено ({doneFull.length})</p>
            </div>
            {doneFull.map((h, i) => (
              <div key={h.id} className={`flex items-center gap-3 px-4 py-3 ${i < doneFull.length - 1 ? `border-b ${dark ? "border-[#2a2a2a]" : "border-zinc-100"}` : ""}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${dark ? "bg-[#2a2a2a]" : "bg-[#f4f0ec]"}`}>{h.emoji}</div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${txt}`}>{h.name}</span>
                  <p className={`text-xs ${sub}`}>Цель: {h.weeklyGoal === 7 ? "каждый день" : `${h.weeklyGoal}× в неделю`}</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#B5845A] flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
              </div>
            ))}
          </div>
        )}

        {notDone.length > 0 && !isFuture && (
          <div className={`${card} rounded-2xl overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${dark ? "border-[#2a2a2a]" : "border-zinc-100"}`}>
              <p className={`text-xs font-semibold ${sub}`}>❌ Не выполнено ({notDone.length})</p>
            </div>
            {notDone.map((h, i) => (
              <div key={h.id} className={`flex items-center gap-3 px-4 py-3 ${i < notDone.length - 1 ? `border-b ${dark ? "border-[#2a2a2a]" : "border-zinc-100"}` : ""}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${dark ? "bg-[#2a2a2a]" : "bg-[#f4f0ec]"}`}>{h.emoji}</div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm text-zinc-400`}>{h.name}</span>
                  <p className={`text-xs ${sub}`}>Цель: {h.weeklyGoal === 7 ? "каждый день" : `${h.weeklyGoal}× в неделю`}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 ${dark ? "border-[#3a3a3a]" : "border-zinc-200"}`}/>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Filter by habit */}
      {habits.length > 1 && (
        <div className="mb-3">
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setFilterHabit("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${pill(filterHabit === "all")}`}>
              Все привычки
            </button>
            {habits.map(h => (
              <button key={h.id} onClick={() => setFilterHabit(h.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${pill(filterHabit === h.id)}`}>
                {h.emoji} {h.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View switcher */}
      <div className={`flex gap-1 mb-4 p-1 rounded-xl ${dark ? "bg-[#1e1e1e]" : "bg-[#e8e0d8]"}`}>
        {(["year","month","day"] as StatsView[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
              view === v ? "bg-[#B5845A] text-white shadow-sm" : dark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-700"
            }`}>
            {v === "year" ? "Год" : v === "month" ? "Месяц" : "День"}
          </button>
        ))}
      </div>

      {view === "year"  && <YearView/>}
      {view === "month" && <MonthView/>}
      {view === "day"   && <DayView/>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function HabitTracker() {
  const [habits,   setHabits]   = useState<Habit[]>([]);
  const [theme,    setTheme]    = useState<Theme>("light");
  const [mounted,  setMounted]  = useState(false);
  const [showAdd,  setShowAdd]  = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [tab,      setTab]      = useState<MainTab>("habits");

  useEffect(() => {
    try {
      const h = localStorage.getItem(STORAGE_HABITS);
      if (h) setHabits(JSON.parse(h));
      const t = localStorage.getItem(STORAGE_THEME) as Theme | null;
      if (t) setTheme(t);
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  useEffect(() => { if (mounted) localStorage.setItem(STORAGE_HABITS, JSON.stringify(habits)); }, [habits, mounted]);
  useEffect(() => { if (mounted) localStorage.setItem(STORAGE_THEME, theme); }, [theme, mounted]);

  useEffect(() => {
    if (!menuOpen) return;
    const fn = () => setMenuOpen(null);
    window.addEventListener("click", fn);
    return () => window.removeEventListener("click", fn);
  }, [menuOpen]);

  function addHabit(name: string, emoji: string, weeklyGoal: number) {
    setHabits(p => [{ id: uid(), name, emoji, weeklyGoal, completedDays: [], createdAt: Date.now() }, ...p]);
  }
  function toggleToday(id: string) {
    const t = today();
    setHabits(p => p.map(h => h.id !== id ? h : {
      ...h, completedDays: h.completedDays.includes(t) ? h.completedDays.filter(d => d !== t) : [...h.completedDays, t],
    }));
  }
  function deleteHabit(id: string) { setHabits(p => p.filter(h => h.id !== id)); setMenuOpen(null); }

  const weekDates   = getWeekDates();
  const todayStr    = today();
  const completedToday = habits.filter(h => h.completedDays.includes(todayStr)).length;
  const maxStreak   = habits.reduce((m, h) => Math.max(m, calcStreak(h)), 0);
  const totalDone   = habits.reduce((s, h) => s + weeklyCount(h), 0);
  const totalPoss   = habits.reduce((s, h) => s + h.weeklyGoal, 0);
  const overallPct  = totalPoss > 0 ? Math.round((totalDone / totalPoss) * 100) : 0;
  const ach         = achievementLabel(overallPct);
  const dayActivity = weekDates.map(d => habits.some(h => h.completedDays.includes(d)));

  const dark = theme === "dark";
  const bg   = dark ? "bg-[#141414]" : "bg-[#f0ebe5]";
  const card = dark ? "bg-[#1e1e1e] border border-[#2a2a2a]" : "bg-white";
  const txt  = dark ? "text-white"   : "text-zinc-800";
  const sub  = dark ? "text-zinc-400": "text-zinc-500";
  const div  = dark ? "border-[#2a2a2a]" : "border-zinc-100";

  if (!mounted) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="w-8 h-8 border-2 border-[#B5845A]/30 border-t-[#B5845A] rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      {showAdd && <AddModal dark={dark} onAdd={addHabit} onClose={() => setShowAdd(false)}/>}

      <div className="max-w-xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className={`text-xl font-bold ${txt}`}>Трекер привычек</h1>
            <p className={`text-sm mt-0.5 ${sub}`}>Маленькие шаги — большие результаты 🚀</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(dark ? "light" : "dark")}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${dark ? "bg-[#2a2a2a] text-zinc-300 hover:bg-[#333]" : "bg-white text-zinc-500 hover:bg-zinc-100"}`}>
              {dark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B5845A] hover:bg-[#9e6e45] text-white text-sm font-medium transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Добавить
            </button>
          </div>
        </div>

        {/* Main tabs */}
        <div className={`flex gap-1 p-1 rounded-2xl mb-5 ${dark ? "bg-[#1e1e1e]" : "bg-[#e4ddd6]"}`}>
          {(["habits","stats"] as MainTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                tab === t ? (dark ? "bg-[#2a2a2a] text-white shadow-sm" : "bg-white text-zinc-800 shadow-sm")
                : dark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700"
              }`}>
              {t === "habits" ? "Привычки" : "Статистика"}
            </button>
          ))}
        </div>

        {/* ─── HABITS TAB ─── */}
        {tab === "habits" && (
          <>
            {/* Habit list */}
            {habits.length > 0 ? (
              <div className={`${card} rounded-2xl mb-4`}>
                <div className={`flex items-center justify-between px-4 pt-4 pb-3 border-b ${div}`}>
                  <h2 className={`text-sm font-semibold ${txt}`}>Мои привычки</h2>
                  <span className={`text-xs ${sub}`}>
                    {habits.length} {habits.length === 1 ? "привычка" : habits.length < 5 ? "привычки" : "привычек"}
                  </span>
                </div>
                {habits.map((habit, idx) => {
                  const wc   = weeklyCount(habit);
                  const pct  = weeklyPct(habit);
                  const done = habit.completedDays.includes(todayStr);
                  const last = idx === habits.length - 1;

                  return (
                    <div key={habit.id}
                      className={`flex items-center gap-3 px-4 py-3 ${!last ? `border-b ${div}` : ""}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${dark ? "bg-[#2a2a2a]" : "bg-[#f4f0ec]"}`}>
                        {habit.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${txt}`}>{habit.name}</p>
                        <p className={`text-xs mt-0.5 ${sub}`}>{wc} из {habit.weeklyGoal} {habit.weeklyGoal === 7 ? "дней" : habit.weeklyGoal === 1 ? "раза" : "раз"} на этой неделе</p>
                        <div className={`mt-1.5 h-1 rounded-full overflow-hidden ${dark ? "bg-[#2a2a2a]" : "bg-[#e8ddd4]"}`}>
                          <div className="h-full bg-[#B5845A] rounded-full transition-all duration-500" style={{ width: `${pct}%` }}/>
                        </div>
                      </div>
                      <div className="relative flex-shrink-0 w-14 h-14 flex items-center justify-center">
                        <Ring pct={pct} size={52} sw={4} dark={dark}/>
                        <span className={`absolute text-[11px] font-semibold ${txt}`}>{pct}%</span>
                      </div>
                      <button onClick={() => toggleToday(habit.id)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          done ? "bg-[#B5845A] text-white shadow-sm"
                          : dark ? "bg-[#2a2a2a] text-zinc-500 hover:bg-[#333] border border-[#3a3a3a]"
                          : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 border border-zinc-200"
                        }`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                      </button>

                      {/* 3-dot menu — rendered outside overflow context */}
                      <div className="relative flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === habit.id ? null : habit.id); }}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${dark ? "text-zinc-500 hover:bg-[#2a2a2a]" : "text-zinc-400 hover:bg-zinc-100"}`}>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                          </svg>
                        </button>
                        {menuOpen === habit.id && (
                          <div className={`absolute right-0 z-30 mt-1 ${dark ? "bg-[#2a2a2a] border border-[#3a3a3a]" : "bg-white border border-zinc-100"} rounded-xl shadow-2xl py-1 w-36 animate-scale-in`}
                            onClick={e => e.stopPropagation()}>
                            <button onClick={() => deleteHabit(habit.id)}
                              className={`w-full text-left px-3 py-2 text-sm text-red-500 rounded-xl transition-colors ${dark ? "hover:bg-[#3a2a2a]" : "hover:bg-red-50"}`}>
                              Удалить
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`${card} rounded-2xl p-10 text-center mb-4 animate-fade-in`}>
                <div className="text-4xl mb-3">🌱</div>
                <p className={`text-sm font-medium ${txt}`}>Добавьте первую привычку</p>
                <p className={`text-xs mt-1 ${sub}`}>Нажмите «Добавить» в правом верхнем углу</p>
              </div>
            )}

            {/* Achievements */}
            {habits.length > 0 && (
              <div className="rounded-2xl p-5 mb-4 bg-[#B5845A]">
                <h2 className="text-sm font-semibold text-white/80 mb-3">Мои достижения</h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                    <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6"/>
                      <circle cx="40" cy="40" r="32" fill="none" stroke="white" strokeWidth="6"
                        strokeDasharray={`${2*Math.PI*32}`}
                        strokeDashoffset={`${2*Math.PI*32*(1-overallPct/100)}`}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset .6s ease" }}/>
                    </svg>
                    <span className="absolute text-white font-bold text-base">{overallPct}%</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{ach.emoji} {ach.text}</p>
                    <p className="text-white/70 text-sm mt-0.5">{totalDone} из {totalPoss} выполнений за неделю</p>
                    {maxStreak > 0 && (
                      <p className="text-white/80 text-sm mt-1">
                        🔥 Серия: <span className="font-semibold text-white">{maxStreak} {pluralDays(maxStreak)}</span> подряд
                      </p>
                    )}
                    <p className="text-white/70 text-sm mt-0.5">
                      Сегодня: {completedToday} / {habits.length}
                    </p>
                  </div>
                </div>

                {/* Week heatmap */}
                <div className="rounded-xl p-3 bg-black/10">
                  <p className="text-white/70 text-xs mb-2">Активность за неделю</p>
                  <div className="flex gap-1.5">
                    {weekDates.map((d, i) => {
                      const isToday = d === todayStr;
                      const count   = habits.filter(h => h.completedDays.includes(d)).length;
                      const pct     = habits.length > 0 ? count / habits.length : 0;
                      return (
                        <div key={d} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`w-full aspect-square rounded-lg transition-all ${isToday && count > 0 ? "ring-2 ring-white/60" : ""}`}
                            style={{ backgroundColor: count > 0 ? `rgba(255,255,255,${0.25 + pct * 0.65})` : "rgba(255,255,255,0.1)" }}/>
                          <span className={`text-[10px] font-medium ${isToday ? "text-white" : "text-white/50"}`}>{DAYS_SHORT[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── STATS TAB ─── */}
        {tab === "stats" && (
          habits.length === 0 ? (
            <div className={`${card} rounded-2xl p-10 text-center animate-fade-in`}>
              <div className="text-4xl mb-3">📊</div>
              <p className={`text-sm font-medium ${txt}`}>Нет данных для статистики</p>
              <p className={`text-xs mt-1 ${sub}`}>Добавьте привычки на вкладке «Привычки»</p>
            </div>
          ) : (
            <StatsTab habits={habits} dark={dark}/>
          )
        )}

        <p className={`text-center text-xs ${sub} mt-2`}>Данные сохраняются в браузере</p>
      </div>
    </div>
  );
}
