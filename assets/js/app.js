import { bodyMapSvg } from './bodymap.js';

const ALL = 'all';
const PAGE = 48;
const SITE_NAME = 'MUSCLE MAP';

// 部位別とは別に、横断して見られる特集
const FEATURES = {
  channels: {
    name: 'チャンネル別',
    desc: '人気のトレーニング系 YouTube チャンネルごとに見られます。チャンネルを選ぶとその動画だけに絞れます。',
    match: () => true,
  },
  shorts: {
    name: 'ショート',
    desc: '1 種目のフォームやコツを数十秒で確認できる YouTube ショートです。',
    match: (v) => v.short,
  },
};
const DURATIONS = [
  { key: '', label: 'すべて', test: () => true },
  { key: 's', label: '〜5分', test: (d) => d <= 300 },
  { key: 'm', label: '5〜15分', test: (d) => d > 300 && d <= 900 },
  { key: 'l', label: '15〜30分', test: (d) => d > 900 && d <= 1800 },
  { key: 'xl', label: '30分〜', test: (d) => d > 1800 },
];
const SORTS = {
  views: (a, b) => b.views - a.views,
  new: (a, b) => b.date.localeCompare(a.date) || b.views - a.views,
  short: (a, b) => a.duration - b.duration,
  long: (a, b) => b.duration - a.duration,
};

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// データは main.js が読み込んでから、この app.js を読み込む
const { meta, videos } = window.__MM_DATA__;
for (const v of videos) v.search = `${v.title} ${v.channel}`.toLowerCase();
const partBySlug = new Map(meta.parts.map((p) => [p.slug, p]));
const equipBySlug = new Map(meta.equips.map((e) => [e.slug, e]));
const TAGS = meta.tags;

// view: 'part'（部位別）または FEATURES のキー。channel: チャンネル別で選んでいるチャンネル
const state = { view: 'part', part: ALL, equip: ALL, channel: '', tags: new Set(), dur: '', lang: '', sort: 'views', query: '', limit: PAGE };

/* ---------- ルーティング: /<part>/<equip>、特集は /<feature>/<part>/<equip> ---------- */
// サイトを置いている場所（Vercel は /、GitHub Pages は /fitness-videos/）。index.html の <base> から取る
const BASE = new URL(document.baseURI).pathname;
function routePath({ view, part, equip }) {
  const segs = [part, equip === ALL ? '' : equip];
  if (!segs[1] && part === ALL) segs[0] = '';
  return `${BASE}${[view === 'part' ? '' : view, ...segs].filter(Boolean).join('/')}`;
}
function readRoute() {
  let path = decodeURI(location.pathname);
  if (path.startsWith(BASE)) path = path.slice(BASE.length);
  let segs = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  state.view = 'part';
  if (FEATURES[segs[0]]) {
    state.view = segs[0];
    segs = segs.slice(1);
  }
  const [part = ALL, equip = ALL] = segs;
  state.part = partBySlug.has(part) ? part : ALL;
  state.equip = equipBySlug.has(equip) ? equip : ALL;
  const c = new URLSearchParams(location.search).get('c') ?? '';
  state.channel = state.view === 'channels' && videos.some((v) => v.channel === c) ? c : '';
}
// 絞り込みを変えたら URL を書き換える（戻るボタンで前の表示に戻れるように履歴を積む）
function writeRoute(push) {
  const path = routePath(state);
  const search = state.view === 'channels' && state.channel ? `?c=${encodeURIComponent(state.channel)}` : '';
  if (location.pathname === path && location.search === search) return;
  history[push ? 'pushState' : 'replaceState'](null, '', path + search);
}

/* ---------- 絞り込み ---------- */
const viewVideos = () => (state.view === 'part' ? videos : videos.filter(FEATURES[state.view].match));
const matchesChannel = (v) => state.view !== 'channels' || !state.channel || v.channel === state.channel;
const matchesPart = (v) => state.part === ALL || v.parts.includes(state.part);
const matchesEquip = (v) => state.equip === ALL || v.equip.includes(state.equip);
const durTest = (key) => DURATIONS.find((d) => d.key === key).test;
const matchesRest = (v) => (!state.lang || v.lang === state.lang) && durTest(state.dur)(v.duration);
function currentVideos() {
  const q = state.query.trim().toLowerCase();
  return viewVideos()
    .filter(
      (v) =>
        matchesChannel(v) &&
        matchesPart(v) &&
        matchesEquip(v) &&
        matchesRest(v) &&
        [...state.tags].every((t) => v.tags.includes(t)) &&
        (!q || v.search.includes(q)),
    )
    .sort(SORTS[state.sort]);
}

/* ---------- 表示用の書式 ---------- */
function formatViews(n) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1).replace(/\.0$/, '')}億回`;
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString()}万回`;
  return `${n.toLocaleString()}回`;
}
function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
const partLabel = () => (state.part === ALL ? '全部位' : partBySlug.get(state.part).name);

// 横スクロール一覧の中で、選択中の要素が見える位置まで送る（ページ自体は動かさない）
function revealSelected(list, selector = '[aria-selected="true"], [aria-pressed="true"]') {
  const el = list.querySelector(selector);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const box = list.getBoundingClientRect();
  if (r.left < box.left) list.scrollLeft += r.left - box.left - 40;
  else if (r.right > box.right) list.scrollLeft += r.right - box.right + 40;
}

/* ---------- 描画 ---------- */
function renderViewTabs() {
  const tab = (view, label, n) =>
    `<button type="button" class="view-tab" role="tab" data-view="${view}" aria-selected="${state.view === view}">${label}<span class="view-tab-count">${n}</span></button>`;
  $('#view-tabs').innerHTML = [
    tab('part', '部位別', videos.length),
    ...Object.entries(FEATURES).map(([key, f]) => tab(key, f.name, videos.filter(f.match).length)),
  ].join('');
}

const bodymap = $('#bodymap');
bodymap.innerHTML = bodyMapSvg();
function renderBodyMap() {
  const all = state.part === 'fullbody';
  bodymap.querySelectorAll('[data-part]').forEach((el) => el.classList.toggle('is-selected', all || el.dataset.part === state.part));
}

function renderHero() {
  const pool = viewVideos().filter(matchesChannel);
  const n = pool.filter(matchesPart).length;
  const p = partBySlug.get(state.part);
  const feature = FEATURES[state.view];
  // 選んでいる部位の色をページのアクセントに使う（style.css の :root[data-part]）
  document.documentElement.dataset.part = state.part;
  const kicker = feature ? `${feature.name}${state.channel ? ` ／ ${esc(state.channel)}` : ''}` : 'BODY PART';
  $('#hero-info').innerHTML = p
    ? `<p class="hero-kicker">${kicker}</p>
       <h1 class="hero-title"><span class="hero-en">${esc(p.nameEn)}</span><span class="hero-ja">${esc(p.name)}のトレーニング動画</span></h1>
       <ul class="muscles">${p.muscles.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
       <p class="hero-desc">${esc(p.desc)}</p>`
    : `<p class="hero-kicker">${kicker}</p>
       <h1 class="hero-title"><span class="hero-en">PICK A MUSCLE</span><span class="hero-ja">鍛えたい部位を選ぼう</span></h1>
       <p class="hero-desc">${feature ? esc(feature.desc) : `人体図の部位をタップするか、下のボタンから選んでください。YouTube の筋トレ・ストレッチ動画 ${n.toLocaleString()} 本を、部位・種類（自重／ダンベル／ジム／ストレッチ）・長さで絞り込めます。`}</p>`;

  const count = (slug) => pool.filter((v) => v.parts.includes(slug)).length;
  const groups = Object.entries(meta.groups).map(([g, label]) => {
    const btns = meta.parts
      .filter((x) => x.group === g)
      .map(
        (x) =>
          `<button type="button" class="part-btn" data-part="${x.slug}" aria-pressed="${state.part === x.slug}" ${count(x.slug) ? '' : 'disabled'}>${esc(x.name)}<span class="count">${count(x.slug)}</span></button>`,
      )
      .join('');
    return `<div class="part-group"><p class="part-group-label">${label}</p><div class="part-group-btns">${btns}</div></div>`;
  });
  $('#part-list').innerHTML =
    `<div class="part-group"><p class="part-group-label">すべて</p><div class="part-group-btns"><button type="button" class="part-btn" data-part="${ALL}" aria-pressed="${state.part === ALL}">全部位<span class="count">${pool.length}</span></button></div></div>` +
    groups.join('');
}

function renderChannelChips() {
  const row = $('#channel-row');
  row.hidden = state.view !== 'channels';
  if (row.hidden) return;
  const base = videos.filter((v) => matchesPart(v) && matchesEquip(v));
  const count = new Map();
  for (const v of base) count.set(v.channel, (count.get(v.channel) ?? 0) + 1);
  if (state.channel && !count.has(state.channel)) count.set(state.channel, 0);
  // 本数の少ないチャンネルまで並べると探しにくいので、3 本以上（と選択中）に絞る
  const list = [...count].filter(([c, n]) => n >= 3 || c === state.channel).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'));
  const chip = (c, label, n) =>
    `<button type="button" class="chip" data-channel="${esc(c)}" aria-pressed="${state.channel === c}">${esc(label)}<span class="chip-count">${n}</span></button>`;
  const chips = $('#channel-chips');
  const scroll = chips.scrollLeft;
  chips.innerHTML = [chip('', 'すべて', base.length), ...list.map(([c, n]) => chip(c, c, n))].join('');
  chips.scrollLeft = scroll;
}

function renderEquipTabs() {
  const base = viewVideos().filter((v) => matchesChannel(v) && matchesPart(v));
  const tab = (slug, name, sub, n) =>
    `<button type="button" class="equip-tab" role="tab" data-equip="${slug}" aria-selected="${state.equip === slug}" ${n || state.equip === slug ? '' : 'disabled'}>
      <span class="equip-name">${name}</span><span class="equip-sub">${sub}・${n} 本</span>
    </button>`;
  $('#equip-tabs').innerHTML = [
    tab(ALL, 'すべて', '種類を問わず', base.length),
    ...meta.equips.map((e) => tab(e.slug, esc(e.name), esc(e.desc), base.filter((v) => v.equip.includes(e.slug)).length)),
  ].join('');
}

function renderFilters() {
  // タグの件数はタグ以外の条件で絞った結果に対して数える
  const base = viewVideos().filter((v) => matchesChannel(v) && matchesPart(v) && matchesEquip(v) && matchesRest(v));
  $('#tag-chips').innerHTML = Object.entries(TAGS)
    .map(([tag, label]) => {
      const n = base.filter((v) => v.tags.includes(tag)).length;
      if (!n && !state.tags.has(tag)) return '';
      return `<button type="button" class="chip" data-tag="${tag}" aria-pressed="${state.tags.has(tag)}">${label}<span class="chip-count">${n}</span></button>`;
    })
    .join('');
  $('#duration-filter').innerHTML = DURATIONS.map(
    (d) => `<button type="button" data-dur="${d.key}" aria-pressed="${state.dur === d.key}">${d.label}</button>`,
  ).join('');
}

function videoCard(v) {
  const parts = state.part === ALL ? v.parts.map((p) => `<span class="tag tag-part" data-part="${p}">${esc(partBySlug.get(p).name)}</span>`).join('') : '';
  const equips = state.equip === ALL ? v.equip.map((e) => `<span class="tag tag-equip">${esc(equipBySlug.get(e).name)}</span>`).join('') : '';
  const tags = v.tags.map((t) => `<span class="tag">${TAGS[t]}</span>`).join('');
  return `
    <button type="button" class="video-card" data-id="${v.id}">
      <div class="thumb${v.short ? ' is-short' : ''}">
        <img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy" width="320" height="180">
        ${v.duration ? `<span class="badge badge-duration">${formatDuration(v.duration)}</span>` : ''}
        <span class="thumb-badges">${v.short ? '<span class="badge badge-short">SHORT</span>' : ''}<span class="badge">${v.lang === 'ja' ? 'JP' : 'EN'}</span></span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${esc(v.title)}</h3>
        <p class="card-meta"><span class="card-channel">${esc(v.channel)}</span><span>${formatViews(v.views)}</span>${v.date ? `<span>${v.date.slice(0, 4)}年</span>` : ''}</p>
        ${parts || equips || tags ? `<div class="card-tags">${parts}${equips}${tags}</div>` : ''}
      </div>
    </button>`;
}

function renderGrid() {
  const list = currentVideos();
  const equipLabel = state.equip === ALL ? '' : ` × ${equipBySlug.get(state.equip).name}`;
  const prefix = FEATURES[state.view] ? `${FEATURES[state.view].name}${state.channel ? `（${state.channel}）` : ''}：` : '';
  $('#result-count').innerHTML = `${esc(prefix + partLabel() + equipLabel)}：<strong>${list.length}</strong> 本`;
  const grid = $('#video-grid');
  grid.innerHTML = list.length
    ? list.slice(0, state.limit).map(videoCard).join('')
    : '<p class="empty">条件に合う動画がありません。絞り込みを変えてみてください。</p>';
  const more = $('#more');
  more.hidden = list.length <= state.limit;
  more.textContent = `もっと見る（残り ${list.length - state.limit} 本）`;
  setMeta(list.length);
}

// タイトル・説明文をページに合わせて書き換える
function setMeta(count) {
  const p = partBySlug.get(state.part);
  const e = equipBySlug.get(state.equip);
  const what = `${p ? p.name : '部位別'}${e ? `・${e.name}` : ''}`;
  const feature = FEATURES[state.view] ? `${FEATURES[state.view].name}${state.channel ? `（${state.channel}）` : ''}の` : '';
  document.title =
    state.view === 'part' && !p && !e
      ? `部位別トレーニング動画まとめ｜胸・背中・腹筋・脚・お尻 | ${SITE_NAME}`
      : `${feature}${what}のトレーニング動画 ${count}本 | ${SITE_NAME}`;
}

function render(push = false) {
  writeRoute(push);
  renderViewTabs();
  renderBodyMap();
  renderHero();
  renderChannelChips();
  renderEquipTabs();
  renderFilters();
  renderGrid();
  requestAnimationFrame(() => {
    revealSelected($('#equip-tabs'));
    revealSelected($('#channel-chips'));
  });
}
// 絞り込みを変えたら、表示件数を最初のページに戻す
const refilter = (push = false) => {
  state.limit = PAGE;
  render(push);
};

/* ---------- プレイヤー ---------- */
// <dialog> が無いブラウザ（Safari 15.4 未満など）向けに、showModal / close と Esc で閉じる動きを足す
function shimDialog(dialog) {
  if (typeof dialog.showModal === 'function') return;
  dialog.classList.add('dialog-shim');
  dialog.showModal = () => dialog.setAttribute('open', '');
  dialog.close = () => {
    if (!dialog.hasAttribute('open')) return;
    dialog.removeAttribute('open');
    dialog.dispatchEvent(new Event('close'));
  };
  document.addEventListener('keydown', (e) => e.key === 'Escape' && dialog.close());
}
const player = $('#player');
shimDialog(player);
const youtubeUrl = (v) => (v.short ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`);

// 動画の開き方（サイト内で再生 / YouTube で開く）。bot 確認が出るブラウザの人向けに選べるようにし、ブラウザに記憶する
const OPEN_MODE_KEY = 'mm-open-mode';
let openMode = 'site';
try {
  if (localStorage.getItem(OPEN_MODE_KEY) === 'youtube') openMode = 'youtube';
} catch {}
function setOpenMode(mode) {
  openMode = mode;
  try {
    localStorage.setItem(OPEN_MODE_KEY, mode);
  } catch {}
  document.querySelectorAll('#open-mode [data-mode]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === mode));
  $('#always-youtube').checked = mode === 'youtube';
}

// YouTube の公式プレーヤー API で再生が始まったかを見る。bot 確認などで始まらなければ「YouTube で開く」を案内する
let youtubeApi;
const loadYouTubeApi = () =>
  (youtubeApi ??= new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const script = Object.assign(document.createElement('script'), { src: 'https://www.youtube.com/iframe_api', async: true });
    script.onerror = reject;
    document.head.append(script);
  }));
const STUCK_MS = 6000;
let stuckTimer;
function showStuck(show) {
  clearTimeout(stuckTimer);
  $('#player-stuck').hidden = !show;
  player.classList.toggle('is-stuck', show);
}

function openPlayer(id) {
  const v = videos.find((x) => x.id === id);
  if (openMode === 'youtube') {
    window.open(youtubeUrl(v), '_blank', 'noopener');
    return;
  }
  // 毎回新しい iframe に差し替えて、プレーヤー API をつなぎ直す
  // youtube-nocookie だと YouTube にログインしていても未ログイン扱いになり bot 確認が出やすいので youtube.com を使う
  const params = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1', enablejsapi: '1', origin: location.origin });
  const old = $('#player-iframe');
  const iframe = old.cloneNode(false);
  iframe.src = `https://www.youtube.com/embed/${id}?${params}`;
  old.replaceWith(iframe);
  showStuck(false);
  stuckTimer = setTimeout(() => showStuck(true), STUCK_MS);
  loadYouTubeApi()
    .then((YT) => {
      if (!iframe.isConnected) return;
      new YT.Player(iframe, {
        events: {
          // 1: 再生中 / 3: 読み込み中 → 見られているので案内は出さない
          onStateChange: (e) => (e.data === 1 || e.data === 3) && showStuck(false),
          onError: () => showStuck(true),
        },
      });
    })
    .catch(() => {});
  $('#player-title').textContent = v.title;
  $('#player-channel').textContent = [v.channel, v.duration && formatDuration(v.duration), formatViews(v.views)].filter(Boolean).join(' ・ ');
  $('#player-link').href = youtubeUrl(v);
  $('#player-stuck-link').href = youtubeUrl(v);
  player.classList.toggle('is-short', v.short);
  player.showModal();
}
player.addEventListener('close', () => {
  showStuck(false);
  $('#player-iframe').src = 'about:blank';
});
player.addEventListener('click', (e) => e.target === player && player.close());
$('#player-close').addEventListener('click', () => player.close());
$('#open-mode').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-mode]');
  if (btn) setOpenMode(btn.dataset.mode);
});
$('#always-youtube').addEventListener('change', (e) => setOpenMode(e.target.checked ? 'youtube' : 'site'));
setOpenMode(openMode);

/* ---------- 横スクロール（種類・チャンネルの一覧） ---------- */
for (const wrap of document.querySelectorAll('.scroller')) {
  const list = wrap.firstElementChild;
  wrap.insertAdjacentHTML(
    'beforeend',
    `<button type="button" class="scroll-btn scroll-prev" data-dir="-1" aria-label="左へスクロール" tabindex="-1"></button>
     <button type="button" class="scroll-btn scroll-next" data-dir="1" aria-label="右へスクロール" tabindex="-1"></button>`,
  );
  const update = () => {
    const max = list.scrollWidth - list.clientWidth;
    wrap.classList.toggle('can-prev', list.scrollLeft > 1);
    wrap.classList.toggle('can-next', list.scrollLeft < max - 1);
  };
  list.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(list);
  new MutationObserver(update).observe(list, { childList: true });
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.scroll-btn');
    if (btn) list.scrollBy({ left: btn.dataset.dir * list.clientWidth * 0.8, behavior: 'smooth' });
  });
}

/* ---------- テーマ ---------- */
$('#theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('mm-theme', next);
  } catch {}
});

/* ---------- イベント ---------- */
function selectPart(part) {
  if (part === state.part) return;
  state.part = part;
  // 同じ種類に動画が無ければ種類を「すべて」に戻す
  if (!viewVideos().some((v) => matchesChannel(v) && matchesPart(v) && matchesEquip(v))) state.equip = ALL;
  state.tags.clear();
  refilter(true);
}

$('#view-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-view]');
  if (!btn || btn.dataset.view === state.view) return;
  state.view = btn.dataset.view;
  state.channel = '';
  state.tags.clear();
  // ショートは数十秒なので長さの絞り込みを外す。動画が無くなる部位・種類は「すべて」に戻す
  if (state.view === 'shorts') state.dur = '';
  if (!viewVideos().some(matchesPart)) state.part = ALL;
  if (!viewVideos().some((v) => matchesPart(v) && matchesEquip(v))) state.equip = ALL;
  refilter(true);
});

bodymap.addEventListener('click', (e) => {
  const el = e.target.closest('[data-part]');
  if (el) selectPart(el.dataset.part);
});
// 同じ部位の図形（左右・前後）をまとめてハイライトする
bodymap.addEventListener('mouseover', (e) => {
  const part = e.target.closest('[data-part]')?.dataset.part;
  bodymap.querySelectorAll('[data-part]').forEach((el) => el.classList.toggle('is-hover', el.dataset.part === part));
});
bodymap.addEventListener('mouseleave', () => bodymap.querySelectorAll('.is-hover').forEach((el) => el.classList.remove('is-hover')));
$('#part-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-part]');
  if (btn && !btn.disabled) selectPart(btn.dataset.part);
});

$('#channel-chips').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-channel]');
  if (!btn) return;
  state.channel = btn.dataset.channel === state.channel ? '' : btn.dataset.channel;
  state.tags.clear();
  refilter(true);
});

$('#equip-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-equip]');
  if (!btn || btn.disabled || btn.dataset.equip === state.equip) return;
  state.equip = btn.dataset.equip;
  state.tags.clear();
  refilter(true);
});

$('#tag-chips').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tag]');
  if (!btn) return;
  const { tag } = btn.dataset;
  state.tags.has(tag) ? state.tags.delete(tag) : state.tags.add(tag);
  refilter();
});
$('#duration-filter').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-dur]');
  if (!btn) return;
  state.dur = btn.dataset.dur;
  refilter();
});
$('#lang-filter').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-lang]');
  if (!btn) return;
  state.lang = btn.dataset.lang;
  document.querySelectorAll('#lang-filter button').forEach((b) => b.setAttribute('aria-pressed', b === btn));
  refilter();
});
$('#sort').addEventListener('change', (e) => {
  state.sort = e.target.value;
  refilter();
});
$('#search').addEventListener('input', (e) => {
  state.query = e.target.value;
  state.limit = PAGE;
  renderGrid();
});
$('#more').addEventListener('click', () => {
  state.limit += PAGE;
  renderGrid();
});
$('#video-grid').addEventListener('click', (e) => {
  const card = e.target.closest('[data-id]');
  if (card) openPlayer(card.dataset.id);
});
window.addEventListener('popstate', () => {
  readRoute();
  state.limit = PAGE;
  render();
});

/* ---------- 初期化 ---------- */
const channelCount = new Set(videos.map((v) => v.channel)).size;
$('#header-stats').innerHTML = `<strong>${videos.length.toLocaleString()}</strong> 本 ・ <strong>${channelCount}</strong> チャンネル`;
$('#footer-meta').textContent = `再生数・投稿年は収集時点（${meta.updatedAt ?? ''}）のものです。`;
readRoute();
render();
