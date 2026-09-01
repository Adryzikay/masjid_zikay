const burger = document.getElementById('burgerBtn');
const navLinks = document.getElementById('navLinks');

if (burger && navLinks) {
  burger.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => navLinks.classList.remove('open')));
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const KL_LAT = 3.1660;
const KL_LNG = 101.6975;
const JAKIM_METHOD = 17;

let prayers = [
  { name: 'Subuh', h: 5, m: 58 },
  { name: 'Syuruk', h: 7, m: 18 },
  { name: 'Zohor', h: 13, m: 23 },
  { name: 'Asar', h: 16, m: 44 },
  { name: 'Maghrib', h: 19, m: 23 },
  { name: 'Isyak', h: 20, m: 33 }
];
let lastFetchedDateKey = null;

function fmt(h, m) {
  const period = h >= 12 ? 'PM' : 'AM';
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${String(m).padStart(2, '0')} ${period}`;
}

function parseHM(raw) {
  const clean = raw.split(' ')[0];
  const [h, m] = clean.split(':').map(Number);
  return { h, m };
}

function todayDateKeyAndUrl() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const dateKey = `${yyyy}-${mm}-${dd}`;
  const dateParam = `${dd}-${mm}-${yyyy}`;
  return {
    dateKey,
    url: `https://api.aladhan.com/v1/timings/${dateParam}?latitude=${KL_LAT}&longitude=${KL_LNG}&method=${JAKIM_METHOD}&timezonestring=Asia/Kuala_Lumpur`
  };
}

function setSourceNote(text) {
  document.querySelectorAll('.solat-note').forEach((el) => {
    el.textContent = text;
  });
}

async function fetchTodayPrayerTimes() {
  const { dateKey, url } = todayDateKeyAndUrl();
  if (dateKey === lastFetchedDateKey) return;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Respons tidak OK');
    const data = await res.json();
    const t = data.data.timings;

    prayers = [
      { name: 'Subuh', ...parseHM(t.Fajr) },
      { name: 'Syuruk', ...parseHM(t.Sunrise) },
      { name: 'Zohor', ...parseHM(t.Dhuhr) },
      { name: 'Asar', ...parseHM(t.Asr) },
      { name: 'Maghrib', ...parseHM(t.Maghrib) },
      { name: 'Isyak', ...parseHM(t.Isha) }
    ];
    lastFetchedDateKey = dateKey;

    const today = new Date();
    setSourceNote(
      `Waktu solat dikemas kini automatik setiap hari mengikut kaedah JAKIM bagi kawasan Kuala Lumpur (${today.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}). Solat Jumaat bermula jam 1:15 petang setiap minggu.`
    );
  } catch (err) {
    setSourceNote(
      'Tidak dapat menyambung ke sumber waktu solat sekarang — waktu di atas adalah anggaran sementara. Sila pastikan sambungan internet aktif, atau semak jadual rasmi JAKIM/JAWI.'
    );
  }

  renderSolatGrid();
  updatePrayerState();
}

function renderSolatGrid() {
  document.querySelectorAll('.solat-cell').forEach((cell) => {
    const name = cell.getAttribute('data-name');
    const p = prayers.find((pr) => pr.name === name);
    if (p) {
      const timeEl = cell.querySelector('.time');
      if (timeEl) timeEl.textContent = fmt(p.h, p.m);
    }
  });
}

function updatePrayerState() {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  let next = null;
  let activeName = null;
  for (let i = 0; i < prayers.length; i++) {
    const mins = prayers[i].h * 60 + prayers[i].m;
    if (mins <= nowMins) activeName = prayers[i].name;
    if (mins > nowMins && next === null) next = prayers[i];
  }
  if (!next) next = prayers[0];

  document.querySelectorAll('.solat-cell').forEach((cell) => {
    cell.classList.toggle('active', cell.getAttribute('data-name') === activeName);
  });

  const nameEl = document.getElementById('nextPrayerName');
  const timeEl = document.getElementById('nextPrayerTime');
  const countEl = document.getElementById('countdownText');

  if (nameEl) nameEl.textContent = next.name;
  if (timeEl) timeEl.textContent = fmt(next.h, next.m);

  if (countEl) {
    let target = new Date(now);
    target.setHours(next.h, next.m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const diffMs = target - now;
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    countEl.textContent = `${hrs} jam ${mins} minit lagi`;
  }
}

if (document.querySelector('.solat-cell') || document.getElementById('nextPrayerName')) {
  renderSolatGrid();
  updatePrayerState();
  fetchTodayPrayerTimes();
  setInterval(updatePrayerState, 30000);
  setInterval(fetchTodayPrayerTimes, 60000);
}
