// 노션 위젯 — 한 페이지의 위젯들을 Cloudflare Worker 파일 하나에 (그대로 붙여넣기용)
//
// 주소 /                     -> 이 Worker에 든 위젯 목록과 노션에 붙일 주소
// 주소 /<이름>?k=<비밀번호>   -> 위젯 화면. 예) /memo?k=…, /budget?k=…
// 주소 /api/<이름>/items      -> 노션 DB 중간 서버 (토큰은 여기서만 씀, 화면에는 안 보임)
//
// Cloudflare 설정 → 변수 및 비밀 (모두 "비밀"로). 노션 데이터를 쓰는 위젯이 하나라도 있을 때만:
//   NOTION_TOKEN   노션 연결(integration) 토큰
//   WIDGET_SECRET  위젯 주소의 k= 값과 같아야 읽기·쓰기 허용 (영문+숫자만, 20자 이상)
// 위젯마다 쓰는 DB ID는 아래 WIDGETS 의 db 에 적는다(비밀 아님. 토큰 없이는 못 씀).
//
// 미리보기: /?demo=1 은 모든 위젯을 가짜 데이터로 한 화면에, /<이름>?demo=1 은 그 위젯만.
// 점검: 주소 끝에 &check=1 → 비밀값·키·토큰·DB 연결·속성 이름을 차례로 확인해 어디가 막혔는지 보여준다.
//       /<이름>?k=…&check=1 은 그 위젯만, /?k=…&check=1 은 전부.
//
// 파일 순서: ① 디자인(모든 위젯 공통) ② 화면 공통 코드 ③ 위젯별 화면 ④ WIDGETS 목록 ⑤ 서버(보통 고칠 필요 없음)

// ===== ① 디자인 — 페이지에 맞춘 색·글꼴·질감 (모든 위젯 공통) =====
const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap" rel="stylesheet">';
const BASE_CSS = `
  :root { --bg:#FAF3E5; --main:#A7CFAA; --accent:#F4B6C1; --ink:#5B4636; --line:#E8DCC4; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: transparent; }
  body { font-family: 'Gowun Dodum', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; color: var(--ink);
         display: grid; grid-template-columns: minmax(0, 1fr); padding: 8px; }
  .card { background: var(--bg); border: 2px dashed var(--line); border-radius: 22px; padding: 16px 18px; }
  .head { display: flex; align-items: center; gap: 10px; font-size: clamp(15px, 4vw, 18px); margin-bottom: 10px; }
  .head img { width: 34px; height: 34px; }
  .msg { font-size: 13px; opacity: .7; padding: 6px 2px; }
`;

// ===== ② 화면 공통 코드 — 모든 위젯 화면에 들어간다 =====
// 주의: 이 안에서는 백틱(`)과 ${ } 를 쓰지 않는다 (서버 쪽 글자 틀이라 깨짐).
// 위젯 화면에서 쓸 수 있는 것: W.name, F(속성 이름), DEMO, num(), api(), HINT
const CLIENT_JS = `
const q = new URLSearchParams(location.search);
const DEMO = q.get('demo') === '1';
// k= 는 직접 읽는다 (URLSearchParams 는 + 를 띄어쓰기로 바꿔서 키가 틀어짐)
const KEY = (function () { const m = /[?&]k=([^&#]*)/.exec(location.search); if (!m) return ''; try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } })();
const HINT = ' (주소 끝에 &check=1 을 붙여 열면 원인을 알려줘요)';
const F = W.fields;
// 계산식·롤업 값이 "12,300원" 같은 글자로 올 때도 숫자로
const num = (v) => typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;
// 이 위젯의 노션 DB: api() 읽기, api('', {method:'POST', body}) 추가, api('/' + id, {method:'PATCH'|'DELETE'}) 수정·삭제
async function api(sub, opt) {
  const r = await fetch('/api/' + W.name + '/items' + (sub || '') + (DEMO ? '?demo=1' : ''),
    Object.assign({}, opt, { headers: { 'x-widget-key': KEY, 'content-type': 'application/json' } }));
  const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j;
}
`;

// ===== ③ 위젯별 화면 — 위젯 하나당 HTML 하나 =====
// <script> 첫 줄의 const W = /*__CONFIG__*/null; 는 그대로 둔다 (서버가 위젯 이름·속성 이름으로 채움).
// 그림은 __ICON_MEMO__ 같은 자리표시자로 두고 assets.py inject 로 채운다.
const HTML_memo = /* html */ `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>메모</title>
${FONT_LINK}
<style>${BASE_CSS}
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; gap: 8px; align-items: center; padding: 8px 4px; border-bottom: 1px dashed var(--line);
       font-size: clamp(13px, 3.6vw, 15px); overflow-wrap: anywhere; }
  li.done span { text-decoration: line-through; opacity: .5; }
</style></head>
<body><div class="card">
  <div class="head"><img alt="" src="__ICON_MEMO__"><b>메모</b></div>
  <ul id="list"></ul><div class="msg" id="msg"></div>
</div>
<script>const W = /*__CONFIG__*/null;
${CLIENT_JS}
async function load() {
  try {
    const { items } = await api();
    const ul = document.getElementById('list'); ul.innerHTML = '';
    for (const it of items) {
      const li = document.createElement('li'); if (it[F.done]) li.className = 'done';
      li.innerHTML = '<span></span>'; li.querySelector('span').textContent = it[F.title] || '';
      ul.appendChild(li);
    }
    document.getElementById('msg').textContent = items.length ? '' : '아직 항목이 없어요';
  } catch (e) { document.getElementById('msg').textContent = e.message + (DEMO ? '' : HINT); }
}
load();
</script></body></html>`;

// ===== ④ 이 페이지의 위젯 목록 =====
// 이름(키) = 주소 뒤에 붙는 말. 영어 소문자·숫자·- 만. 한 번 정하면 바꾸지 않는다(노션에 붙인 주소가 바뀜).
//   title    목록 화면에 보일 이름
//   db       노션 DB ID 32자리. 노션 데이터가 필요 없는 위젯은 ''
//   readOnly true 면 보여주기만 (추가·수정·삭제 요청을 서버에서 막음)
//   fields   화면에서 쓸 속성 이름 (노션 DB 속성 이름과 똑같이). 이름은 자유롭게 늘려도 된다
//   query    가져올 줄 (노션 API query 형식). 'TODAY' 는 서버가 한국 오늘 날짜로 바꿔 넣는다
//            예) 이번 달 한 줄 = { sorts: [{ property: '시작일', direction: 'descending' }], filter: { property: '시작일', date: { on_or_before: 'TODAY' } }, page_size: 1 }
//   demo     미리보기용 가짜 데이터 (진짜 개인 데이터 금지)
//   html     ③의 화면
const WIDGETS = {
  memo: {
    title: '메모',
    db: '',
    readOnly: false,
    fields: { title: '내용', done: '완료' },
    query: { page_size: 50, sorts: [{ timestamp: 'created_time', direction: 'descending' }] },
    demo: [
      { id: 'demo1', 내용: '예시 항목 하나', 완료: false },
      { id: 'demo2', 내용: '예시 항목 둘', 완료: true },
    ],
    html: HTML_memo,
  },
};

// ===== ⑤ 서버 (보통 고칠 필요 없음) =====
const NV = '2022-06-28';
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const page = (h, s = 200) => new Response(h, { status: s, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cleanId = (s) => String(s || '').trim().replace(/-/g, '');
const usesNotion = (w) => !!cleanId(w.db);
const anyNotion = () => Object.values(WIDGETS).some(usesNotion);

async function notion(env, path, method = 'GET', body) {
  const r = await fetch('https://api.notion.com/v1/' + path, {
    method, body: body && JSON.stringify(body),
    headers: { Authorization: 'Bearer ' + env.NOTION_TOKEN.trim(), 'Notion-Version': NV, 'Content-Type': 'application/json' },
  });
  const j = await r.json();
  if (!r.ok) throw new Error('노션 연결 실패: ' + (j.message || r.status));
  return j;
}

// 노션 속성 -> 단순 값
function flat(p) {
  switch (p.type) {
    case 'title': case 'rich_text': return p[p.type].map(t => t.plain_text).join('');
    case 'number': return p.number;
    case 'checkbox': return p.checkbox;
    case 'select': case 'status': return p[p.type]?.name ?? null;
    case 'multi_select': return p.multi_select.map(o => o.name);
    case 'date': return p.date?.start ?? null;
    case 'url': case 'email': case 'phone_number': return p[p.type];
    case 'created_time': case 'last_edited_time': return p[p.type];
    case 'formula': { const f = p.formula; return f[f.type]; }
    case 'rollup': { const r = p.rollup; return r.type === 'array' ? r.array.map(flat) : r[r.type]; }
    default: return null;
  }
}
// 단순 값 -> 노션 속성 (DB 스키마의 타입을 보고)
function unflat(type, v) {
  switch (type) {
    case 'title': case 'rich_text': return { [type]: [{ text: { content: String(v ?? '') } }] };
    case 'number': return { number: v === '' || v == null ? null : Number(v) };
    case 'checkbox': return { checkbox: !!v };
    case 'select': return { select: v ? { name: String(v) } : null };
    case 'status': return { status: v ? { name: String(v) } : null };
    case 'multi_select': return { multi_select: (v || []).map(n => ({ name: n })) };
    case 'date': return { date: v ? { start: v } : null };
    case 'url': case 'email': case 'phone_number': return { [type]: v || null };
    default: return null; // 계산식·롤업 등은 쓰기 불가
  }
}
async function toProps(env, db, data) {
  const schema = (await notion(env, 'databases/' + db)).properties;
  const props = {};
  for (const [k, v] of Object.entries(data || {})) if (schema[k]) { const u = unflat(schema[k].type, v); if (u) props[k] = u; }
  return props;
}
function buildQuery(w) {
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // 한국 날짜
  return JSON.parse(JSON.stringify(w.query || {}).replaceAll('"TODAY"', JSON.stringify(today)));
}

// ----- 키 확인 -----
// 주소의 k= 값 (+ 가 띄어쓰기로 바뀌지 않게 직접 읽음). 없으면 null
function urlKey(search) {
  const m = /[?&]k=([^&#]*)/.exec(search);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}
// 맞으면 null, 틀리면 이유 (비밀값 자체는 절대 보여주지 않음)
function keyProblem(key, secret) {
  if (!key) return '주소에 ?k= 값이 없어요. 위젯 주소 끝에 ?k=<WIDGET_SECRET 값> 을 붙여요.';
  if (key === secret) return null;
  if (/[^A-Za-z0-9]/.test(secret)) return 'WIDGET_SECRET 에 영문·숫자가 아닌 글자(띄어쓰기, + & # % 등)가 있어서 주소에서 깨져요. 영문+숫자로만 새로 정해서 Cloudflare와 주소 둘 다 바꿔요.';
  if (/\s/.test(key)) return '주소의 키에 띄어쓰기가 들어 있어요. 복사할 때 공백이 따라왔는지 확인해요.';
  if (key.length !== secret.length) return '주소의 키와 WIDGET_SECRET 의 길이가 달라요. 복사할 때 앞뒤가 잘렸거나, 서로 다른 값이에요. 같은 값을 다시 복사해 두 곳에 넣어요.';
  return '길이는 같은데 글자가 달라요. 대소문자나 비슷한 글자(0/O, l/1/I)를 확인해요.';
}

// ----- 점검 화면 -----
// Cloudflare 설정을 AI가 직접 못 보니, 위젯이 스스로 어디가 막혔는지 알려준다. 토큰·비밀번호 값은 나오지 않는다.
async function diagnose(names, url, env) {
  const rows = [];
  const add = (ok, title, detail = '') => rows.push({ ok, title, detail });
  const targets = names.map(n => [n, WIDGETS[n]]);
  if (!targets.some(([, w]) => usesNotion(w))) { add(true, '노션 데이터를 쓰지 않는 위젯이에요', '비밀값 없이 주소만 임베드하면 돼요.'); return rows; }
  const miss = ['NOTION_TOKEN', 'WIDGET_SECRET'].filter(k => !(env[k] || '').trim());
  if (miss.length) { add(false, '비밀값이 빠졌어요: ' + miss.join(', '), 'Cloudflare 설정 → 변수 및 비밀에서 이름 철자(대문자·밑줄)를 확인하고, 넣은 뒤 다시 배포됐는지 확인해요.'); return rows; }
  add(true, '비밀값 2개가 다 있어요');
  const kp = keyProblem(urlKey(url.search), env.WIDGET_SECRET.trim());
  if (kp) { add(false, '주소의 키가 맞지 않아요', kp); return rows; }
  add(true, '주소의 키가 맞아요');
  try { await notion(env, 'users/me'); add(true, '노션 토큰이 맞아요'); }
  catch (e) { add(false, '노션 토큰이 맞지 않아요', 'NOTION_TOKEN 에 노션 연결의 API token(ntn_ 로 시작)을 앞뒤 공백 없이 다시 넣어요. ' + e.message); return rows; }
  for (const [name, w] of targets) {
    const tag = `[/${name}] `;
    if (!usesNotion(w)) { add(true, tag + '노션 데이터를 쓰지 않는 위젯이에요'); continue; }
    const db = cleanId(w.db);
    if (!/^[0-9a-f]{32}$/i.test(db)) { add(false, tag + 'DB ID 모양이 이상해요', 'worker.js 의 db 값이 32자리 ID가 아니에요. 이 화면을 클로드 코드에 보여주고 고쳐 달라고 해요.'); continue; }
    let schema;
    try {
      const d = await notion(env, 'databases/' + db);
      schema = d.properties;
      add(true, tag + '노션 DB를 읽을 수 있어요: ' + (d.title || []).map(t => t.plain_text).join(''));
    } catch (e) {
      add(false, tag + '노션 DB에 들어갈 수 없어요', '그 DB(또는 그 위 페이지) ··· → 연결 → 연결 추가하기로 이 토큰의 연결을 추가했는지 확인해요. ' + e.message);
      continue;
    }
    const missing = Object.values(w.fields || {}).filter(n => !schema[n]);
    if (missing.length) add(false, tag + 'DB에 없는 속성: ' + missing.join(', '), 'DB에 있는 속성: ' + Object.keys(schema).join(', ') + ' — 이 화면을 클로드 코드에 보여주고 worker.js 를 고쳐 달라고 해요.');
    else add(true, tag + '위젯이 쓰는 속성이 DB에 다 있어요');
    try { const r = await notion(env, `databases/${db}/query`, 'POST', buildQuery(w)); add(true, tag + `목록 읽기 성공 (${r.results.length}줄)` + (w.readOnly ? ' · 보기 전용' : ' · 읽기·쓰기')); }
    catch (e) { add(false, tag + '목록 읽기 실패', '가져올 줄 조건(query)이 DB와 안 맞아요. ' + e.message); }
  }
  return rows;
}
const shell = (title, body) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>body{font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;margin:16px;line-height:1.5;color:#333;background:#fff}
ul{padding:0}li{list-style:none;margin:10px 0}small{color:#666;display:block;margin-left:1.6em}code{background:#f3f3f3;padding:2px 6px;border-radius:4px;overflow-wrap:anywhere}
iframe{border:1px dashed #ccc;width:100%;max-width:640px;height:380px;display:block;margin:6px 0 20px}</style></head><body>${body}</body></html>`;
const checkPage = (rows) => shell('위젯 점검', `<h3>위젯 점검</h3><ul>${rows.map(r => `<li>${r.ok ? '✅' : '❌'} <b>${esc(r.title)}</b>${r.detail ? `<small>${esc(r.detail)}</small>` : ''}</li>`).join('')}</ul>
<p><small>이 화면을 캡처하거나 글자를 복사해서 클로드 코드에 보여주면 고칠 곳을 알려줘요. 토큰·비밀번호 값은 이 화면에 나오지 않아요.</small></p>`);
// 목록: 노션에 붙일 주소 / ?demo=1 이면 모든 위젯 미리보기
const indexPage = (origin, demo) => demo
  ? shell('위젯 미리보기', '<h3>이 페이지 위젯 미리보기 (가짜 데이터)</h3>' + Object.entries(WIDGETS).map(([n, w]) =>
      `<p><b>${esc(w.title)}</b> <code>/${esc(n)}</code></p><iframe src="/${encodeURIComponent(n)}?demo=1"></iframe>`).join(''))
  : shell('위젯 목록', '<h3>이 Worker의 위젯</h3><ul>' + Object.entries(WIDGETS).map(([n, w]) =>
      `<li><b>${esc(w.title)}</b><small>노션에 붙일 주소: <code>${esc(origin)}/${esc(n)}${usesNotion(w) ? '?k=&lt;WIDGET_SECRET 값&gt;' : ''}</code></small></li>`).join('') +
    '</ul><p><small>미리보기: 주소 끝에 ?demo=1 · 안 될 때: 위젯 주소 끝에 &amp;check=1</small></p>');
const render = (name, w) => w.html.replace('/*__CONFIG__*/null', JSON.stringify({ name, fields: w.fields || {} }));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch { return s; } });
    const check = url.searchParams.get('check') === '1';

    // 화면
    if (parts[0] !== 'api') {
      const name = parts[0] || '';
      if (!name) return page(check ? checkPage(await diagnose(Object.keys(WIDGETS), url, env)) : indexPage(url.origin, url.searchParams.get('demo') === '1'));
      const w = Object.hasOwn(WIDGETS, name) ? WIDGETS[name] : null;
      if (!w) return page(shell('없는 위젯', `<p>/${esc(name)} 위젯이 없어요. 있는 위젯: ${Object.keys(WIDGETS).map(n => '/' + esc(n)).join(', ')}</p>`), 404);
      return page(check ? checkPage(await diagnose([name], url, env)) : render(name, w));
    }

    // 노션 중간 서버: /api/<이름>/items[/<id>]
    const name = parts[1];
    const w = Object.hasOwn(WIDGETS, name || '') ? WIDGETS[name] : null;
    if (!w || parts[2] !== 'items') return json({ error: '없는 위젯이에요' }, 404);
    if (url.searchParams.get('demo') === '1') return json({ items: w.demo || [] });
    if (!usesNotion(w)) return json({ items: [] });
    if (!(env.NOTION_TOKEN || '').trim() || !(env.WIDGET_SECRET || '').trim()) return json({ error: '서버 설정이 아직 안 됐어요 (비밀값)' }, 503);
    if (keyProblem(request.headers.get('x-widget-key'), env.WIDGET_SECRET.trim())) return json({ error: '키가 맞지 않아요' }, 401);

    const db = cleanId(w.db);
    const id = parts[3];
    try {
      if (request.method === 'GET' && !id) {
        const r = await notion(env, `databases/${db}/query`, 'POST', buildQuery(w));
        return json({ items: r.results.map(pg => ({ id: pg.id, ...Object.fromEntries(Object.entries(pg.properties).map(([k, p]) => [k, flat(p)])) })) });
      }
      if (w.readOnly) return json({ error: '보기 전용 위젯이에요' }, 405); // 추가·수정·삭제 모두 막음
      if (request.method === 'POST' && !id) {
        const pg = await notion(env, 'pages', 'POST', { parent: { database_id: db }, properties: await toProps(env, db, await request.json()) });
        return json({ id: pg.id });
      }
      if (!id) return json({ error: '지원하지 않는 요청' }, 405);
      // 이 위젯의 DB에 속한 줄만 고칠 수 있게 (다른 위젯·다른 DB의 줄은 못 건드림)
      if (!/^[0-9a-f-]{32,36}$/i.test(id)) return json({ error: '잘못된 항목' }, 400);
      const cur = await notion(env, 'pages/' + id);
      if (cleanId(cur.parent?.database_id) !== db) return json({ error: '이 위젯의 항목이 아니에요' }, 403);
      if (request.method === 'PATCH') {
        await notion(env, 'pages/' + id, 'PATCH', { properties: await toProps(env, db, await request.json()) });
        return json({ ok: true });
      }
      if (request.method === 'DELETE') {
        await notion(env, 'pages/' + id, 'PATCH', { archived: true }); // 노션 휴지통으로
        return json({ ok: true });
      }
      return json({ error: '지원하지 않는 요청' }, 405);
    } catch (e) {
      return json({ error: e.message }, 502);
    }
  },
};
