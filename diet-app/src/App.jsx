import { useState, useRef, useEffect } from "react";

const SUPA_URL = "https://ncglsgerqoawmrwbfkpo.supabase.co";
const SUPA_KEY = "sb_publishable_7d0XbBC2nIgCC22JCsGOuw_8_V9xhgT";
const USER_ID = "dongchul"; // 본인 전용 앱이므로 고정

async function sbGet(table, filters="") {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${filters}&user_id=eq.${USER_ID}`, {
    headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
  });
  return res.ok ? res.json() : [];
}

async function sbUpsert(table, data) {
  await fetch(`${SUPA_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates"
    },
    body: JSON.stringify({ ...data, user_id: USER_ID })
  });
}

const SYSTEM = `당신은 친절한 다이어트 선생님 "다이어트 쌤"입니다.
식습관, 운동, 체중 관리에 대해 따뜻하고 실용적인 조언을 해주세요.
- 음식 사진이 오면: 칼로리 추정, 다이어트 적합도, 조언
- 체형 분석 요청이 오면: 아래 형식으로 분석해주세요:
  1. 체형 타입 (사과형/서양배형/역삼각형/직사각형 등)
  2. 집중 관리 부위
  3. 추천 운동 루틴 (부위별 3~5가지, 세트/횟수 포함)
  4. 식단 조언
  ⚠️ 사진으로 정확한 수치 측정은 불가하므로, 수치 대신 시각적 인상과 체형 특징으로 조언
- 짧고 명확하게, 이모지 적절히 사용
- 현실적인 한국 식문화 반영
- 항상 응원하는 톤`;

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
function load(key, fb) { try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; } }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

// Supabase 동기화
async function syncFromSupabase(setWeightLog, setDailyLog, setGoalWeight, setHeight) {
  try {
    const weights = await sbGet("weight_log", "order=date.asc");
    if (weights.length > 0) {
      const wLog = weights.map(w => ({ date: w.date, kg: w.kg }));
      setWeightLog(wLog); save("wLog", wLog);
    }
    const days = await sbGet("daily_log", "");
    if (days.length > 0) {
      const dLog = {};
      days.forEach(d => { dLog[d.date] = { food: d.food||[], water: d.water||0, exercise: d.exercise||[] }; });
      setDailyLog(dLog); save("dLog", dLog);
    }
    const settings = await sbGet("user_settings", "");
    if (settings.length > 0) {
      if (settings[0].goal_weight) { setGoalWeight(settings[0].goal_weight); save("goal", settings[0].goal_weight); }
      if (settings[0].height) { setHeight(settings[0].height); save("height", settings[0].height); }
    }
  } catch(e) { console.log("Supabase sync error:", e); }
}

// ── 탭바 ──
function TabBar({ tab, setTab }) {
  const tabs = [
    { id:"chat",   label:"💬 채팅" },
    { id:"record", label:"📝 기록" },
    { id:"stats",  label:"📈 통계" },
    { id:"weekly", label:"🏆 리포트" },
  ];
  return (
    <div style={{ display:"flex", background:"#fff", borderBottom:"1px solid #e5f5e5", flexShrink:0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)}
          style={{ flex:1, padding:"9px 2px", border:"none", background:"none", fontSize:12, fontWeight:500,
            color:tab===t.id?"#16a34a":"#888",
            borderBottom:tab===t.id?"2.5px solid #16a34a":"2.5px solid transparent",
            cursor:"pointer" }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── 체중 그래프 (SVG) ──
function WeightGraph({ weightLog }) {
  if (weightLog.length < 2) return (
    <div style={{ textAlign:"center", color:"#aaa", fontSize:13, padding:20 }}>
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
      <polyline fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" points={points} />
      {recent.map((w, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(w.kg)} r="4" fill="#16a34a" />
          <text x={x(i)} y={y(w.kg) - 8} textAnchor="middle" fontSize="10" fill="#16a34a" fontWeight="600">{w.kg}</text>
        </g>
      ))}
      <text x={pad} y={H - 2} fontSize="9" fill="#aaa">{recent[0]?.date?.slice(5)}</text>
      <text x={W - pad} y={H - 2} textAnchor="end" fontSize="9" fill="#aaa">{recent[recent.length-1]?.date?.slice(5)}</text>
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState("chat");
  const motivation = MOTIVATION[new Date().getDay() % MOTIVATION.length];

  // ── 채팅 ──
  const [msgs, setMsgs] = useState([
    { role:"assistant", text:"안녕하세요! 저는 다이어트 쌤이에요 🥗\n식단·운동·체중 뭐든 물어보세요!\n📸 음식 사진 보내면 칼로리 분석도 해드려요!" }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const bottom = useRef(null);
  const fileRef = useRef(null);
  const history = useRef([]);

  // ── 기록 ──
  const [weightLog, setWeightLog] = useState(() => load("wLog", []));
  const [dailyLog,  setDailyLog]  = useState(() => load("dLog", {}));
  const [goalWeight, setGoalWeight] = useState(() => load("goal", null));
  const [wInput, setWInput] = useState("");
  const [fInput, setFInput] = useState("");
  const [fCalInput, setFCalInput] = useState("");
  const [waterInput, setWaterInput] = useState("");
  const [exInput, setExInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [height, setHeight] = useState(() => load("height", null));
  const [routineResult, setRoutineResult] = useState("");
  const [routineBusy, setRoutineBusy] = useState(false);

  const DEFAULT_CHECKLIST = ["체중 기록하기 ⚖️","물 2000ml 마시기 💧","운동하기 🏃","야식 안 먹기 🌙","채소 먹기 🥦"];
  const [checks, setChecks] = useState(() => load("checks_"+new Date().toISOString().slice(0,10), DEFAULT_CHECKLIST.map(()=>false)));

  function saveHeight() {
    const h = parseFloat(heightInput);
    if (!h || h < 100 || h > 250) return;
    setHeight(h); save("height", h); setHeightInput("");
    sbUpsert("user_settings", { goal_weight: goalWeight||null, height: h });
  }

  function toggleCheck(i) {
    const updated = checks.map((c,j) => j===i ? !c : c);
    setChecks(updated);
    save("checks_"+new Date().toISOString().slice(0,10), updated);
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
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:800, system:SYSTEM, messages:[{role:"user",content:prompt}] }),
      });
      const data = await res.json();
      setRoutineResult(data.content?.[0]?.text || "오류 발생");
    } catch(e) { setRoutineResult("오류: "+e.message); }
    setRoutineBusy(false);
  }

  // ── 주간 리포트 ──
  const [weeklyResult, setWeeklyResult] = useState("");
  const [weeklyBusy, setWeeklyBusy] = useState(false);

  // 앱 시작 시 Supabase에서 데이터 불러오기
  useEffect(() => {
    syncFromSupabase(setWeightLog, setDailyLog, setGoalWeight, setHeight);
  }, []);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const td = todayStr();
  const todayData = dailyLog[td] || { food:[], water:0, exercise:[] };
  const totalCal = (todayData.food || []).reduce((sum, f) => sum + (f.cal || 0), 0);

  function updateToday(patch) {
    const newData = { ...todayData, ...patch };
    const updated = { ...dailyLog, [td]: newData };
    setDailyLog(updated); save("dLog", updated);
    sbUpsert("daily_log", { date: td, food: newData.food||[], water: newData.water||0, exercise: newData.exercise||[] });
  }

  function addWeight() {
    const kg = parseFloat(wInput);
    if (!kg || kg < 20 || kg > 300) return;
    const updated = [...weightLog.filter(w => w.date !== td), { date:td, kg }].sort((a,b)=>a.date.localeCompare(b.date));
    setWeightLog(updated); save("wLog", updated); setWInput("");
    sbUpsert("weight_log", { date: td, kg });
  }

  function saveGoal() {
    const kg = parseFloat(goalInput);
    if (!kg || kg < 20 || kg > 300) return;
    setGoalWeight(kg); save("goal", kg); setGoalInput("");
    sbUpsert("user_settings", { goal_weight: kg, height: height||null });
  }

  function addFood() {
    if (!fInput.trim()) return;
    const cal = parseInt(fCalInput) || 0;
    updateToday({ food:[...todayData.food, { name:fInput.trim(), cal }] });
    setFInput(""); setFCalInput("");
  }

  function addWater() { const ml = parseInt(waterInput)||200; updateToday({ water:(todayData.water||0)+ml }); setWaterInput(""); }
  function addEx()    { if (!exInput.trim()) return; updateToday({ exercise:[...todayData.exercise, exInput.trim()] }); setExInput(""); }

  // 목표 달성률
  const latestKg = weightLog.length > 0 ? weightLog[weightLog.length-1].kg : null;
  const startKg  = weightLog.length > 0 ? weightLog[0].kg : null;
  let progress = null;
  if (goalWeight && startKg && latestKg && startKg !== goalWeight) {
    const pct = Math.min(100, Math.max(0, ((startKg - latestKg) / (startKg - goalWeight)) * 100));
    progress = Math.round(pct);
  }

  // ── 파일 ──
  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPreview({ base64:reader.result.split(",")[1], mediaType:file.type, url:reader.result });
    reader.readAsDataURL(file);
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
    setPreview(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:800, system:SYSTEM + `\n\n[사용자 현황]\n목표 체중: ${goalWeight ? goalWeight+"kg" : "미설정"}\n현재 체중: ${latestKg ? latestKg+"kg" : "미기록"}\n오늘 먹은 것: ${todayData.food.map(f=>f.name||(f+"")).join(", ")||"없음"}\n오늘 칼로리: ${totalCal}kcal\n오늘 수분: ${todayData.water||0}ml\n오늘 운동: ${todayData.exercise.join(", ")||"없음"}\n목표 달성률: ${progress!==null?progress+"%":"계산불가"}\n\n이 정보를 바탕으로 맞춤 조언을 해주세요.`, messages:history.current }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e?.error?.message||`HTTP ${res.status}`); }
      const data = await res.json();
      const reply = data.content?.[0]?.text;
      if (!reply) throw new Error("응답 없음");
      history.current.push({ role:"assistant", content:reply });
      setMsgs(prev => [...prev, { role:"assistant", text:reply }]);
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
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000, system:SYSTEM, messages:[{ role:"user", content:prompt }] }),
      });
      const data = await res.json();
      setWeeklyResult(data.content?.[0]?.text || "오류 발생");
    } catch(e) { setWeeklyResult("오류: "+e.message); }
    setWeeklyBusy(false);
  }

  const inputStyle = { padding:"9px 12px", borderRadius:20, border:"1.5px solid #bbf7d0", background:"#f0fdf4", fontSize:13, outline:"none", color:"#111" };
  const addBtn = (onClick, label="추가") => (
    <button onClick={onClick} style={{ padding:"9px 16px", borderRadius:20, border:"none", background:"#16a34a", color:"#fff", fontSize:13, fontWeight:500, cursor:"pointer", flexShrink:0 }}>{label}</button>
  );
  const card = { background:"#fff", borderRadius:16, padding:16, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", marginBottom:0 };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", maxWidth:480, margin:"0 auto", fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>

      {/* 헤더 */}
      <div style={{ background:"#16a34a", padding:"12px 18px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🥗</div>
          <div style={{ flex:1 }}>
            <div style={{ color:"#fff", fontWeight:600, fontSize:16 }}>다이어트 쌤</div>
            <div style={{ color:"#bbf7d0", fontSize:11 }}>{busy||weeklyBusy?"분석 중...":"온라인 · 사진 분석 가능"}</div>
          </div>
          {/* 목표 달성률 배지 */}
          {progress !== null && (
            <div style={{ background:"rgba(255,255,255,0.2)", borderRadius:12, padding:"4px 10px", textAlign:"center" }}>
              <div style={{ color:"#fff", fontSize:11 }}>목표 달성</div>
              <div style={{ color:"#fff", fontWeight:700, fontSize:16 }}>{progress}%</div>
            </div>
          )}
        </div>
        {/* 동기부여 메시지 */}
        <div style={{ marginTop:8, background:"rgba(255,255,255,0.15)", borderRadius:10, padding:"6px 12px", fontSize:12, color:"#f0fdf4" }}>
          {motivation}
        </div>
      </div>

      <TabBar tab={tab} setTab={setTab} />

      {/* ══ 채팅 ══ */}
      {tab==="chat" && (
        <>
          <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:10, background:"#f0fdf4" }}>
            {msgs.map((m,i) => (
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", alignItems:"flex-end", gap:8 }}>
                {m.role==="assistant" && <div style={{ width:28, height:28, borderRadius:"50%", background:"#16a34a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>🥗</div>}
                <div style={{ maxWidth:"75%", display:"flex", flexDirection:"column", gap:6, alignItems:m.role==="user"?"flex-end":"flex-start" }}>
                  {m.imageUrl && <img src={m.imageUrl} alt="" style={{ maxWidth:200, maxHeight:200, borderRadius:12, objectFit:"cover", border:"2px solid #16a34a" }} />}
                  {m.text && <div style={{ padding:"10px 14px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", background:m.role==="user"?"#16a34a":"#fff", color:m.role==="user"?"#fff":"#111", fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>{m.text}</div>}
                </div>
              </div>
            ))}
            {busy && (
              <div style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:"#16a34a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🥗</div>
                <div style={{ background:"#fff", padding:"12px 16px", borderRadius:"16px 16px 16px 4px", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
                  <span style={{ fontSize:20, letterSpacing:4, color:"#16a34a" }}>···</span>
                </div>
              </div>
            )}
            {error && <div style={{ textAlign:"center", color:"#dc2626", fontSize:13, padding:"8px 12px", background:"#fef2f2", borderRadius:8 }}>{error}</div>}
            <div ref={bottom} />
          </div>
          {preview && (
            <div style={{ padding:"8px 12px", background:"#fff", borderTop:"1px solid #e5f5e5", display:"flex", alignItems:"center", gap:10 }}>
              <img src={preview.url} alt="" style={{ width:56, height:56, borderRadius:8, objectFit:"cover", border:"2px solid #16a34a" }} />
              <div style={{ flex:1, fontSize:13, color:"#16a34a", fontWeight:500 }}>사진 첨부됨 📸<br/><span style={{ color:"#888", fontWeight:400 }}>전송하면 분석해드려요</span></div>
              <button onClick={()=>setPreview(null)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#888" }}>✕</button>
            </div>
          )}
          <div style={{ padding:"8px 12px", background:"#fff", borderTop:"1px solid #e5f5e5", display:"flex", gap:6, overflowX:"auto" }}>
            {QUICK.map((q,i) => (
              <button key={i} onClick={()=>send(q.replace(/^.{2}/,"").trim())} disabled={busy}
                style={{ flexShrink:0, padding:"6px 12px", borderRadius:16, border:"1px solid #16a34a", background:"transparent", color:"#16a34a", fontSize:12, fontWeight:500, cursor:"pointer", whiteSpace:"nowrap", opacity:busy?0.5:1 }}>
                {q}
              </button>
            ))}
          </div>
          <div style={{ padding:"10px 12px 20px", background:"#fff", borderTop:"1px solid #e5f5e5", display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={()=>fileRef.current.click()} disabled={busy} style={{ width:42, height:42, borderRadius:"50%", border:"1.5px solid #16a34a", background:"#f0fdf4", fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, opacity:busy?0.5:1 }}>📷</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])} />
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="질문하거나 📷 사진을 보내세요!" disabled={busy}
              style={{ flex:1, padding:"10px 14px", borderRadius:20, border:"1.5px solid #bbf7d0", background:"#f0fdf4", fontSize:14, outline:"none", color:"#111" }} />
            <button onClick={()=>send()} disabled={(!input.trim()&&!preview)||busy}
              style={{ width:42, height:42, borderRadius:"50%", border:"none", background:((!input.trim()&&!preview)||busy)?"#dcfce7":"#16a34a", color:((!input.trim()&&!preview)||busy)?"#6ee7b7":"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>↑</button>
          </div>
        </>
      )}

      {/* ══ 기록 ══ */}
      {tab==="record" && (
        <div style={{ flex:1, overflowY:"auto", padding:16, background:"#f0fdf4", display:"flex", flexDirection:"column", gap:14 }}>

          {/* 동기부여 */}
          <div style={{ background:"linear-gradient(135deg,#16a34a,#15803d)", borderRadius:16, padding:"14px 16px", color:"#fff", fontSize:14, lineHeight:1.6 }}>
            {motivation}
          </div>

          {/* 오늘 목표 체크리스트 */}
          <div style={card}>
            <div style={{ fontWeight:600, fontSize:15, color:"#16a34a", marginBottom:10 }}>✅ 오늘 목표 체크리스트</div>
            {DEFAULT_CHECKLIST.map((item, i) => (
              <div key={i} onClick={() => toggleCheck(i)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:10, marginBottom:6, background:checks[i]?"#f0fdf4":"#fafafa", border:"1px solid", borderColor:checks[i]?"#16a34a":"#e5e7eb", cursor:"pointer" }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:checks[i]?"#16a34a":"#fff", border:"2px solid", borderColor:checks[i]?"#16a34a":"#d1d5db", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {checks[i] && <span style={{ color:"#fff", fontSize:13, fontWeight:700 }}>✓</span>}
                </div>
                <span style={{ fontSize:14, color:checks[i]?"#16a34a":"#555", textDecoration:checks[i]?"line-through":"none", fontWeight:checks[i]?600:400 }}>{item}</span>
              </div>
            ))}
            <div style={{ fontSize:12, color:"#888", textAlign:"center", marginTop:4 }}>
              {checks.filter(Boolean).length} / {DEFAULT_CHECKLIST.length} 완료! {checks.every(Boolean) ? "🎉 완벽해요!" : ""}
            </div>
          </div>

          {/* 목표 체중 */}
          <div style={card}>
            <div style={{ fontWeight:600, fontSize:15, color:"#16a34a", marginBottom:10 }}>🎯 목표 체중</div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input value={goalInput} onChange={e=>setGoalInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveGoal()} placeholder="목표 체중 (kg)" type="number" style={{ ...inputStyle, flex:1 }} />
              {addBtn(saveGoal, "설정")}
            </div>
            {goalWeight && latestKg && (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
                  <span style={{ color:"#555" }}>현재 {latestKg}kg → 목표 {goalWeight}kg</span>
                  <span style={{ color:"#16a34a", fontWeight:700 }}>{progress}% 달성!</span>
                </div>
                <div style={{ background:"#e5f5e5", borderRadius:8, height:12, overflow:"hidden" }}>
                  <div style={{ width:`${progress}%`, background:"linear-gradient(90deg,#16a34a,#22c55e)", height:"100%", borderRadius:8, transition:"width 0.4s" }} />
                </div>
                <div style={{ fontSize:12, color:"#888", marginTop:4 }}>
                  {latestKg > goalWeight ? `${(latestKg - goalWeight).toFixed(1)}kg 더 빼면 목표 달성!` : "🎉 목표 달성!"}
                </div>
              </>
            )}
            {!goalWeight && <div style={{ fontSize:13, color:"#aaa" }}>목표 체중을 설정해보세요!</div>}
          </div>

          {/* 체중 */}
          <div style={card}>
            <div style={{ fontWeight:600, fontSize:15, color:"#16a34a", marginBottom:10 }}>⚖️ 체중 기록</div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input value={wInput} onChange={e=>setWInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addWeight()} placeholder="오늘 체중 (kg)" type="number" style={{ ...inputStyle, flex:1 }} />
              {addBtn(addWeight)}
            </div>
            {weightLog.slice(-5).reverse().map((w,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"5px 10px", background:"#f0fdf4", borderRadius:8, marginBottom:4 }}>
                <span style={{ color:"#555" }}>{w.date}</span>
                <span style={{ fontWeight:600, color:"#16a34a" }}>{w.kg} kg</span>
              </div>
            ))}
            {weightLog.length===0 && <div style={{ fontSize:13, color:"#aaa" }}>아직 없어요</div>}
          </div>

          {/* 음식 + 칼로리 */}
          <div style={card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontWeight:600, fontSize:15, color:"#16a34a" }}>🍽️ 오늘 먹은 것</div>
              <div style={{ background:"#f0fdf4", border:"1.5px solid #16a34a", borderRadius:12, padding:"3px 10px", fontSize:13, fontWeight:700, color:"#16a34a" }}>
                총 {totalCal} kcal
              </div>
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:8 }}>
              <input value={fInput} onChange={e=>setFInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addFood()} placeholder="음식 이름" style={{ ...inputStyle, flex:2 }} />
              <input value={fCalInput} onChange={e=>setFCalInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addFood()} placeholder="kcal" type="number" style={{ ...inputStyle, flex:1 }} />
              {addBtn(addFood)}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {todayData.food.map((f,i) => {
                const name = f.name||f;
                const cal  = f.cal||0;
                return (
                  <span key={i} style={{ padding:"4px 10px", background:"#f0fdf4", borderRadius:12, fontSize:13, color:"#16a34a", border:"1px solid #bbf7d0" }}>
                    {name}{cal ? ` ${cal}kcal` : ""}
                    <button onClick={()=>updateToday({ food:todayData.food.filter((_,j)=>j!==i) })} style={{ border:"none", background:"none", cursor:"pointer", color:"#aaa", marginLeft:4, fontSize:11 }}>✕</button>
                  </span>
                );
              })}
              {todayData.food.length===0 && <span style={{ fontSize:13, color:"#aaa" }}>아직 없어요</span>}
            </div>
          </div>

          {/* 물 */}
          <div style={card}>
            <div style={{ fontWeight:600, fontSize:15, color:"#16a34a", marginBottom:8 }}>💧 수분 <span style={{ fontWeight:700 }}>{todayData.water||0}ml</span></div>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <input value={waterInput} onChange={e=>setWaterInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addWater()} placeholder="ml (기본 200ml)" type="number" style={{ ...inputStyle, flex:1 }} />
              {addBtn(addWater)}
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:8 }}>
              {[200,300,500].map(ml => (
                <button key={ml} onClick={()=>updateToday({ water:(todayData.water||0)+ml })}
                  style={{ flex:1, padding:"7px 0", borderRadius:12, border:"1px solid #16a34a", background:"#f0fdf4", color:"#16a34a", fontSize:13, cursor:"pointer" }}>+{ml}ml</button>
              ))}
            </div>
            <div style={{ background:"#e5f5e5", borderRadius:8, height:10, overflow:"hidden" }}>
              <div style={{ width:`${Math.min(100,((todayData.water||0)/2000)*100)}%`, background:"#16a34a", height:"100%", borderRadius:8, transition:"width 0.3s" }} />
            </div>
            <div style={{ fontSize:12, color:"#888", marginTop:4 }}>목표 2000ml 중 {todayData.water||0}ml</div>
          </div>

          {/* 운동 */}
          <div style={card}>
            <div style={{ fontWeight:600, fontSize:15, color:"#16a34a", marginBottom:10 }}>🏃 오늘 운동</div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input value={exInput} onChange={e=>setExInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addEx()} placeholder="예) 걷기 30분, 스쿼트 30개" style={{ ...inputStyle, flex:1 }} />
              {addBtn(addEx)}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {todayData.exercise.map((ex,i) => (
                <span key={i} style={{ padding:"4px 10px", background:"#f0fdf4", borderRadius:12, fontSize:13, color:"#16a34a", border:"1px solid #bbf7d0" }}>
                  {ex}
                  <button onClick={()=>updateToday({ exercise:todayData.exercise.filter((_,j)=>j!==i) })} style={{ border:"none", background:"none", cursor:"pointer", color:"#aaa", marginLeft:4, fontSize:11 }}>✕</button>
                </span>
              ))}
              {todayData.exercise.length===0 && <span style={{ fontSize:13, color:"#aaa" }}>아직 없어요</span>}
            </div>
          </div>
          <div style={{ height:20 }} />
        </div>
      )}

      {/* ══ 통계 ══ */}
      {tab==="stats" && (
        <div style={{ flex:1, overflowY:"auto", padding:16, background:"#f0fdf4", display:"flex", flexDirection:"column", gap:14 }}>

          {/* 목표 달성률 */}
          {goalWeight && latestKg && (
            <div style={{ ...card, background:"linear-gradient(135deg,#16a34a,#15803d)", color:"#fff" }}>
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
          <div style={card}>
            <div style={{ fontWeight:600, fontSize:15, color:"#16a34a", marginBottom:10 }}>📏 BMI 계산기</div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <input value={heightInput} onChange={e=>setHeightInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveHeight()} placeholder="키 입력 (cm)" type="number"
                style={{ flex:1, padding:"9px 12px", borderRadius:20, border:"1.5px solid #bbf7d0", background:"#f0fdf4", fontSize:13, outline:"none", color:"#111" }} />
              <button onClick={saveHeight} style={{ padding:"9px 16px", borderRadius:20, border:"none", background:"#16a34a", color:"#fff", fontSize:13, fontWeight:500, cursor:"pointer" }}>저장</button>
            </div>
            {height && latestKg ? (() => {
              const bmi = latestKg / ((height/100) ** 2);
              const bmiRound = Math.round(bmi * 10) / 10;
              const grade = bmi < 18.5 ? {label:"저체중", color:"#3b82f6"} : bmi < 23 ? {label:"정상", color:"#16a34a"} : bmi < 25 ? {label:"과체중", color:"#f59e0b"} : {label:"비만", color:"#ef4444"};
              const pct = Math.min(100, Math.max(0, ((bmi - 15) / (35 - 15)) * 100));
              return (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontSize:13, color:"#555" }}>키 {height}cm · 체중 {latestKg}kg</span>
                    <span style={{ padding:"3px 10px", borderRadius:12, background:grade.color+"22", color:grade.color, fontSize:13, fontWeight:700 }}>{grade.label}</span>
                  </div>
                  <div style={{ textAlign:"center", marginBottom:10 }}>
                    <span style={{ fontSize:32, fontWeight:700, color:grade.color }}>{bmiRound}</span>
                    <span style={{ fontSize:13, color:"#888", marginLeft:4 }}>BMI</span>
                  </div>
                  <div style={{ position:"relative", background:"linear-gradient(90deg,#3b82f6,#16a34a,#f59e0b,#ef4444)", borderRadius:8, height:10, marginBottom:4 }}>
                    <div style={{ position:"absolute", top:-3, left:`${pct}%`, width:16, height:16, borderRadius:"50%", background:"#fff", border:"3px solid #333", transform:"translateX(-50%)" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#aaa" }}>
                    <span>저체중</span><span>정상</span><span>과체중</span><span>비만</span>
                  </div>
                </div>
              );
            })() : <div style={{ fontSize:13, color:"#aaa", textAlign:"center", padding:8 }}>키를 입력하고 체중을 기록하면 BMI가 나와요!</div>}
          </div>

          {/* 운동 루틴 추천 */}
          <div style={card}>
            <div style={{ fontWeight:600, fontSize:15, color:"#16a34a", marginBottom:10 }}>💪 오늘 운동 루틴 추천</div>
            <button onClick={getRoutine} disabled={routineBusy}
              style={{ width:"100%", padding:"12px", borderRadius:12, border:"none", background:routineBusy?"#dcfce7":"#16a34a", color:routineBusy?"#6ee7b7":"#fff", fontSize:14, fontWeight:600, cursor:"pointer", marginBottom: routineResult?12:0 }}>
              {routineBusy ? "루틴 짜는 중... 🥗" : "🏋️ 나에게 맞는 루틴 짜줘"}
            </button>
            {routineResult && <div style={{ fontSize:13, lineHeight:1.8, whiteSpace:"pre-wrap", color:"#111" }}>{routineResult}</div>}
          </div>

          {/* 체중 그래프 */}
          <div style={card}>
            <div style={{ fontWeight:600, fontSize:15, color:"#16a34a", marginBottom:10 }}>📈 체중 변화</div>
            <WeightGraph weightLog={weightLog} />
          </div>

          {/* 이번주 칼로리 */}
          <div style={card}>
            <div style={{ fontWeight:600, fontSize:15, color:"#16a34a", marginBottom:10 }}>🔥 이번주 칼로리</div>
            {Array.from({length:7}).map((_,i) => {
              const d = new Date(); d.setDate(d.getDate()-(6-i));
              const ds = d.toISOString().slice(0,10);
              const dl = dailyLog[ds]||{};
              const cal = (dl.food||[]).reduce((s,f)=>s+(f.cal||0),0);
              const pct = Math.min(100, (cal/2000)*100);
              const label = ["일","월","화","수","목","금","토"][d.getDay()];
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <div style={{ width:20, fontSize:12, color:"#888", textAlign:"center" }}>{label}</div>
                  <div style={{ flex:1, background:"#e5f5e5", borderRadius:6, height:10, overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, background:cal>2000?"#ef4444":"#16a34a", height:"100%", borderRadius:6 }} />
                  </div>
                  <div style={{ fontSize:12, color:cal>2000?"#ef4444":"#555", width:60, textAlign:"right" }}>{cal>0?`${cal}kcal`:"-"}</div>
                </div>
              );
            })}
          </div>

          {/* 이번주 운동 현황 */}
          <div style={card}>
            <div style={{ fontWeight:600, fontSize:15, color:"#16a34a", marginBottom:10 }}>🏃 이번주 운동 현황</div>
            <div style={{ display:"flex", gap:6, justifyContent:"space-between" }}>
              {Array.from({length:7}).map((_,i) => {
                const d = new Date(); d.setDate(d.getDate()-(6-i));
                const ds = d.toISOString().slice(0,10);
                const dl = dailyLog[ds]||{};
                const did = (dl.exercise||[]).length > 0;
                const label = ["일","월","화","수","목","금","토"][d.getDay()];
                return (
                  <div key={i} style={{ flex:1, textAlign:"center" }}>
                    <div style={{ width:"100%", aspectRatio:"1", borderRadius:8, background:did?"#16a34a":"#e5f5e5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, marginBottom:4 }}>
                      {did?"✓":""}
                    </div>
                    <div style={{ fontSize:11, color:"#888" }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ height:20 }} />
        </div>
      )}

      {/* ══ 주간 리포트 ══ */}
      {tab==="weekly" && (
        <div style={{ flex:1, overflowY:"auto", padding:16, background:"#f0fdf4", display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ ...card }}>
            <div style={{ fontWeight:600, fontSize:15, color:"#16a34a", marginBottom:6 }}>📊 지난 7일 요약</div>
            {Array.from({length:7}).map((_,i) => {
              const d = new Date(); d.setDate(d.getDate()-(6-i));
              const ds = d.toISOString().slice(0,10);
              const w  = weightLog.find(x=>x.date===ds);
              const dl = dailyLog[ds]||{};
              const cal = (dl.food||[]).reduce((s,f)=>s+(f.cal||0),0);
              return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"5px 8px", background:"#f0fdf4", borderRadius:8, marginBottom:4 }}>
                  <span style={{ color:"#555" }}>{ds.slice(5)}</span>
                  <span>{w?`${w.kg}kg`:"-"}</span>
                  <span>{cal>0?`${cal}kcal`:"-"}</span>
                  <span>{dl.water?`${dl.water}ml`:"-"}</span>
                  <span>{(dl.exercise||[]).length>0?"🏃":"-"}</span>
                </div>
              );
            })}
          </div>
          <button onClick={getWeekly} disabled={weeklyBusy}
            style={{ padding:"14px", borderRadius:16, border:"none", background:weeklyBusy?"#dcfce7":"#16a34a", color:weeklyBusy?"#6ee7b7":"#fff", fontSize:15, fontWeight:600, cursor:"pointer" }}>
            {weeklyBusy?"분석 중... 🥗":"📊 AI 주간 리포트 받기"}
          </button>
          {weeklyResult && (
            <div style={{ ...card, fontSize:14, lineHeight:1.8, whiteSpace:"pre-wrap", color:"#111" }}>
              {weeklyResult}
            </div>
          )}
          <div style={{ height:20 }} />
        </div>
      )}
    </div>
  );
}
