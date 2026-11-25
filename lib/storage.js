const USERS_KEY = "cdl_users_v2";
const SESSION_KEY = "cdl_session_v2";
const DREAMS_KEY = "cdl_dreams_v3";
const IDB_NAME = "chaos-dream-lab-media";
const IDB_STORE = "audio_blobs";

async function hashPassword(password) {
  const salted = `cdl-rem-salt::${password}`;
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    try {
      const data = new TextEncoder().encode(salted);
      const digest = await window.crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // fall through
    }
  }
  let hash = 0;
  for (let i = 0; i < salted.length; i += 1) {
    hash = (hash << 5) - hash + salted.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${Math.abs(hash)}`;
}

const SEED_USERS = [
  {
    id: "user-lin",
    name: "林深",
    email: "lin@dreamlab.io",
    passcodeHint: "demo1234",
    passwordHash: "SEED_DEMO_ACCOUNT",
    badge: "DEPT. REM-04",
    bio: "专门打捞凌晨四点前的走廊与海。",
    createdAt: "2026-03-12T04:10:00.000Z",
  },
  {
    id: "user-su",
    name: "苏晚",
    email: "su@dreamlab.io",
    passcodeHint: "demo1234",
    passwordHash: "SEED_DEMO_ACCOUNT",
    badge: "DEPT. REM-09",
    bio: "把梦里未说出口的话洗成 35mm 胶片。",
    createdAt: "2026-04-02T06:22:00.000Z",
  },
];

export const SEED_DREAMS = [
  {
    id: "dream-corridor-01",
    reelCode: "REEL #001",
    userId: "user-lin",
    authorName: "林深",
    authorBadge: "DEPT. REM-04",
    title: "没有尽头的荧光白走廊",
    enTitle: "THE INFINITE FLUORESCENT CORRIDOR",
    dreamDate: "2026-11-18",
    mood: "悬疑",
    filmStock: "lumon-35mm",
    visibility: "public",
    status: "ready",
    rawText:
      "醒来前一直在一条极其对称的白色走廊里走，头顶的日光灯管发出很轻的电流声。每次拐弯都以为能走到出口，但走廊尽头永远立着一扇发着青光的门，门口站着一个和我长得一模一样的人，却始终没有回头。",
    summary: "在极度对称的记忆走廊里，清醒的我与梦中的自己隔着一道微光之门彼此注视。",
    interpretation:
      "重复延伸的对称空间常象征清醒与潜意识之间的「记忆切割带」；背对你的另一个自己，往往代表尚未被白天生活安放的情绪与决定。",
    symbols: ["对称走廊", "荧光灯管", "青光之门", "镜像背影"],
    hasVoice: false,
    likes: 18,
    likedBy: [],
    createdAt: "2026-11-18T06:42:00.000Z",
    shots: [
      {
        id: "c1-s1",
        archetype: "rain-corridor",
        imageUrl: "/assets/dreams/corridor.jpg",
        camera: "SYMMETRIC DOLLY IN",
        subtitle: "走廊极度安静，只有头顶冷白灯管发出细微的蜂鸣。",
        enSubtitle: "The hallway hums under symmetrical fluorescent stillness.",
        visualPrompt: "对称无尽的复古冷白走廊，地面泛着微弱青绿反光，远端有一道发亮的门",
      },
      {
        id: "c1-s2",
        archetype: "floating-stairs",
        camera: "FLOATING TILT UP",
        subtitle: "每次以为推开了出口，门后却是悬在雾里的另一段阶梯。",
        enSubtitle: "Every exit opens onto another staircase suspended in mist.",
        visualPrompt: "薄雾中悬浮的几何阶梯，一束笔直天光从上方垂落",
      },
      {
        id: "c1-s3",
        archetype: "rain-corridor",
        camera: "STATIC OBSERVATION",
        subtitle: "尽头的门缝透出温热的光，那个背影站得很直，却始终没回头。",
        enSubtitle: "A silhouette stands at the threshold, refusing to turn around.",
        visualPrompt: "单点透视走廊尽头，发光门框内站立着模糊的孤单剪影",
      },
      {
        id: "c1-s4",
        archetype: "midnight-harbor",
        camera: "SLOW TRACKING PAN",
        subtitle: "醒来那一秒，走廊忽然融化成了一片凌晨四点的雾海。",
        enSubtitle: "At the edge of waking, the walls dissolve into a 4 a.m. harbor.",
        visualPrompt: "午夜雾气弥漫的静谧水面，远处零星灯火在水面拉出长影",
      },
    ],
  },
  {
    id: "dream-tram-02",
    reelCode: "REEL #002",
    userId: "user-su",
    authorName: "苏晚",
    authorBadge: "DEPT. REM-09",
    title: "凌晨四点的海上电车",
    enTitle: "4 A.M. TRAM ACROSS THE SEA",
    dreamDate: "2026-11-14",
    mood: "怀旧",
    filmStock: "kodak-2383",
    visibility: "public",
    status: "ready",
    rawText:
      "我坐在一列只有我一个人的旧电车里，铁轨浸在平静的海面下。窗外是橘红色的黄昏，又像是挂着月亮的深夜。车厢晃动得很慢，电线杆一根根往后退，我手里捏着一张没有写终点站的车票，心里却一点也不慌。",
    summary: "一趟穿行在海面与黄昏之间的无人电车，载着一张没有终点站的旧车票。",
    interpretation:
      "驶过水面的列车是典型的「时间过渡」意象——你并不急于抵达终点，潜意识正在温柔地替你留住一段缓慢而安全的独处时光。",
    symbols: ["浸水铁轨", "无人电车", "黄昏车窗", "无终点车票"],
    hasVoice: false,
    likes: 34,
    likedBy: [],
    createdAt: "2026-11-14T07:15:00.000Z",
    shots: [
      {
        id: "t2-s1",
        archetype: "sunset-train",
        imageUrl: "/assets/dreams/tram.jpg",
        camera: "SLOW TRACKING PAN",
        subtitle: "车窗外电线杆缓缓倒退，琥珀色的落日铺满整节空车厢。",
        enSubtitle: "Telegraph poles drift past an empty carriage bathed in amber.",
        visualPrompt: "复古电车车窗剪影，窗外是温暖橘金色的黄昏云海与电线杆",
      },
      {
        id: "t2-s2",
        archetype: "ocean-moonlight",
        camera: "SYMMETRIC DOLLY IN",
        subtitle: "铁轨沉在海面之下，月光把每一道涟漪照成旧胶片的颜色。",
        enSubtitle: "Submerged rails carry the train straight across moonlit ripples.",
        visualPrompt: "平静深海与浸在水中的旧铁轨，银金色月光洒满海面",
      },
      {
        id: "t2-s3",
        archetype: "midnight-harbor",
        camera: "HANDHELD BREATHE",
        subtitle: "远处的灯塔闪了两下，像在提醒我别急着醒来。",
        enSubtitle: "A distant harbor lantern blinks twice, asking me not to wake.",
        visualPrompt: "薄雾码头与漂浮的暖色孤灯，水面倒映微微晃动",
      },
      {
        id: "t2-s4",
        archetype: "sunset-train",
        camera: "STATIC OBSERVATION",
        subtitle: "我低头看了眼手里的车票，上面只写着：下一站，记得回头。",
        enSubtitle: "The ticket had no destination—only a quiet note to remember.",
        visualPrompt: "微尘在车厢光束中飘浮，窗外天色渐深进入夜幕",
      },
    ],
  },
  {
    id: "dream-classroom-03",
    reelCode: "REEL #003",
    userId: "user-su",
    authorName: "苏晚",
    authorBadge: "DEPT. REM-09",
    title: "下雪的旧教室与未寄出的信",
    enTitle: "SNOWFALL IN THE OLD CLASSROOM",
    dreamDate: "2026-11-09",
    mood: "温暖",
    filmStock: "millennium-dv",
    visibility: "public",
    status: "ready",
    rawText:
      "回到了高中那间朝西的教室，但窗外一直在下很安静的大雪。下午三点的光斜着照进来，所有课桌上都放着折好的纸飞机。黑板上写着一行字，我走近想看清的时候，闹钟就响了。",
    summary: "朝西的旧教室里飘起无声大雪，阳光斜照着满桌未曾寄出的纸飞机。",
    interpretation:
      "旧教室与雪景交叠，常是记忆对「未完成告别」的一次温柔补拍——那些当年没来得及说出的话，被梦境折叠成了光束里的纸飞机。",
    symbols: ["朝西教室", "斜射光束", "窗外大雪", "纸飞机"],
    hasVoice: false,
    likes: 27,
    likedBy: [],
    createdAt: "2026-11-09T08:05:00.000Z",
    shots: [
      {
        id: "cl3-s1",
        archetype: "old-classroom",
        imageUrl: "/assets/dreams/classroom.jpg",
        camera: "STATIC OBSERVATION",
        subtitle: "下午三点的微光斜穿窗格，空气里全是漂浮的粉笔灰与雪尘。",
        enSubtitle: "Slanted three-o'clock light fills the silent classroom with dust.",
        visualPrompt: "三扇高大老式教室窗户，斜射光柱落在空课桌上，胶片柔焦",
      },
      {
        id: "cl3-s2",
        archetype: "snow-forest",
        camera: "FLOATING TILT UP",
        subtitle: "推开窗，操场不见了，外面是一整片落满大雪的松林。",
        enSubtitle: "Outside the window, the schoolyard had become a snowy pine forest.",
        visualPrompt: "暮色中的落雪松林，林间透出一盏温暖微弱的灯光",
      },
      {
        id: "cl3-s3",
        archetype: "old-classroom",
        camera: "SYMMETRIC DOLLY IN",
        subtitle: "每一张课桌上都安静地躺着一封没来得及寄出的信。",
        enSubtitle: "On every wooden desk rests an unsent letter from years ago.",
        visualPrompt: "逆光下的旧木课桌剪影，温暖微尘在空气中缓缓流动",
      },
      {
        id: "cl3-s4",
        archetype: "snow-forest",
        camera: "SLOW TRACKING PAN",
        subtitle: "雪一直落到闹钟响起，那句黑板上的字却留在了心里。",
        enSubtitle: "Snow kept falling until the alarm rang, leaving the message behind.",
        visualPrompt: "漫天细雪飘落，画面缓缓淡入柔和黑暗",
      },
    ],
  },
  {
    id: "dream-rooftop-04",
    reelCode: "REEL #004",
    userId: "user-lin",
    authorName: "林深",
    authorBadge: "DEPT. REM-04",
    title: "霓虹雨夜的失重天台",
    enTitle: "WEIGHTLESS ROOFTOP IN NEON RAIN",
    dreamDate: "2026-11-03",
    mood: "失重",
    filmStock: "wong-neon",
    visibility: "public",
    status: "ready",
    rawText:
      "下着细雨的深夜，我和一个很久没联系的老朋友站在很高的天台边缘。整座城市的霓虹都在积水里化开成红色和青色。我们轻轻一跳就没有了重力，像慢镜头一样飘在半空，听见远处传来旧磁带的沙沙声。",
    summary: "细雨打湿了高楼天台，和久违的老友在霓虹光晕里轻轻摆脱了重力。",
    interpretation:
      "失重与悬浮往往是潜意识释放现实压力的方式；旧友出现在雨夜天台，说明内心深处仍珍藏着那段毫无负担的陪伴感。",
    symbols: ["雨夜天台", "霓虹倒影", "失重悬浮", "旧磁带声"],
    hasVoice: false,
    likes: 22,
    likedBy: [],
    createdAt: "2026-11-03T07:50:00.000Z",
    shots: [
      {
        id: "r4-s1",
        archetype: "neon-rooftop",
        imageUrl: "/assets/dreams/rooftop.jpg",
        camera: "HANDHELD BREATHE",
        subtitle: "细雨落进天台积水，整座城市的霓虹都在脚下慢慢晕开。",
        enSubtitle: "City neon dissolves into puddles across the rain-slicked rooftop.",
        visualPrompt: "深夜雨中天台，远处模糊的红绿霓虹城市天际线与湿润地面反光",
      },
      {
        id: "r4-s2",
        archetype: "floating-stairs",
        camera: "FLOATING TILT UP",
        subtitle: "轻轻迈出一步，重力忽然消失，风把我们托向半空。",
        enSubtitle: "One quiet step forward, and gravity lets go of us completely.",
        visualPrompt: "夜雾与光柱之间悬浮的阶梯与发光拱门，失重漂浮感",
      },
      {
        id: "r4-s3",
        archetype: "neon-rooftop",
        camera: "SLOW TRACKING PAN",
        subtitle: "谁也没有说话，但就像回到了很多年前一起回家的晚上。",
        enSubtitle: "Neither of us spoke, yet it felt like walking home years ago.",
        visualPrompt: "雨丝划过霓虹光斑，深绿与绯红胶片色调交织",
      },
      {
        id: "r4-s4",
        archetype: "ocean-moonlight",
        camera: "STATIC OBSERVATION",
        subtitle: "天亮前云层散开，霓虹褪成了远处平静的海平面。",
        enSubtitle: "Before dawn, the skyline softens into a quiet horizon.",
        visualPrompt: "黎明前寂静深海，微光映照水面",
      },
    ],
  },
];

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function ensureSeedData() {
  if (typeof window === "undefined") return;
  if (!window.localStorage.getItem(USERS_KEY)) {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  }
  if (!window.localStorage.getItem(DREAMS_KEY)) {
    window.localStorage.setItem(DREAMS_KEY, JSON.stringify(SEED_DREAMS));
  }
}

export function getAllUsers() {
  if (typeof window === "undefined") return SEED_USERS;
  ensureSeedData();
  return safeParse(window.localStorage.getItem(USERS_KEY), SEED_USERS);
}

export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  ensureSeedData();
  const userId = window.localStorage.getItem(SESSION_KEY);
  if (!userId) return null;
  const users = getAllUsers();
  return users.find((u) => u.id === userId) || null;
}

export function logoutUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export async function registerUser({ name, email, password, bio = "" }) {
  ensureSeedData();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanName = String(name || "").trim();
  if (!cleanName || !cleanEmail || !password || password.length < 4) {
    throw new Error("请填写昵称、有效邮箱，以及至少 4 位密码");
  }
  const users = getAllUsers();
  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error("该邮箱已注册，请直接登录");
  }
  const passwordHash = await hashPassword(password);
  const deptNo = String((users.length + 1) * 3).padStart(2, "0");
  const newUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    badge: `DEPT. REM-${deptNo}`,
    bio: bio.trim() || "在清醒与梦境的缝隙里收集胶片。",
    createdAt: new Date().toISOString(),
  };
  const updated = [newUser, ...users];
  window.localStorage.setItem(USERS_KEY, JSON.stringify(updated));
  window.localStorage.setItem(SESSION_KEY, newUser.id);
  return newUser;
}

export async function loginUser({ email, password }) {
  ensureSeedData();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const users = getAllUsers();
  const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!found) {
    throw new Error("未找到该账号，请先注册或使用体验账号");
  }
  if (found.passwordHash === "SEED_DEMO_ACCOUNT") {
    if (password !== (found.passcodeHint || "demo1234")) {
      throw new Error("密码不正确（体验账号密码为 demo1234）");
    }
  } else {
    const hashed = await hashPassword(password);
    if (hashed !== found.passwordHash) {
      throw new Error("密码不正确，请重新输入");
    }
  }
  window.localStorage.setItem(SESSION_KEY, found.id);
  return found;
}

export function quickLoginDemo(userId = "user-lin") {
  ensureSeedData();
  const users = getAllUsers();
  const found = users.find((u) => u.id === userId) || users[0];
  if (found) {
    window.localStorage.setItem(SESSION_KEY, found.id);
  }
  return found || null;
}

export function getAllDreams() {
  if (typeof window === "undefined") return SEED_DREAMS;
  ensureSeedData();
  const list = safeParse(window.localStorage.getItem(DREAMS_KEY), SEED_DREAMS);
  return Array.isArray(list) ? list : SEED_DREAMS;
}

export function saveDream(dream) {
  ensureSeedData();
  const list = getAllDreams();
  const idx = list.findIndex((d) => d.id === dream.id);
  let next;
  if (idx >= 0) {
    next = [...list];
    next[idx] = dream;
  } else {
    next = [dream, ...list];
  }
  window.localStorage.setItem(DREAMS_KEY, JSON.stringify(next));
  return dream;
}

export function deleteDreamById(dreamId) {
  ensureSeedData();
  const list = getAllDreams().filter((d) => d.id !== dreamId);
  window.localStorage.setItem(DREAMS_KEY, JSON.stringify(list));
  deleteAudioBlob(dreamId).catch(() => {});
  return list;
}

export function toggleDreamLike(dreamId, userId) {
  const actor = userId || "guest-viewer";
  const list = getAllDreams();
  const next = list.map((d) => {
    if (d.id !== dreamId) return d;
    const likedBy = Array.isArray(d.likedBy) ? d.likedBy : [];
    const hasLiked = likedBy.includes(actor);
    return {
      ...d,
      likes: Math.max(0, (d.likes || 0) + (hasLiked ? -1 : 1)),
      likedBy: hasLiked ? likedBy.filter((x) => x !== actor) : [...likedBy, actor],
    };
  });
  window.localStorage.setItem(DREAMS_KEY, JSON.stringify(next));
  return next;
}

export function generateNextReelCode(dreams) {
  const num = (dreams?.length || 0) + 1;
  return `REEL #${String(num).padStart(3, "0")}`;
}

/* ---------------- IndexedDB Voice Blob Storage ---------------- */

function openMediaDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAudioBlob(dreamId, blob) {
  if (!dreamId || !blob) return;
  try {
    const db = await openMediaDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(blob, dreamId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore storage quota errors gracefully
  }
}

export async function loadAudioBlob(dreamId) {
  if (!dreamId) return null;
  try {
    const db = await openMediaDb();
    const blob = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(dreamId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return blob;
  } catch {
    return null;
  }
}

export async function deleteAudioBlob(dreamId) {
  if (!dreamId) return;
  try {
    const db = await openMediaDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(dreamId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}
