import { useState, useRef, useEffect, useCallback } from "react";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://ncglsgerqoawmrwbfkpo.supabase.co";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZ2xzZ2VycW9hd21yd2Jma3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjYxMDUsImV4cCI6MjA4OTUwMjEwNX0.5Xez4yEadMMdp7f7oushd7Rp1j0vbAtqHFANbLbi8WA";

let _userId = "";
function setUserId(id) { _userId = id; }

async function sbGet(table, filters="") {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${filters}&user_id=eq.${_userId}`, {
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
    });
    if (!res.ok) { console.error("sbGet error:", res.status, await res.text()); return null; }
    return res.json();
  } catch(e) { console.error("sbGet fetch error:", e); return null; }
}

async function sbUpsert(table, data) {
  const conflicts = table === "user_settings" ? "user_id" : "user_id,date";
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?on_conflict=${conflicts}`, {
      method: "POST",
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({ ...data, user_id: _userId })
    });
    if (!res.ok) console.error("sbUpsert error:", res.status, await res.text());
  } catch(e) { console.error("sbUpsert fetch error:", e); }
}

// ── 한국 음식 칼로리 DB ──
const FOOD_DB = {
  "밥":300,"공기밥":300,"흰쌀밥":300,"현미밥":310,"잡곡밥":310,
  "김치찌개":150,"된장찌개":120,"순두부찌개":180,"부대찌개":400,
  "라면":500,"신라면":500,"짜파게티":560,"컵라면":350,
  "김밥":400,"참치김밥":430,"소고기김밥":450,
  "떡볶이":450,"라볶이":600,"치즈떡볶이":520,
  "삼겹살":550,"목살":450,"갈비":500,"불고기":400,
  "치킨":800,"후라이드치킨":800,"양념치킨":900,"반반치킨":850,"치킨 한마리":800,
  "피자":1100,"피자 한조각":280,"피자 한판":1100,
  "햄버거":500,"빅맥":550,"치즈버거":400,
  "비빔밥":550,"돌솥비빔밥":600,
  "제육볶음":450,"김치볶음밥":500,"볶음밥":480,
  "돈까스":650,"돈가스":650,"치킨까스":600,
  "냉면":450,"물냉면":400,"비빔냉면":480,
  "칼국수":400,"수제비":380,"잔치국수":350,
  "삼계탕":900,"설렁탕":450,"갈비탕":500,"육개장":350,
  "김치":30,"계란":80,"달걀":80,"계란프라이":120,"삶은계란":80,
  "두부":80,"샐러드":100,"닭가슴살":165,"고구마":130,"감자":80,
  "바나나":90,"사과":80,"귤":40,"딸기":30,"포도":60,
  "아메리카노":5,"카페라떼":150,"카푸치노":120,
  "콜라":140,"사이다":120,"주스":110,"우유":130,"두유":100,
  "맥주":150,"소주":280,"막걸리":250,
  "떡":250,"빵":280,"식빵":180,"크로와상":300,"도넛":300,
  "과자":200,"초콜릿":250,"아이스크림":200,"케이크":350,
  "족발":600,"보쌈":500,"쌈밥":400,
  "짜장면":650,"짬뽕":500,"탕수육":800,
  "초밥":400,"회":200,"연어":200,"참치":150,
  "토스트":300,"샌드위치":350,
  "국밥":500,"순대국":550,"감자탕":400,
  "파스타":550,"스파게티":550,"카르보나라":650,"크림파스타":650,
  "스테이크":500,"리조또":500,
  "만두":350,"군만두":400,"물만두":300,
  "오므라이스":550,"카레":500,"카레라이스":550,
  "튀김":300,"새우튀김":150,"야채튀김":200,
  "전":300,"김치전":300,"파전":350,"해물파전":400,
  "죽":200,"호박죽":180,"전복죽":250,
  "요거트":100,"그릭요거트":130,"프로틴":120,
};

function estimateCalories(foodName) {
  const name = foodName.trim().toLowerCase().replace(/\s+/g, "");
  // 정확한 매칭
  for (const [key, cal] of Object.entries(FOOD_DB)) {
    if (name === key.replace(/\s+/g, "")) return cal;
  }
  // 부분 매칭
  for (const [key, cal] of Object.entries(FOOD_DB)) {
    if (name.includes(key.replace(/\s+/g, "")) || key.replace(/\s+/g, "").includes(name)) return cal;
  }
  return null;
}

const SYSTEM = `당신은 다이어트 코치 "다이어트 쌤"입니다.

## 답변 스타일
- 2~3줄로 짧고 핵심만 답변
- 이모지는 1~2개만, 과하게 쓰지 마
- 친근하지만 간결하게
- 뻔한 말 반복하지 마 (화이팅, 응원 등 매번 넣지 마)

## 일반 대화
- 사용자가 뭘 먹었다, 물 마셨다, 운동했다 하면 "확인!" 정도로 짧게 응답
- 질문하면 핵심만 답변
- 음식 사진이 오면: 음식 이름, 추정 칼로리, 한줄 코멘트

## 운동/WOD 사진 분석
- 크로스핏 WOD 보드, 운동 루틴, 운동 기록 사진이 오면:
  1. WOD 내용 읽기 (종목, 횟수, 라운드, 시간 등)
  2. 추정 소모 칼로리 (체중 70~80kg 성인 남성 기준)
  3. 난이도 한줄 코멘트
- WOD 사진을 보내면 바로 운동 기록으로 자동 저장 (auto_record 포함)
- 별도로 "했어", "완료" 안 해도 사진 올리면 바로 기록
- 소모 칼로리 추정: 크로스핏 WOD 평균 분당 12~18kcal
  - AMRAP 10분: 약 150~200kcal
  - For Time 15~20분: 약 250~400kcal
  - EMOM 20분: 약 200~300kcal
  - Hero WOD / 긴 WOD: 400~600kcal

## "정리해줘" 요청 시
사용자가 "정리해줘", "오늘 정리", "하루 정리" 등 요청하면:
오늘 기록된 데이터를 보고 아래 형식으로 깔끔하게 정리:

📋 오늘의 기록
- 먹은 것: (목록 + 총 칼로리)
- 수분: 총 ml
- 운동: 목록
- 한줄 총평 (잘한 점 or 개선할 점 하나만)

## 체형 분석 (사진 있을 때만)
1. 체형 타입
2. 집중 관리 부위
3. 추천 운동 3~5가지 (세트/횟수 포함)
4. 식단 조언 한줄

## 인바디 결과지 분석 (사진 있을 때)
인바디 결과지 사진이 오면:
1. 주요 수치 읽기: 체중, 골격근량, 체지방량, 체지방률, BMI
2. 간단 평가: 근육량 충분/부족, 체지방 적정/과다
3. 이전 인바디 데이터가 있으면 변화 비교
4. 맞춤 한줄 조언 (근육 늘리기 or 체지방 줄이기 등)
- 수치를 auto_record로 기록하지 않음 (채팅으로만 분석)

## 자동 기록 (최우선 규칙 - 반드시 지켜야 함)
아래 상황에서는 응답 맨 마지막에 반드시 auto_record JSON 블록을 추가해야 합니다:
1. 사용자가 음식을 먹었다고 말할 때
2. 사용자가 물/음료를 마셨다고 말할 때
3. 사용자가 운동했다고 말할 때
4. 음식 사진이 올 때 (사진만 와도 auto_record 필수)
5. 사진 + "먹었어", "이거 먹었어", "반만 먹었어" 등 먹었다는 표현이 있을 때
6. WOD/운동 사진이 올 때

형식 (반드시 이 형식 그대로):
\`\`\`auto_record
{"food":[{"name":"음식이름","cal":추정칼로리}],"water":마신ml수,"exercise":["운동내용 (-소모kcal)"]}
\`\`\`

규칙:
- 이 블록이 없으면 기록이 안 되므로 절대 빠뜨리지 마
- 사진에서 음식이 보이고 사용자가 먹었다고 하면 → 사진 속 음식 기준으로 칼로리 추정
- "반만 먹었어" → 절반 칼로리, "조금 먹었어" → 1/3 칼로리로 조정
- "120g 먹었어" 같이 그램 수 언급 시 → 해당 양 기준 칼로리 계산
- 칼로리는 한국 음식 기준 추정
- 컵=200ml, 병=500ml
- 운동은 종목과 추정 소모 칼로리 포함 (예: "크로스핏 WOD Fran (-350kcal)")
- 해당 없는 항목은 빈 배열이나 0
- auto_record는 응답의 맨 마지막에 위치해야 함`;

const QUICK = [
  "🍗 치킨 먹어도 돼요?",
  "🌙 야식 먹고 싶어요",
  "🏃 운동 없이 살 빠질까요?",
  "📋 일주일 식단 짜주세요",
  "💧 물 얼마나 마셔요?",
  "💪 오늘 운동 루틴 짜줘요",
  "📸 체형 분석해줘",
];

const MOTIVATION = [
  "오늘도 화이팅! 작은 노력이 쌓여요 💪",
  "어제보다 나은 오늘! 잘 하고 있어요 🌟",
  "꾸준함이 최고의 다이어트예요 🥗",
  "몸이 변하는 중이에요. 믿어보세요! ✨",
  "오늘 기록 남기는 것 자체가 대단해요 👏",
  "포기하지 않는 당신이 이미 성공이에요 🎯",
];

const todayStr = () => new Date().toISOString().slice(0, 10);
// localStorage는 userId, darkMode, 당일 채팅만 사용
function load(key, fb) { try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; } }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

async function fetchFromSupabase(setWeightLog, setDailyLog, setGoalWeight, setHeight) {
  const weights = await sbGet("weight_log", "order=date.asc");
  if (weights) {
    setWeightLog(weights.map(w => ({ date: w.date, kg: w.kg })));
  }

  const days = await sbGet("daily_log", "");
  if (days) {
    const dLog = {};
    days.forEach(d => { dLog[d.date] = { food: d.food||[], water: d.water||0, exercise: d.exercise||[] }; });
    setDailyLog(dLog);
  }

  const settings = await sbGet("user_settings", "");
  if (settings && settings.length > 0) {
    const gw = settings[0].goal_weight; const h = settings[0].height;
    if (gw) setGoalWeight(gw);
    if (h) setHeight(h);
  }
}

// ── CSS 애니메이션 ──
const ANIM_STYLE = `
@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
@keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.05); } }
@keyframes dots { 0%,20% { content:'·'; } 40% { content:'··'; } 60%,100% { content:'···'; } }
@keyframes shimmer { 0% { background-position:-200px 0; } 100% { background-position:200px 0; } }
@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
.fade-in { animation: fadeIn 0.3s ease-out; }
.slide-up { animation: slideUp 0.4s ease-out; }
.skeleton {
  background: linear-gradient(90deg, var(--skeleton-from) 25%, var(--skeleton-to) 50%, var(--skeleton-from) 75%);
  background-size: 400px 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
`;

// ── 테마 ──
const themes = {
  light: {
    bg: "#f0fdf4", card: "#fff", text: "#111", textSub: "#555", textMuted: "#888", textFaint: "#aaa",
    primary: "#16a34a", primaryDark: "#15803d", primaryLight: "#dcfce7", primaryBorder: "#bbf7d0",
    inputBg: "#f0fdf4", headerBg: "#16a34a", headerText: "#fff", headerSub: "#bbf7d0",
    border: "#e5f5e5", danger: "#dc2626", dangerBg: "#fef2f2",
    barBg: "#e5f5e5", shadow: "rgba(0,0,0,0.06)", tagBg: "#f0fdf4",
    skeletonFrom: "#e5f5e5", skeletonTo: "#d1fae5",
    userBubble: "#16a34a", userBubbleText: "#fff", botBubble: "#fff", botBubbleText: "#111",
    calOver: "#ef4444", bmiLow: "#3b82f6", bmiNormal: "#16a34a", bmiOver: "#f59e0b", bmiObese: "#ef4444",
    gradientStart: "#16a34a", gradientEnd: "#15803d",
    autoRecordBg: "#f0fdf4", autoRecordBorder: "#16a34a",
  },
  dark: {
    bg: "#0f1a14", card: "#1a2e22", text: "#e5e7eb", textSub: "#9ca3af", textMuted: "#6b7280", textFaint: "#4b5563",
    primary: "#22c55e", primaryDark: "#16a34a", primaryLight: "#052e16", primaryBorder: "#14532d",
    inputBg: "#1a2e22", headerBg: "#14532d", headerText: "#f0fdf4", headerSub: "#4ade80",
    border: "#1f3d2a", danger: "#f87171", dangerBg: "#450a0a",
    barBg: "#1f3d2a", shadow: "rgba(0,0,0,0.3)", tagBg: "#14532d",
    skeletonFrom: "#1f3d2a", skeletonTo: "#14532d",
    userBubble: "#16a34a", userBubbleText: "#fff", botBubble: "#1a2e22", botBubbleText: "#e5e7eb",
    calOver: "#f87171", bmiLow: "#60a5fa", bmiNormal: "#22c55e", bmiOver: "#fbbf24", bmiObese: "#f87171",
    gradientStart: "#14532d", gradientEnd: "#052e16",
    autoRecordBg: "#14532d", autoRecordBorder: "#22c55e",
  }
};

// ── 탭바 ──
function TabBar({ tab, setTab, t }) {
  const tabs = [
    { id:"chat",   label:"💬 채팅" },
    { id:"record", label:"📝 기록" },
    { id:"calendar", label:"📅 캘린더" },
    { id:"stats",  label:"📈 통계" },
    { id:"weekly", label:"🏆 리포트" },
  ];
  return (
    <div style={{ display:"flex", background:t.card, borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
      {tabs.map(tb => (
        <button key={tb.id} onClick={() => setTab(tb.id)}
          style={{ flex:1, padding:"9px 2px", border:"none", background:"none", fontSize:12, fontWeight:500,
            color:tab===tb.id?t.primary:t.textMuted,
            borderBottom:tab===tb.id?`2.5px solid ${t.primary}`:"2.5px solid transparent",
            cursor:"pointer", transition:"all 0.2s" }}>
          {tb.label}
        </button>
      ))}
    </div>
  );
}

// ── 체중 그래프 (SVG) ──
function WeightGraph({ weightLog, t }) {
  if (weightLog.length < 2) return (
    <div style={{ textAlign:"center", color:t.textFaint, fontSize:13, padding:20 }}>
      체중을 2개 이상 기록하면 그래프가 나와요!
    </div>
  );
  const recent = weightLog.slice(-10);
  const kgs = recent.map(w => w.kg);
  const min = Math.min(...kgs) - 1;
  const max = Math.max(...kgs) + 1;
  const W = 300, H = 120, pad = 10;
  const x = (i) => pad + (i / (recent.length - 1)) * (W - pad * 2);
  const y = (kg) => H - pad - ((kg - min) / (max - min)) * (H - pad * 2);
  const points = recent.map((w, i) => `${x(i)},${y(w.kg)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:H }}>
      <polyline fill="none" stroke={t.primary} strokeWidth="2.5" strokeLinejoin="round" points={points} />
      {recent.map((w, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(w.kg)} r="4" fill={t.primary} />
          <text x={x(i)} y={y(w.kg) - 8} textAnchor="middle" fontSize="10" fill={t.primary} fontWeight="600">{w.kg}</text>
        </g>
      ))}
      <text x={pad} y={H - 2} fontSize="9" fill={t.textFaint}>{recent[0]?.date?.slice(5)}</text>
      <text x={W - pad} y={H - 2} textAnchor="end" fontSize="9" fill={t.textFaint}>{recent[recent.length-1]?.date?.slice(5)}</text>
    </svg>
  );
}

// ── 로딩 스켈레톤 ──
function Skeleton({ width="100%", height=16, style={} }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

function SkeletonCard({ t }) {
  return (
    <div style={{ background:t.card, borderRadius:16, padding:16, boxShadow:`0 1px 4px ${t.shadow}` }}>
      <Skeleton width="40%" height={18} style={{ marginBottom:12 }} />
      <Skeleton width="100%" height={14} style={{ marginBottom:8 }} />
      <Skeleton width="70%" height={14} />
    </div>
  );
}

// ── 자동 기록 파싱 ──
function parseAutoRecord(text) {
  const match = text.match(/```auto_record\s*\n?([\s\S]*?)\n?```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch { return null; }
}

function stripAutoRecord(text) {
  return text.replace(/\n?```auto_record[\s\S]*?```\n?/g, "").trim();
}

export default function App() {
  const [userId, setUserIdState] = useState(() => load("userId", null));
  const [nickInput, setNickInput] = useState("");
  const [tab, setTab] = useState("chat");
  const [dark, setDark] = useState(() => load("darkMode", false));
  const t = dark ? themes.dark : themes.light;
  const motivation = MOTIVATION[new Date().getDay() % MOTIVATION.length];

  // userId 설정 시 모듈 변수도 동기화
  useEffect(() => { if (userId) setUserId(userId); }, [userId]);
  useEffect(() => { save("darkMode", dark); }, [dark]);

  function login() {
    const nick = nickInput.trim();
    if (!nick) return;
    setUserIdState(nick); save("userId", nick); setUserId(nick);
  }

  function logout() {
    setUserIdState(null); save("userId", null); setUserId("");
    setWeightLog([]); setDailyLog({}); setGoalWeight(null); setHeight(null);
    setFavorites([]); setChecks(DEFAULT_CHECKLIST.map(()=>false));
    setMsgs([{ role:"assistant", text:"안녕하세요! 저는 다이어트 쌤이에요 🥗" }]);
    history.current = [];
  }

  function pickUser(name) {
    setUserId(name);
    setUserIdState(name); save("userId", name);
    // Supabase에서 데이터 로드 (useEffect[userId]에서 처리)
    // 채팅 기록 복원 (당일만, localStorage)
    const savedDate = load(`${name}_msgsDate`, null);
    if (savedDate === todayStr()) {
      setMsgs(load(`${name}_msgs`, [{ role:"assistant", text:`${name}님 안녕! 다이어트 쌤이에요 🥗\n뭐 먹었는지, 운동했는지 알려주시면 기록해드릴게요!` }]));
      history.current = load(`${name}_chatHistory`, []);
    } else {
      setMsgs([{ role:"assistant", text:`${name}님 안녕! 다이어트 쌤이에요 🥗\n뭐 먹었는지, 운동했는지 알려주시면 기록해드릴게요!` }]);
      history.current = [];
    }
    // 나머지 초기화
    setWeightLog([]); setDailyLog({}); setGoalWeight(null); setHeight(null);
    setFavorites([]); setChecks(DEFAULT_CHECKLIST.map(()=>false));
    setRoutineResult(""); setWeeklyResult(""); setSelectedDate(null);
    setPreview(null); setError(""); setInput(""); setFInput(""); setFCalInput("");
    setWaterInput(""); setExInput(""); setGoalInput(""); setHeightInput("");
  }

  const DEFAULT_CHECKLIST = ["체중 기록하기 ⚖️","물 2000ml 마시기 💧","운동하기 🏃","야식 안 먹기 🌙","채소 먹기 🥦"];

  // ── 풀 투 리프레시 ──
  const [pullY, setPullY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);

  function onTouchStart(e) {
    const el = e.currentTarget;
    if (el.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }
  function onTouchMove(e) {
    if (!pulling) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setPullY(Math.min(diff * 0.4, 80));
    }
  }
  function onTouchEnd() {
    if (pullY > 60) {
      setRefreshing(true);
      setPullY(50);
      fetchFromSupabase(setWeightLog, setDailyLog, setGoalWeight, setHeight).finally(() => {
        setRefreshing(false);
        setPullY(0);
        setPulling(false);
      });
    } else {
      setPullY(0);
      setPulling(false);
    }
  }

  // ── 채팅 (당일만 유지, 자정 넘으면 리셋, localStorage) ──
  const defaultMsgs = [{ role:"assistant", text:"안녕하세요! 저는 다이어트 쌤이에요 🥗\n식단·운동·체중 뭐든 물어보세요!\n📸 음식 사진 보내면 칼로리 분석도 해드려요!\n\n💡 먹은 것이나 운동을 채팅으로 알려주시면 자동으로 기록해드려요!" }];
  const [msgs, setMsgs] = useState(() => {
    const saved = load(`${userId}_msgs`, null);
    const savedDate = load(`${userId}_msgsDate`, null);
    if (saved && savedDate === todayStr()) return saved;
    return defaultMsgs;
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const bottom = useRef(null);
  const fileRef = useRef(null);
  const history = useRef((() => {
    const savedDate = load(`${userId}_chatHistoryDate`, null);
    if (savedDate === todayStr()) return load(`${userId}_chatHistory`, []);
    return [];
  })());

  // ── 기록 (Supabase 단독) ──
  const [weightLog, setWeightLog] = useState([]);
  const [dailyLog,  setDailyLog]  = useState({});
  const [goalWeight, setGoalWeight] = useState(null);
  const [wInput, setWInput] = useState("");
  const [fInput, setFInput] = useState("");
  const [fCalInput, setFCalInput] = useState("");
  const [waterInput, setWaterInput] = useState("");
  const [exInput, setExInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [height, setHeight] = useState(null);
  const [routineResult, setRoutineResult] = useState("");
  const [routineBusy, setRoutineBusy] = useState(false);
  const [syncing, setSyncing] = useState(true);

  // ── 즐겨찾기 (localStorage - 유저별) ──
  const [favorites, setFavorites] = useState(() => load(`${userId}_favFoods`, []));

  function addFavorite(name, cal) {
    if (favorites.some(f => f.name === name)) return;
    const updated = [...favorites, { name, cal }];
    setFavorites(updated); save(`${userId}_favFoods`, updated);
  }

  function removeFavorite(name) {
    const updated = favorites.filter(f => f.name !== name);
    setFavorites(updated); save(`${userId}_favFoods`, updated);
  }

  const [checks, setChecks] = useState(() => load(`${userId}_checks_${new Date().toISOString().slice(0,10)}`, DEFAULT_CHECKLIST.map(()=>false)));

  function saveHeight() {
    const h = parseFloat(heightInput);
    if (!h || h < 100 || h > 250) return;
    setHeight(h); setHeightInput("");
    sbUpsert("user_settings", { goal_weight: goalWeight||null, height: h });
  }

  function toggleCheck(i) {
    const updated = checks.map((c,j) => j===i ? !c : c);
    setChecks(updated);
    save(`${userId}_checks_${new Date().toISOString().slice(0,10)}`, updated);
  }

  async function getRoutine() {
    setRoutineBusy(true); setRoutineResult("");
    const prompt = `사용자 정보:
목표 체중: ${goalWeight?goalWeight+"kg":"미설정"}
현재 체중: ${latestKg?latestKg+"kg":"미기록"}
키: ${height?height+"cm":"미입력"}
오늘 운동 기록: ${todayData.exercise.join(", ")||"없음"}

이 사람에게 맞는 오늘 운동 루틴을 짜주세요. 초보자도 할 수 있게 구체적으로 세트수, 횟수 포함해서 알려주세요. 이모지 사용해서 재미있게!`;
    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-6-20250514", max_tokens:800, system:SYSTEM, messages:[{role:"user",content:prompt}] }),
      });
      const data = await res.json();
      setRoutineResult(data.content?.[0]?.text || "오류 발생");
    } catch(e) { setRoutineResult("오류: "+e.message); }
    setRoutineBusy(false);
  }

  // ── 캘린더 ──
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  // ── 주간 리포트 ──
  const [weeklyResult, setWeeklyResult] = useState("");
  const [weeklyBusy, setWeeklyBusy] = useState(false);

  useEffect(() => {
    setSyncing(true);
    if (!userId) return;
    fetchFromSupabase(setWeightLog, setDailyLog, setGoalWeight, setHeight).finally(() => setSyncing(false));
  }, [userId]);

  useEffect(() => {
    save(`${userId}_msgs`, msgs);
    save(`${userId}_msgsDate`, todayStr());
    bottom.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs]);

  // history 변경 시 localStorage에 저장 (채팅만 로컬)
  const saveHistory = () => {
    save(`${userId}_chatHistory`, history.current);
    save(`${userId}_chatHistoryDate`, todayStr());
  };

  const td = todayStr();
  const todayData = dailyLog[td] || { food:[], water:0, exercise:[] };
  const totalCal = (todayData.food || []).reduce((sum, f) => sum + (f.cal || 0), 0);

  const updateToday = useCallback((patch) => {
    setDailyLog(prev => {
      const current = prev[td] || { food:[], water:0, exercise:[] };
      const newData = { ...current, ...patch };
      const updated = { ...prev, [td]: newData };
      sbUpsert("daily_log", { date: td, food: newData.food||[], water: newData.water||0, exercise: newData.exercise||[] });
      return updated;
    });
  }, [td, userId]);

  function addWeight() {
    const kg = parseFloat(wInput);
    if (!kg || kg < 20 || kg > 300) return;
    const updated = [...weightLog.filter(w => w.date !== td), { date:td, kg }].sort((a,b)=>a.date.localeCompare(b.date));
    setWeightLog(updated); setWInput("");
    sbUpsert("weight_log", { date: td, kg });
  }

  function saveGoal() {
    const kg = parseFloat(goalInput);
    if (!kg || kg < 20 || kg > 300) return;
    setGoalWeight(kg); setGoalInput("");
    sbUpsert("user_settings", { goal_weight: kg, height: height||null });
  }

  function addFood(name, cal) {
    const foodName = name || fInput.trim();
    if (!foodName) return;
    const foodCal = cal ?? (parseInt(fCalInput) || estimateCalories(foodName) || 0);
    updateToday({ food:[...todayData.food, { name: foodName, cal: foodCal }] });
    if (!name) { setFInput(""); setFCalInput(""); }
  }

  function addWater(ml) { const amount = ml || parseInt(waterInput) || 200; updateToday({ water:(todayData.water||0)+amount }); if (!ml) setWaterInput(""); }
  function addEx(ex) { const name = ex || exInput.trim(); if (!name) return; updateToday({ exercise:[...todayData.exercise, name] }); if (!ex) setExInput(""); }

  // 음식 자동완성
  const [foodSuggestions, setFoodSuggestions] = useState([]);

  function onFoodInputChange(val) {
    setFInput(val);
    const trimmed = val.trim().toLowerCase();
    if (trimmed.length > 0) {
      const matches = Object.entries(FOOD_DB)
        .filter(([key]) => key.includes(trimmed))
        .slice(0, 5)
        .map(([name, cal]) => ({ name, cal }));
      setFoodSuggestions(matches);
      const est = estimateCalories(val);
      if (est && !fCalInput) setFCalInput(String(est));
    } else {
      setFoodSuggestions([]);
    }
  }

  function selectSuggestion(s) {
    setFInput(s.name);
    setFCalInput(String(s.cal));
    setFoodSuggestions([]);
  }

  const latestKg = weightLog.length > 0 ? weightLog[weightLog.length-1].kg : null;
  const startKg  = weightLog.length > 0 ? weightLog[0].kg : null;
  let progress = null;
  if (goalWeight && startKg && latestKg && startKg !== goalWeight) {
    const pct = Math.min(100, Math.max(0, ((startKg - latestKg) / (startKg - goalWeight)) * 100));
    progress = Math.round(pct);
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPreview({ base64:reader.result.split(",")[1], mediaType:file.type, url:reader.result });
    reader.readAsDataURL(file);
  }

  // ── 자동 기록 적용 ──
  function applyAutoRecord(record) {
    if (!record) return;
    const currentData = dailyLog[td] || { food:[], water:0, exercise:[] };
    const patch = {};
    if (record.food && record.food.length > 0) {
      patch.food = [...currentData.food, ...record.food];
    }
    if (record.water && record.water > 0) {
      patch.water = (currentData.water || 0) + record.water;
    }
    if (record.exercise && record.exercise.length > 0) {
      patch.exercise = [...currentData.exercise, ...record.exercise];
    }
    if (Object.keys(patch).length > 0) {
      updateToday(patch);
    }
  }

  // ── 채팅 전송 ──
  async function send(text) {
    const msg = text || input.trim();
    if ((!msg && !preview) || busy) return;
    setInput(""); setError(""); setBusy(true);
    const isBodyAnalysis = (msg||"").includes("체형 분석");
    if (isBodyAnalysis && !preview) {
      setBusy(false);
      setMsgs(prev => [...prev,
        { role:"user", text:msg, imageUrl:null },
        { role:"assistant", text:"전신 또는 상체 사진을 📷 버튼으로 첨부해서 다시 보내주세요!\n사진이 있어야 체형 분석이 가능해요 🙏" }
      ]);
      return;
    }
    setMsgs(prev => [...prev, { role:"user", text:msg||"이 음식 어때요?", imageUrl:preview?.url||null }]);
    const content = [];
    if (preview) content.push({ type:"image", source:{ type:"base64", media_type:preview.mediaType, data:preview.base64 } });
    const defaultPrompt = preview && !msg
      ? "이 사진을 분석해주세요. 음식이면 칼로리와 다이어트 적합도를, 사람 사진이면 체형 분석과 맞춤 운동을 알려주세요."
      : msg || "이 음식 분석해주세요.";
    content.push({ type:"text", text:defaultPrompt });
    history.current.push({ role:"user", content });
    saveHistory();
    setPreview(null);
    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ model:"claude-sonnet-4-6-20250514", max_tokens:800, system:SYSTEM + `\n\n[사용자 현황]\n목표 체중: ${goalWeight ? goalWeight+"kg" : "미설정"}\n현재 체중: ${latestKg ? latestKg+"kg" : "미기록"}\n오늘 먹은 것: ${todayData.food.map(f=>f.name||(f+"")).join(", ")||"없음"}\n오늘 칼로리: ${totalCal}kcal\n오늘 수분: ${todayData.water||0}ml\n오늘 운동: ${todayData.exercise.join(", ")||"없음"}\n목표 달성률: ${progress!==null?progress+"%":"계산불가"}\n\n이 정보를 바탕으로 맞춤 조언을 해주세요.`, messages:history.current }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e?.error?.message||`HTTP ${res.status}`); }
      const data = await res.json();
      const rawReply = data.content?.[0]?.text;
      if (!rawReply) throw new Error("응답 없음");

      // 자동 기록 파싱 및 적용
      const autoRecord = parseAutoRecord(rawReply);
      const cleanReply = stripAutoRecord(rawReply);

      history.current.push({ role:"assistant", content:cleanReply });
      saveHistory();

      let autoRecordMsg = null;
      if (autoRecord) {
        applyAutoRecord(autoRecord);
        const parts = [];
        if (autoRecord.food?.length) parts.push(autoRecord.food.map(f => `${f.name}(${f.cal}kcal)`).join(", "));
        if (autoRecord.water > 0) parts.push(`물 ${autoRecord.water}ml`);
        if (autoRecord.exercise?.length) parts.push(autoRecord.exercise.join(", "));
        autoRecordMsg = `📝 자동 기록됨: ${parts.join(" / ")}`;
      }

      setMsgs(prev => [...prev, { role:"assistant", text:cleanReply, autoRecord: autoRecordMsg }]);
    } catch(e) { setError("오류: "+e.message); }
    finally { setBusy(false); }
  }

  // ── 주간 리포트 ──
  async function getWeekly() {
    setWeeklyBusy(true); setWeeklyResult("");
    const lines = [];
    for (let i=6; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const ds = d.toISOString().slice(0,10);
      const w  = weightLog.find(x=>x.date===ds);
      const dl = dailyLog[ds] || {};
      const foods = (dl.food||[]).map(f => f.name ? `${f.name}${f.cal?`(${f.cal}kcal)`:""}` : f).join(", ");
      lines.push(`📅 ${ds}\n체중: ${w?w.kg+"kg":"미기록"}\n음식: ${foods||"미기록"}\n물: ${dl.water?dl.water+"ml":"미기록"}\n운동: ${(dl.exercise||[]).join(", ")||"미기록"}`);
    }
    const prompt = `지난 7일 기록 분석해서 주간 리포트 작성해주세요.\n\n${lines.join("\n\n")}\n\n체중변화, 식습관, 수분, 운동 패턴 분석하고 다음주 개선 포인트 3가지 알려주세요. 이모지 사용해서 친근하게!`;
    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ model:"claude-sonnet-4-6-20250514", max_tokens:1000, system:SYSTEM, messages:[{ role:"user", content:prompt }] }),
      });
      const data = await res.json();
      setWeeklyResult(data.content?.[0]?.text || "오류 발생");
    } catch(e) { setWeeklyResult("오류: "+e.message); }
    setWeeklyBusy(false);
  }

  const inputStyle = { padding:"9px 12px", borderRadius:20, border:`1.5px solid ${t.primaryBorder}`, background:t.inputBg, fontSize:13, outline:"none", color:t.text, transition:"all 0.2s" };
  const addBtn = (onClick, label="추가") => (
    <button onClick={onClick} style={{ padding:"9px 16px", borderRadius:20, border:"none", background:t.primary, color:"#fff", fontSize:13, fontWeight:500, cursor:"pointer", flexShrink:0, transition:"all 0.2s" }}>{label}</button>
  );
  const card = { background:t.card, borderRadius:16, padding:16, boxShadow:`0 1px 4px ${t.shadow}`, marginBottom:0, transition:"all 0.3s" };

  // ── 로그인 화면 ──
  if (!userId) {
    return (
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", maxWidth:480, margin:"0 auto", fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif", background:"#f0fdf4", justifyContent:"center", alignItems:"center", padding:32 }}>
        <div style={{ width:80, height:80, borderRadius:"50%", background:"#16a34a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, marginBottom:20 }}>🥗</div>
        <div style={{ fontSize:24, fontWeight:700, color:"#16a34a", marginBottom:8 }}>다이어트 쌤</div>
        <div style={{ fontSize:14, color:"#888", marginBottom:32 }}>누구세요?</div>
        <div style={{ display:"flex", gap:16, width:"100%" }}>
          {[{name:"곰탱이",emoji:"🐻"},{name:"베베",emoji:"🐰"}].map(u => (
            <button key={u.name} onClick={() => pickUser(u.name)}
              style={{ flex:1, padding:"24px 16px", borderRadius:20, border:"2px solid #bbf7d0", background:"#fff", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8, transition:"all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background="#f0fdf4"; e.currentTarget.style.borderColor="#16a34a"; }}
              onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.borderColor="#bbf7d0"; }}>
              <span style={{ fontSize:48 }}>{u.emoji}</span>
              <span style={{ fontSize:18, fontWeight:700, color:"#16a34a" }}>{u.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", maxWidth:480, margin:"0 auto", fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif", background:t.bg, transition:"background 0.3s", overflow:"hidden" }}>
      <style>{ANIM_STYLE.replace(/var\(--skeleton-from\)/g, t.skeletonFrom).replace(/var\(--skeleton-to\)/g, t.skeletonTo)}</style>

      {/* 풀 투 리프레시 인디케이터 */}
      {pullY > 0 && (
        <div style={{ height:pullY, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition: pulling ? "none" : "height 0.3s" }}>
          <span style={{ fontSize:20, transform:`rotate(${refreshing ? 360 : pullY * 3}deg)`, transition: refreshing ? "transform 0.5s linear" : "none", animation: refreshing ? "spin 0.8s linear infinite" : "none" }}>🔄</span>
        </div>
      )}

      {/* 헤더 */}
      <div style={{ background:t.headerBg, padding:"12px 18px", flexShrink:0, transition:"background 0.3s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🥗</div>
          <div style={{ flex:1 }}>
            <div style={{ color:t.headerText, fontWeight:600, fontSize:16 }}>다이어트 쌤 <span style={{ fontSize:12, fontWeight:400, opacity:0.8 }}>({userId})</span></div>
            <div style={{ color:t.headerSub, fontSize:11 }}>{busy||weeklyBusy?"분석 중...":"온라인 · 사진 분석 가능"}</div>
          </div>
          {/* 로그아웃 */}
          <button onClick={logout} style={{ width:36, height:36, borderRadius:"50%", border:"none", background:"rgba(255,255,255,0.2)", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", color:"#fff" }}>
            ↩
          </button>
          {/* 다크모드 토글 */}
          <button onClick={() => setDark(!dark)} style={{ width:36, height:36, borderRadius:"50%", border:"none", background:"rgba(255,255,255,0.2)", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
            {dark ? "☀️" : "🌙"}
          </button>
          {progress !== null && (
            <div style={{ background:"rgba(255,255,255,0.2)", borderRadius:12, padding:"4px 10px", textAlign:"center" }}>
              <div style={{ color:t.headerText, fontSize:11 }}>목표 달성</div>
              <div style={{ color:t.headerText, fontWeight:700, fontSize:16 }}>{progress}%</div>
            </div>
          )}
        </div>
        <div style={{ marginTop:8, background:"rgba(255,255,255,0.15)", borderRadius:10, padding:"6px 12px", fontSize:12, color:"#f0fdf4" }}>
          {motivation}
        </div>
      </div>

      <TabBar tab={tab} setTab={setTab} t={t} />

      {/* ══ 채팅 ══ */}
      {tab==="chat" && (
        <>
          <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:10, background:t.bg, transition:"background 0.3s" }}>
            {msgs.map((m,i) => (
              <div key={i} className="fade-in" style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", alignItems:"flex-end", gap:8 }}>
                {m.role==="assistant" && <div style={{ width:28, height:28, borderRadius:"50%", background:t.primary, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>🥗</div>}
                <div style={{ maxWidth:"75%", display:"flex", flexDirection:"column", gap:6, alignItems:m.role==="user"?"flex-end":"flex-start" }}>
                  {m.imageUrl && <img src={m.imageUrl} alt="" style={{ maxWidth:200, maxHeight:200, borderRadius:12, objectFit:"cover", border:`2px solid ${t.primary}` }} />}
                  {m.text && <div style={{ padding:"10px 14px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", background:m.role==="user"?t.userBubble:t.botBubble, color:m.role==="user"?t.userBubbleText:t.botBubbleText, fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap", boxShadow:`0 1px 4px ${t.shadow}` }}>{m.text}</div>}
                  {m.autoRecord && (
                    <div style={{ padding:"6px 12px", borderRadius:12, background:t.autoRecordBg, border:`1px solid ${t.autoRecordBorder}`, fontSize:12, color:t.primary, fontWeight:500 }}>
                      {m.autoRecord}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="fade-in" style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:t.primary, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🥗</div>
                <div style={{ background:t.botBubble, padding:"12px 16px", borderRadius:"16px 16px 16px 4px", boxShadow:`0 1px 4px ${t.shadow}` }}>
                  <span style={{ fontSize:20, letterSpacing:4, color:t.primary }}>···</span>
                </div>
              </div>
            )}
            {error && <div className="fade-in" style={{ textAlign:"center", color:t.danger, fontSize:13, padding:"8px 12px", background:t.dangerBg, borderRadius:8 }}>{error}</div>}
            <div ref={bottom} />
          </div>
          {preview && (
            <div style={{ padding:"8px 12px", background:t.card, borderTop:`1px solid ${t.border}`, display:"flex", alignItems:"center", gap:10 }}>
              <img src={preview.url} alt="" style={{ width:56, height:56, borderRadius:8, objectFit:"cover", border:`2px solid ${t.primary}` }} />
              <div style={{ flex:1, fontSize:13, color:t.primary, fontWeight:500 }}>사진 첨부됨 📸<br/><span style={{ color:t.textMuted, fontWeight:400 }}>전송하면 분석해드려요</span></div>
              <button onClick={()=>setPreview(null)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:t.textMuted }}>✕</button>
            </div>
          )}
          <div style={{ padding:"8px 12px", background:t.card, borderTop:`1px solid ${t.border}`, display:"flex", gap:6 }}>
            <button onClick={()=>addWater(500)} disabled={busy}
              style={{ padding:"6px 14px", borderRadius:16, border:`1px solid ${t.primary}`, background:"transparent", color:t.primary, fontSize:13, fontWeight:500, cursor:"pointer", whiteSpace:"nowrap", opacity:busy?0.5:1, transition:"all 0.2s" }}>
              💧 물 추가 500ml
            </button>
          </div>
          <div style={{ padding:"10px 12px 20px", background:t.card, borderTop:`1px solid ${t.border}`, display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={()=>fileRef.current.click()} disabled={busy} style={{ width:42, height:42, borderRadius:"50%", border:`1.5px solid ${t.primary}`, background:t.inputBg, fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, opacity:busy?0.5:1, transition:"all 0.2s" }}>📷</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])} />
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="질문하거나 📷 사진을 보내세요!" disabled={busy}
              style={{ flex:1, padding:"10px 14px", borderRadius:20, border:`1.5px solid ${t.primaryBorder}`, background:t.inputBg, fontSize:14, outline:"none", color:t.text, transition:"all 0.2s" }} />
            <button onClick={()=>send()} disabled={(!input.trim()&&!preview)||busy}
              style={{ width:42, height:42, borderRadius:"50%", border:"none", background:((!input.trim()&&!preview)||busy)?t.primaryLight:t.primary, color:((!input.trim()&&!preview)||busy)?t.primaryBorder:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>↑</button>
          </div>
        </>
      )}

      {/* ══ 기록 ══ */}
      {tab==="record" && (
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ flex:1, overflowY:"auto", padding:16, background:t.bg, display:"flex", flexDirection:"column", gap:14, transition:"background 0.3s" }}>

          {syncing ? (
            <>
              <SkeletonCard t={t} />
              <SkeletonCard t={t} />
              <SkeletonCard t={t} />
            </>
          ) : (
            <>
              {/* 동기부여 */}
              <div className="slide-up" style={{ background:`linear-gradient(135deg,${t.gradientStart},${t.gradientEnd})`, borderRadius:16, padding:"14px 16px", color:"#fff", fontSize:14, lineHeight:1.6 }}>
                {motivation}
              </div>

              {/* 오늘 목표 체크리스트 */}
              <div className="slide-up" style={card}>
                <div style={{ fontWeight:600, fontSize:15, color:t.primary, marginBottom:10 }}>✅ 오늘 목표 체크리스트</div>
                {DEFAULT_CHECKLIST.map((item, i) => (
                  <div key={i} onClick={() => toggleCheck(i)}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:10, marginBottom:6, background:checks[i]?t.primaryLight+"22":t.inputBg, border:"1px solid", borderColor:checks[i]?t.primary:t.border, cursor:"pointer", transition:"all 0.2s" }}>
                    <div style={{ width:22, height:22, borderRadius:"50%", background:checks[i]?t.primary:t.card, border:"2px solid", borderColor:checks[i]?t.primary:t.textFaint, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
                      {checks[i] && <span style={{ color:"#fff", fontSize:13, fontWeight:700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:14, color:checks[i]?t.primary:t.textSub, textDecoration:checks[i]?"line-through":"none", fontWeight:checks[i]?600:400, transition:"all 0.2s" }}>{item}</span>
                  </div>
                ))}
                <div style={{ fontSize:12, color:t.textMuted, textAlign:"center", marginTop:4 }}>
                  {checks.filter(Boolean).length} / {DEFAULT_CHECKLIST.length} 완료! {checks.every(Boolean) ? "🎉 완벽해요!" : ""}
                </div>
              </div>

              {/* 목표 체중 */}
              <div className="slide-up" style={card}>
                <div style={{ fontWeight:600, fontSize:15, color:t.primary, marginBottom:10 }}>🎯 목표 체중</div>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <input value={goalInput} onChange={e=>setGoalInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveGoal()} placeholder="목표 체중 (kg)" type="number" style={{ ...inputStyle, flex:1 }} />
                  {addBtn(saveGoal, "설정")}
                </div>
                {goalWeight && latestKg && (
                  <>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
                      <span style={{ color:t.textSub }}>현재 {latestKg}kg → 목표 {goalWeight}kg</span>
                      <span style={{ color:t.primary, fontWeight:700 }}>{progress}% 달성!</span>
                    </div>
                    <div style={{ background:t.barBg, borderRadius:8, height:12, overflow:"hidden" }}>
                      <div style={{ width:`${progress}%`, background:`linear-gradient(90deg,${t.primary},${t.primaryDark})`, height:"100%", borderRadius:8, transition:"width 0.4s" }} />
                    </div>
                    <div style={{ fontSize:12, color:t.textMuted, marginTop:4 }}>
                      {latestKg > goalWeight ? `${(latestKg - goalWeight).toFixed(1)}kg 더 빼면 목표 달성!` : "🎉 목표 달성!"}
                    </div>
                  </>
                )}
                {!goalWeight && <div style={{ fontSize:13, color:t.textFaint }}>목표 체중을 설정해보세요!</div>}
              </div>

              {/* 체중 */}
              <div className="slide-up" style={card}>
                <div style={{ fontWeight:600, fontSize:15, color:t.primary, marginBottom:10 }}>⚖️ 체중 기록</div>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <input value={wInput} onChange={e=>setWInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addWeight()} placeholder="오늘 체중 (kg)" type="number" style={{ ...inputStyle, flex:1 }} />
                  {addBtn(addWeight)}
                </div>
                {weightLog.slice(-5).reverse().map((w,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"5px 10px", background:t.tagBg, borderRadius:8, marginBottom:4 }}>
                    <span style={{ color:t.textSub }}>{w.date}</span>
                    <span style={{ fontWeight:600, color:t.primary }}>{w.kg} kg</span>
                  </div>
                ))}
                {weightLog.length===0 && <div style={{ fontSize:13, color:t.textFaint }}>아직 없어요</div>}
              </div>

              {/* 음식 + 칼로리 */}
              <div className="slide-up" style={card}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontWeight:600, fontSize:15, color:t.primary }}>🍽️ 오늘 먹은 것</div>
                  <div style={{ background:t.tagBg, border:`1.5px solid ${t.primary}`, borderRadius:12, padding:"3px 10px", fontSize:13, fontWeight:700, color:t.primary }}>
                    총 {totalCal} kcal
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, marginBottom:4 }}>
                  <div style={{ flex:2, position:"relative" }}>
                    <input value={fInput} onChange={e=>onFoodInputChange(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(addFood(),setFoodSuggestions([]))} placeholder="음식 이름" style={{ ...inputStyle, width:"100%" }} />
                    {foodSuggestions.length > 0 && (
                      <div style={{ position:"absolute", top:"100%", left:0, right:0, background:t.card, border:`1px solid ${t.border}`, borderRadius:12, marginTop:4, zIndex:10, boxShadow:`0 4px 12px ${t.shadow}`, overflow:"hidden" }}>
                        {foodSuggestions.map((s,i) => (
                          <div key={i} onClick={() => selectSuggestion(s)}
                            style={{ padding:"8px 12px", fontSize:13, color:t.text, cursor:"pointer", display:"flex", justifyContent:"space-between", borderBottom:i<foodSuggestions.length-1?`1px solid ${t.border}`:"none" }}
                            onMouseEnter={e=>e.target.style.background=t.tagBg} onMouseLeave={e=>e.target.style.background="transparent"}>
                            <span>{s.name}</span>
                            <span style={{ color:t.primary, fontWeight:600 }}>{s.cal}kcal</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input value={fCalInput} onChange={e=>setFCalInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(addFood(),setFoodSuggestions([]))} placeholder="kcal" type="number" style={{ ...inputStyle, flex:1 }} />
                  {addBtn(() => { addFood(); setFoodSuggestions([]); })}
                </div>
                {/* 즐겨찾기 */}
                {favorites.length > 0 && (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:11, color:t.textMuted, marginBottom:4 }}>⭐ 즐겨찾기</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {favorites.map((f,i) => (
                        <button key={i} onClick={() => addFood(f.name, f.cal)}
                          style={{ padding:"4px 10px", borderRadius:12, border:`1px solid ${t.primaryBorder}`, background:t.tagBg, fontSize:12, color:t.primary, cursor:"pointer", transition:"all 0.2s" }}>
                          {f.name} {f.cal}kcal
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {todayData.food.map((f,i) => {
                    const name = f.name||f;
                    const cal  = f.cal||0;
                    const isFav = favorites.some(fv => fv.name === name);
                    return (
                      <span key={i} className="fade-in" style={{ padding:"4px 10px", background:t.tagBg, borderRadius:12, fontSize:13, color:t.primary, border:`1px solid ${t.primaryBorder}`, display:"flex", alignItems:"center", gap:4 }}>
                        {name}{cal ? ` ${cal}kcal` : ""}
                        <button onClick={() => isFav ? removeFavorite(name) : addFavorite(name, cal)} style={{ border:"none", background:"none", cursor:"pointer", color:isFav?"#f59e0b":t.textFaint, fontSize:12, padding:0 }}>{isFav?"★":"☆"}</button>
                        <button onClick={()=>updateToday({ food:todayData.food.filter((_,j)=>j!==i) })} style={{ border:"none", background:"none", cursor:"pointer", color:t.textFaint, fontSize:11, padding:0 }}>✕</button>
                      </span>
                    );
                  })}
                  {todayData.food.length===0 && <span style={{ fontSize:13, color:t.textFaint }}>아직 없어요</span>}
                </div>
              </div>

              {/* 물 */}
              <div className="slide-up" style={card}>
                <div style={{ fontWeight:600, fontSize:15, color:t.primary, marginBottom:8 }}>💧 수분 <span style={{ fontWeight:700 }}>{todayData.water||0}ml</span></div>
                <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                  <input value={waterInput} onChange={e=>setWaterInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addWater()} placeholder="ml (기본 200ml)" type="number" style={{ ...inputStyle, flex:1 }} />
                  {addBtn(() => addWater())}
                </div>
                <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                  {[200,300,500].map(ml => (
                    <button key={ml} onClick={()=>addWater(ml)}
                      style={{ flex:1, padding:"7px 0", borderRadius:12, border:`1px solid ${t.primary}`, background:t.tagBg, color:t.primary, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}>+{ml}ml</button>
                  ))}
                </div>
                <div style={{ background:t.barBg, borderRadius:8, height:10, overflow:"hidden" }}>
                  <div style={{ width:`${Math.min(100,((todayData.water||0)/2000)*100)}%`, background:t.primary, height:"100%", borderRadius:8, transition:"width 0.3s" }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:4 }}>
                  <div style={{ fontSize:12, color:t.textMuted }}>목표 2000ml 중 {todayData.water||0}ml</div>
                  {(todayData.water||0) > 0 && (
                    <button onClick={()=>updateToday({ water:0 })}
                      style={{ fontSize:11, color:t.danger, background:"none", border:"none", cursor:"pointer", padding:"2px 6px" }}>초기화</button>
                  )}
                </div>
              </div>

              {/* 운동 */}
              <div className="slide-up" style={card}>
                <div style={{ fontWeight:600, fontSize:15, color:t.primary, marginBottom:10 }}>🏃 오늘 운동</div>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <input value={exInput} onChange={e=>setExInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addEx()} placeholder="예) 걷기 30분, 스쿼트 30개" style={{ ...inputStyle, flex:1 }} />
                  {addBtn(() => addEx())}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {todayData.exercise.map((ex,i) => (
                    <span key={i} className="fade-in" style={{ padding:"4px 10px", background:t.tagBg, borderRadius:12, fontSize:13, color:t.primary, border:`1px solid ${t.primaryBorder}` }}>
                      {ex}
                      <button onClick={()=>updateToday({ exercise:todayData.exercise.filter((_,j)=>j!==i) })} style={{ border:"none", background:"none", cursor:"pointer", color:t.textFaint, marginLeft:4, fontSize:11 }}>✕</button>
                    </span>
                  ))}
                  {todayData.exercise.length===0 && <span style={{ fontSize:13, color:t.textFaint }}>아직 없어요</span>}
                </div>
              </div>
              <div style={{ height:20 }} />
            </>
          )}
        </div>
      )}

      {/* ══ 캘린더 ══ */}
      {tab==="calendar" && (() => {
        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const weeks = [];
        let week = Array(firstDay).fill(null);
        for (let d = 1; d <= daysInMonth; d++) {
          week.push(d);
          if (week.length === 7) { weeks.push(week); week = []; }
        }
        if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

        const monthNames = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
        const prevMonth = () => { if (calMonth === 0) { setCalYear(calYear-1); setCalMonth(11); } else setCalMonth(calMonth-1); setSelectedDate(null); };
        const nextMonth = () => { if (calMonth === 11) { setCalYear(calYear+1); setCalMonth(0); } else setCalMonth(calMonth+1); setSelectedDate(null); };

        const selDS = selectedDate ? `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(selectedDate).padStart(2,"0")}` : null;
        const selData = selDS ? (dailyLog[selDS] || { food:[], water:0, exercise:[] }) : null;
        const selWeight = selDS ? weightLog.find(w => w.date === selDS) : null;
        const selCal = selData ? (selData.food||[]).reduce((s,f) => s+(f.cal||0), 0) : 0;

        return (
          <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ flex:1, overflowY:"auto", padding:16, background:t.bg, display:"flex", flexDirection:"column", gap:14 }}>
            <div className="slide-up" style={card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <button onClick={prevMonth} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:t.text }}>‹</button>
                <div style={{ fontWeight:700, fontSize:16, color:t.text }}>{calYear}년 {monthNames[calMonth]}</div>
                <button onClick={nextMonth} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:t.text }}>›</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
                {["일","월","화","수","목","금","토"].map(d => (
                  <div key={d} style={{ textAlign:"center", fontSize:11, color:t.textMuted, padding:4 }}>{d}</div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                  {week.map((day, di) => {
                    if (!day) return <div key={di} />;
                    const ds = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                    const dl = dailyLog[ds] || {};
                    const hasFood = (dl.food||[]).length > 0;
                    const hasEx = (dl.exercise||[]).length > 0;
                    const hasW = weightLog.some(w => w.date === ds);
                    const isToday = ds === todayStr();
                    const isSelected = day === selectedDate;
                    const hasSomething = hasFood || hasEx || hasW;
                    return (
                      <div key={di} onClick={() => setSelectedDate(day === selectedDate ? null : day)}
                        style={{ textAlign:"center", padding:"6px 2px", borderRadius:10, cursor:"pointer", position:"relative",
                          background: isSelected ? t.primary : isToday ? t.tagBg : "transparent",
                          color: isSelected ? "#fff" : isToday ? t.primary : t.text,
                          fontWeight: isToday || isSelected ? 700 : 400, fontSize:13, transition:"all 0.2s" }}>
                        {day}
                        {hasSomething && !isSelected && (
                          <div style={{ display:"flex", gap:1, justifyContent:"center", marginTop:2 }}>
                            {hasFood && <div style={{ width:4, height:4, borderRadius:"50%", background:"#f59e0b" }} />}
                            {hasEx && <div style={{ width:4, height:4, borderRadius:"50%", background:t.primary }} />}
                            {hasW && <div style={{ width:4, height:4, borderRadius:"50%", background:"#3b82f6" }} />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{ display:"flex", gap:12, justifyContent:"center", marginTop:8, fontSize:11, color:t.textMuted }}>
                <span><span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:"#f59e0b", marginRight:3 }}/>음식</span>
                <span><span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:t.primary, marginRight:3 }}/>운동</span>
                <span><span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:"#3b82f6", marginRight:3 }}/>체중</span>
              </div>
            </div>

            {selectedDate && selData && (
              <div className="fade-in" style={card}>
                <div style={{ fontWeight:600, fontSize:15, color:t.primary, marginBottom:10 }}>
                  📋 {calMonth+1}/{selectedDate} 기록
                </div>
                {selWeight && (
                  <div style={{ fontSize:13, color:t.text, marginBottom:6 }}>⚖️ 체중: <b>{selWeight.kg}kg</b></div>
                )}
                <div style={{ fontSize:13, color:t.text, marginBottom:6 }}>
                  🍽️ 음식: {selData.food.length > 0 ? selData.food.map(f => `${f.name||f}${f.cal?` ${f.cal}kcal`:""}`).join(", ") : "기록 없음"}
                  {selCal > 0 && <span style={{ color:t.primary, fontWeight:600 }}> (총 {selCal}kcal)</span>}
                </div>
                <div style={{ fontSize:13, color:t.text, marginBottom:6 }}>💧 수분: {selData.water||0}ml</div>
                <div style={{ fontSize:13, color:t.text }}>🏃 운동: {selData.exercise.length > 0 ? selData.exercise.join(", ") : "기록 없음"}</div>
              </div>
            )}
            <div style={{ height:20 }} />
          </div>
        );
      })()}

      {/* ══ 통계 ══ */}
      {tab==="stats" && (
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ flex:1, overflowY:"auto", padding:16, background:t.bg, display:"flex", flexDirection:"column", gap:14, transition:"background 0.3s" }}>

          {syncing ? (
            <>
              <SkeletonCard t={t} />
              <SkeletonCard t={t} />
              <SkeletonCard t={t} />
            </>
          ) : (
            <>
              {/* 목표 달성률 */}
              {goalWeight && latestKg && (
                <div className="slide-up" style={{ ...card, background:`linear-gradient(135deg,${t.gradientStart},${t.gradientEnd})`, color:"#fff" }}>
                  <div style={{ fontWeight:600, fontSize:15, marginBottom:12 }}>🎯 목표 달성률</div>
                  <div style={{ display:"flex", justifyContent:"space-around", marginBottom:12 }}>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:11, opacity:0.8 }}>시작</div>
                      <div style={{ fontSize:22, fontWeight:700 }}>{startKg}kg</div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:11, opacity:0.8 }}>현재</div>
                      <div style={{ fontSize:22, fontWeight:700 }}>{latestKg}kg</div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:11, opacity:0.8 }}>목표</div>
                      <div style={{ fontSize:22, fontWeight:700 }}>{goalWeight}kg</div>
                    </div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.3)", borderRadius:8, height:14, overflow:"hidden" }}>
                    <div style={{ width:`${progress}%`, background:"#fff", height:"100%", borderRadius:8, transition:"width 0.4s" }} />
                  </div>
                  <div style={{ textAlign:"center", marginTop:6, fontSize:14, fontWeight:600 }}>{progress}% 달성!</div>
                </div>
              )}

              {/* BMI 계산기 */}
              <div className="slide-up" style={card}>
                <div style={{ fontWeight:600, fontSize:15, color:t.primary, marginBottom:10 }}>📏 BMI 계산기</div>
                <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                  <input value={heightInput} onChange={e=>setHeightInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveHeight()} placeholder="키 입력 (cm)" type="number"
                    style={{ flex:1, ...inputStyle }} />
                  <button onClick={saveHeight} style={{ padding:"9px 16px", borderRadius:20, border:"none", background:t.primary, color:"#fff", fontSize:13, fontWeight:500, cursor:"pointer" }}>저장</button>
                </div>
                {height && latestKg ? (() => {
                  const bmi = latestKg / ((height/100) ** 2);
                  const bmiRound = Math.round(bmi * 10) / 10;
                  const grade = bmi < 18.5 ? {label:"저체중", color:t.bmiLow} : bmi < 23 ? {label:"정상", color:t.bmiNormal} : bmi < 25 ? {label:"과체중", color:t.bmiOver} : {label:"비만", color:t.bmiObese};
                  const pct = Math.min(100, Math.max(0, ((bmi - 15) / (35 - 15)) * 100));
                  return (
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <span style={{ fontSize:13, color:t.textSub }}>키 {height}cm · 체중 {latestKg}kg</span>
                        <span style={{ padding:"3px 10px", borderRadius:12, background:grade.color+"22", color:grade.color, fontSize:13, fontWeight:700 }}>{grade.label}</span>
                      </div>
                      <div style={{ textAlign:"center", marginBottom:10 }}>
                        <span style={{ fontSize:32, fontWeight:700, color:grade.color }}>{bmiRound}</span>
                        <span style={{ fontSize:13, color:t.textMuted, marginLeft:4 }}>BMI</span>
                      </div>
                      <div style={{ position:"relative", background:`linear-gradient(90deg,${t.bmiLow},${t.bmiNormal},${t.bmiOver},${t.bmiObese})`, borderRadius:8, height:10, marginBottom:4 }}>
                        <div style={{ position:"absolute", top:-3, left:`${pct}%`, width:16, height:16, borderRadius:"50%", background:t.card, border:"3px solid "+t.text, transform:"translateX(-50%)", transition:"left 0.3s" }} />
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:t.textFaint }}>
                        <span>저체중</span><span>정상</span><span>과체중</span><span>비만</span>
                      </div>
                    </div>
                  );
                })() : <div style={{ fontSize:13, color:t.textFaint, textAlign:"center", padding:8 }}>키를 입력하고 체중을 기록하면 BMI가 나와요!</div>}
              </div>

              {/* 운동 루틴 추천 */}
              <div className="slide-up" style={card}>
                <div style={{ fontWeight:600, fontSize:15, color:t.primary, marginBottom:10 }}>💪 오늘 운동 루틴 추천</div>
                <button onClick={getRoutine} disabled={routineBusy}
                  style={{ width:"100%", padding:"12px", borderRadius:12, border:"none", background:routineBusy?t.primaryLight:t.primary, color:routineBusy?t.primaryBorder:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", marginBottom: routineResult?12:0, transition:"all 0.2s" }}>
                  {routineBusy ? "루틴 짜는 중... 🥗" : "🏋️ 나에게 맞는 루틴 짜줘"}
                </button>
                {routineResult && <div className="fade-in" style={{ fontSize:13, lineHeight:1.8, whiteSpace:"pre-wrap", color:t.text }}>{routineResult}</div>}
              </div>

              {/* 체중 그래프 */}
              <div className="slide-up" style={card}>
                <div style={{ fontWeight:600, fontSize:15, color:t.primary, marginBottom:10 }}>📈 체중 변화</div>
                <WeightGraph weightLog={weightLog} t={t} />
              </div>

              {/* 이번주 칼로리 */}
              <div className="slide-up" style={card}>
                <div style={{ fontWeight:600, fontSize:15, color:t.primary, marginBottom:10 }}>🔥 이번주 칼로리</div>
                {Array.from({length:7}).map((_,i) => {
                  const d = new Date(); d.setDate(d.getDate()-(6-i));
                  const ds = d.toISOString().slice(0,10);
                  const dl = dailyLog[ds]||{};
                  const cal = (dl.food||[]).reduce((s,f)=>s+(f.cal||0),0);
                  const pct = Math.min(100, (cal/2000)*100);
                  const label = ["일","월","화","수","목","금","토"][d.getDay()];
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <div style={{ width:20, fontSize:12, color:t.textMuted, textAlign:"center" }}>{label}</div>
                      <div style={{ flex:1, background:t.barBg, borderRadius:6, height:10, overflow:"hidden" }}>
                        <div style={{ width:`${pct}%`, background:cal>2000?t.calOver:t.primary, height:"100%", borderRadius:6, transition:"width 0.3s" }} />
                      </div>
                      <div style={{ fontSize:12, color:cal>2000?t.calOver:t.textSub, width:60, textAlign:"right" }}>{cal>0?`${cal}kcal`:"-"}</div>
                    </div>
                  );
                })}
              </div>

              {/* 이번주 운동 현황 */}
              <div className="slide-up" style={card}>
                <div style={{ fontWeight:600, fontSize:15, color:t.primary, marginBottom:10 }}>🏃 이번주 운동 현황</div>
                <div style={{ display:"flex", gap:6, justifyContent:"space-between" }}>
                  {Array.from({length:7}).map((_,i) => {
                    const d = new Date(); d.setDate(d.getDate()-(6-i));
                    const ds = d.toISOString().slice(0,10);
                    const dl = dailyLog[ds]||{};
                    const did = (dl.exercise||[]).length > 0;
                    const label = ["일","월","화","수","목","금","토"][d.getDay()];
                    return (
                      <div key={i} style={{ flex:1, textAlign:"center" }}>
                        <div style={{ width:"100%", aspectRatio:"1", borderRadius:8, background:did?t.primary:t.barBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, marginBottom:4, color:"#fff", transition:"all 0.2s" }}>
                          {did?"✓":""}
                        </div>
                        <div style={{ fontSize:11, color:t.textMuted }}>{label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ height:20 }} />
            </>
          )}
        </div>
      )}

      {/* ══ 주간 리포트 ══ */}
      {tab==="weekly" && (
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ flex:1, overflowY:"auto", padding:16, background:t.bg, display:"flex", flexDirection:"column", gap:14, transition:"background 0.3s" }}>
          <div className="slide-up" style={card}>
            <div style={{ fontWeight:600, fontSize:15, color:t.primary, marginBottom:6 }}>📊 지난 7일 요약</div>
            {Array.from({length:7}).map((_,i) => {
              const d = new Date(); d.setDate(d.getDate()-(6-i));
              const ds = d.toISOString().slice(0,10);
              const w  = weightLog.find(x=>x.date===ds);
              const dl = dailyLog[ds]||{};
              const cal = (dl.food||[]).reduce((s,f)=>s+(f.cal||0),0);
              return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"5px 8px", background:t.tagBg, borderRadius:8, marginBottom:4 }}>
                  <span style={{ color:t.textSub }}>{ds.slice(5)}</span>
                  <span style={{ color:t.text }}>{w?`${w.kg}kg`:"-"}</span>
                  <span style={{ color:t.text }}>{cal>0?`${cal}kcal`:"-"}</span>
                  <span style={{ color:t.text }}>{dl.water?`${dl.water}ml`:"-"}</span>
                  <span>{(dl.exercise||[]).length>0?"🏃":"-"}</span>
                </div>
              );
            })}
          </div>
          <button onClick={getWeekly} disabled={weeklyBusy}
            style={{ padding:"14px", borderRadius:16, border:"none", background:weeklyBusy?t.primaryLight:t.primary, color:weeklyBusy?t.primaryBorder:"#fff", fontSize:15, fontWeight:600, cursor:"pointer", transition:"all 0.2s" }}>
            {weeklyBusy?"분석 중... 🥗":"📊 AI 주간 리포트 받기"}
          </button>
          {weeklyResult && (
            <div className="fade-in" style={{ ...card, fontSize:14, lineHeight:1.8, whiteSpace:"pre-wrap", color:t.text }}>
              {weeklyResult}
            </div>
          )}
          <div style={{ height:20 }} />
        </div>
      )}
    </div>
  );
}
