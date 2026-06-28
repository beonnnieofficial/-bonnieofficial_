const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1aAyI6iVaNDvBRWbwCvd8nMnBMrRMQPoxXR6Kix-iFvb9tDCXJDugY3NalvvY5ZSjIA8uGmJdCcpm/pub?output=csv&gid=0";
const GID = { config:0, slider:214809573, works:326427666, news:2006339432, socials:1571914792, videos:1639743877, schedule:1512851118, youtube:1689560596, contact:1062772734, rewards:1847071245 };
let scheduleDates=[], sliderImages=[], sliderIndex=0, sliderTimer;

function getSheetUrl(gid) { return SHEET_URL.replace(/gid=\d+/, "gid=" + gid); }

async function fetchCSV(gid) {
  const cacheKey = "csv_data_" + gid;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout

  try {
    const res = await fetch(getSheetUrl(gid) + "&t=" + Date.now(), { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const text = await res.text();
    const data = text.trim().split("\n").slice(1).map(row => row.split(",").map(c => c.trim().replace(/^"|"$/g, ""))).filter(r => r[0]);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage quota exceeded or disabled", e);
    }
    return data;
  } catch(e) {
    clearTimeout(timeoutId);
    console.error("Fetch failed for GID " + gid + ", returning cache if available", e);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch(err) {
      console.error("Cache read failed", err);
    }
    return [];
  }
}

async function loadDataAndRender(gid, renderFn) {
  const cacheKey = "csv_data_" + gid;
  let cachedData = null;

  // 1. Try to load from cache and render immediately
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      cachedData = JSON.parse(cached);
      renderFn(cachedData);
    }
  } catch(e) {
    console.error("Failed to read cache for GID " + gid, e);
  }

  // 2. Fetch from network in background
  try {
    const data = await fetchCSV(gid);
    if (data && data.length) {
      renderFn(data);
      return data;
    }
  } catch(e) {
    console.warn("loadDataAndRender network/render failed for GID " + gid, e);
  }
  
  if (!cachedData) {
    renderFn([]);
  }
  return cachedData || [];
}

function convertDriveUrl(url) {
  if (!url) return "";
  const m = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return "https://lh3.googleusercontent.com/d/" + m[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m2) return "https://lh3.googleusercontent.com/d/" + m2[1];
  return url;
}

function renderConfig(rows) {
  const cfg = {};
  rows.forEach(r => { if(r[0] && r[1] && !cfg[r[0].trim()]) cfg[r[0].trim()] = r[1].trim(); });

  const profilePhoto = document.getElementById("profile-photo");
  if (profilePhoto && cfg.profile_img_1) profilePhoto.src = convertDriveUrl(cfg.profile_img_1);

  if (cfg.bio) document.getElementById("bio-text").textContent = cfg.bio;
  const logo = document.getElementById("nav-logo");
  if (cfg.site_name) { logo.textContent = cfg.site_name; document.title = cfg.site_name; }
}

async function loadConfig() {
  return loadDataAndRender(GID.config, renderConfig);
}

function renderSlider(rows) {
  const box = document.getElementById("banner-box");
  const dotsEl = document.getElementById("banner-dots");
  if (!box || !dotsEl) return;
  
  // Clear old images to prevent duplicate stacking
  const oldImgs = box.querySelectorAll("img");
  oldImgs.forEach(img => img.remove());
  
  sliderImages = rows.map(r => convertDriveUrl(r[0])).filter(Boolean);
  if (!sliderImages.length) return;
  
  sliderImages.forEach((src, i) => { 
    const img = document.createElement("img"); 
    img.src = src; 
    if (i===0) img.classList.add("active"); 
    box.insertBefore(img, dotsEl); 
  });
  dotsEl.innerHTML = sliderImages.map((_,i) => '<div class="dot' + (i===0?' active':'') + '" onclick="goSlide(' + i + ')"></div>').join("");
  sliderIndex = 0;
  startSlider();
}

async function loadSlider() {
  return loadDataAndRender(GID.slider, renderSlider);
}

function goSlide(i) {
  const imgs = document.querySelectorAll("#banner-box img");
  const dots = document.querySelectorAll("#banner-dots .dot");
  if (!imgs.length) return;
  imgs.forEach(el => el.classList.remove("active")); dots.forEach(el => el.classList.remove("active"));
  sliderIndex = (i + sliderImages.length) % sliderImages.length;
  imgs[sliderIndex].classList.add("active"); dots[sliderIndex].classList.add("active");
}

function startSlider() {
  if (sliderImages.length < 2) return;
  clearInterval(sliderTimer); sliderTimer = setInterval(() => goSlide(sliderIndex + 1), 3000);
  const box = document.getElementById("banner-box");
  if (!box || box.dataset.listenersAttached) return;
  box.dataset.listenersAttached = "1";
  let startX=0;
  box.addEventListener("touchstart", e => { startX=e.touches[0].clientX; }, {passive:true});
  box.addEventListener("touchend", e => { const diff=startX-e.changedTouches[0].clientX; if (Math.abs(diff)>40) { clearInterval(sliderTimer); goSlide(sliderIndex+(diff>0?1:-1)); startSlider(); } }, {passive:true});
  let mouseStartX=0, dragging=false;
  box.addEventListener("mousedown", e => { mouseStartX=e.clientX; dragging=true; });
  box.addEventListener("mouseup", e => { if (!dragging) return; dragging=false; const diff=mouseStartX-e.clientX; if (Math.abs(diff)>40) { clearInterval(sliderTimer); goSlide(sliderIndex+(diff>0?1:-1)); startSlider(); } });
}

const seriesData = [
  {
    title: "Us รักของเรา (Dokrak)",
    year: "2025",
    role: "Main Role",
    image: "https://drive.google.com/file/d/12lIyWRLK0O1iFP1L3qMQIdk9Th6JwjJG/view?usp=drive_link",
    watch: "https://youtu.be/1EauB0mRMGo?si=V4Qyc9bWZ4E5vwuB",
    trailer: "https://youtu.be/E2KFC2etiWc?si=F2VLBdmCrYcwCGAn"
  },
  {
    title: "Me and Thee (Lookplub)",
    year: "2025",
    role: "Support Role",
    image: "https://drive.google.com/file/d/1zcvyxseqir_zmjy80IqDSIex1t4pkjyQ/view?usp=drive_link",
    watch: "https://youtu.be/87ZIk_zLP34?si=v_WpvXnOODFwOYKD",
    trailer: "https://youtu.be/PXqpISTPse8?si=UpfrfsFT4B_dubX4"
  },
  {
    title: "Peach and Me (Lookplub)",
    year: "2026",
    role: "Support Role",
    image: "https://drive.google.com/file/d/1SSYfrjnjnL-KnbFIeRH8DrMYCa-483ZO/view?usp=drive_link",
    watch: "",
    trailer: "https://youtu.be/YbFd6ZTFQ9g?si=AB7NQ68qWT6Odpj6"
  },
  {
    title: "Moon Shadow (Key)",
    year: "Upcoming",
    role: "Main Role",
    image: "https://drive.google.com/file/d/1K2XKuMqpNS87UzfGJEy39zb84DQlweL1/view?usp=drive_link",
    watch: "",
    trailer: "https://youtu.be/LMKBoo8bvaw?si=zX-KQ21o5McNJu_Q"
  },
  {
    title: "Girl Rules (Baipor)",
    year: "2026",
    role: "Support Role",
    image: "https://drive.google.com/file/d/1Yqxb6bKXySHjBByzzQkr7_83l6ndNq1a/view?usp=drive_link",
    watch: "",
    trailer: "https://youtu.be/lDUD3omAlHA?si=v7aZsNULrgbGzpSs",
    imageStyle: "object-position: 30% center;"
  },
  {
    title: "High School Frenemy (Peeta)",
    year: "2024",
    role: "Support Role",
    image: "https://drive.google.com/file/d/16wvUoCwGzvFEq2Jv66oChFEelrbEem3K/view?usp=drive_link",
    watch: "https://youtu.be/sJ0VRF8L5HI?si=VrHYdQWK0wbViqVc",
    trailer: "https://youtu.be/z0Svp4enGDc?si=p8wZZIR7fnMhG1tG"
  }
];

let activeSeriesFilter = "All";

function showToast(msg) {
  const oldToast = document.getElementById("custom-toast");
  if (oldToast) oldToast.remove();

  const toast = document.createElement("div");
  toast.id = "custom-toast";
  toast.style.position = "fixed";
  toast.style.bottom = "24px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%) translateY(20px)";
  toast.style.background = "rgba(147, 51, 234, 0.95)";
  toast.style.color = "#ffffff";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "30px";
  toast.style.fontSize = "12px";
  toast.style.fontWeight = "700";
  toast.style.zIndex = "9999";
  toast.style.boxShadow = "0 8px 24px rgba(123, 44, 191, 0.35)";
  toast.style.transition = "transform 0.3s ease, opacity 0.3s ease";
  toast.style.opacity = "0";
  toast.style.pointerEvents = "none";
  toast.style.whiteSpace = "nowrap";
  toast.style.backdropFilter = "blur(4px)";
  toast.textContent = msg;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = "translateX(-50%) translateY(0)";
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(20px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function renderSeriesStats() {
  const statsBoard = document.getElementById("series-stats-board");
  if (!statsBoard) return;

  const totalWorks = seriesData.length;
  const mainRoles = seriesData.filter(s => s.role === "Main Role").length;
  const supportRoles = seriesData.filter(s => s.role === "Support Role").length;
  const upcoming = seriesData.filter(s => s.year === "Upcoming").length;

  statsBoard.innerHTML = `
    <div class="series-stat-col">
      <div class="series-stat-icon"><i class="fa-regular fa-clapperboard"></i></div>
      <div class="series-stat-num">${totalWorks}</div>
      <div class="series-stat-label">Works</div>
    </div>
    <div class="series-stat-col">
      <div class="series-stat-icon"><i class="fa-regular fa-star"></i></div>
      <div class="series-stat-num">${mainRoles}</div>
      <div class="series-stat-label">Main Roles</div>
    </div>
    <div class="series-stat-col">
      <div class="series-stat-icon"><i class="fa-regular fa-heart"></i></div>
      <div class="series-stat-num">${supportRoles}</div>
      <div class="series-stat-label">Supporting Role</div>
    </div>
    <div class="series-stat-col">
      <div class="series-stat-icon">
        <div class="calendar-question-icon">
          <i class="fa-regular fa-calendar"></i>
          <span class="question-mark">?</span>
        </div>
      </div>
      <div class="series-stat-num">${upcoming}</div>
      <div class="series-stat-label">Upcoming</div>
    </div>
  `;
}

function renderSeriesFilters() {
  const filterBar = document.getElementById("series-filter-bar");
  if (!filterBar) return;

  const filters = ["All", "Main Role", "Support Role"];
  filterBar.innerHTML = filters.map(f => {
    const activeClass = f === activeSeriesFilter ? "active" : "";
    return `<button class="series-filter-btn ${activeClass}" onclick="setSeriesFilter('${f}')">${f}</button>`;
  }).join("");
}

function setSeriesFilter(filter) {
  activeSeriesFilter = filter;
  renderSeriesFilters();
  renderSeriesCards();
}

function renderSeriesCards() {
  const grid = document.getElementById("series-grid");
  if (!grid) return;

  const filtered = seriesData.filter(s => {
    if (activeSeriesFilter === "All") return true;
    return s.role === activeSeriesFilter;
  });

  grid.innerHTML = filtered.map(s => {
    const watchAttr = s.watch ? `href="${s.watch}" target="_blank"` : `href="javascript:void(0)" onclick="showToast('ผลงานนี้ยังไม่เปิดให้รับชม / Streaming link coming soon')"`;
    const trailerAttr = s.trailer ? `href="${s.trailer}" target="_blank"` : `href="javascript:void(0)" onclick="showToast('ทีเซอร์ยังไม่เปิดเผย / Teaser not yet available')"`;

    return `
      <div class="series-card">
        <div class="series-card-photo">
          <img src="${convertDriveUrl(s.image)}" alt="${s.title}" loading="lazy" ${s.imageStyle ? `style="${s.imageStyle}"` : ""}>
        </div>
        <div class="series-card-details">
          <h3 class="series-card-title">${s.title}</h3>
          <div class="series-card-meta">
            <span class="series-card-year">${s.year}</span>
            <span class="series-card-dot">•</span>
            <span class="series-card-role-badge">${s.role}</span>
          </div>
          <div class="series-card-buttons">
            <a ${watchAttr}>
              <i class="fa-solid fa-play"></i> Watch
            </a>
            <a ${trailerAttr}>
              Trailer
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

async function loadWorks() {
  renderSeriesStats();
  renderSeriesFilters();
  renderSeriesCards();
}

function renderNews(rows) {
  const list = document.getElementById("news-list");
  if (!list) return;
  if (!rows.length) { list.innerHTML = "<div class='loading'>ยังไม่มีข้อมูล</div>"; return; }
  list.innerHTML = rows.map(r => '<div class="news-item"><div class="news-date">'+r[0]+'</div><div class="news-title"><a href="'+(r[2]||'#')+'" target="_blank">'+r[1]+'</a></div></div>').join("");
}

async function loadNews() {
  return loadDataAndRender(GID.news, renderNews);
}

function renderSocials(rows) {
  const grid = document.getElementById("social-grid");
  if (!grid) return;
  if (!rows.length) return;
  grid.innerHTML = rows.map(r => {
    const platform=r[0]||"", imageUrl=r[1]||"", link=r[2]||"#", followers=r[3]||"";
    const bar = followers ? '<div class="follower-bar"><span class="follower-count">'+followers+'</span><span class="follower-label">followers</span></div>' : '';
    return '<div><div class="s-name">'+platform+'</div><a href="'+link+'" target="_blank" class="social-link"><div class="social-thumb-wrap"><img src="'+convertDriveUrl(imageUrl)+'" class="social-thumb" alt="'+platform+'">'+bar+'</div></a></div>';
  }).join("");
}

async function loadSocials() {
  return loadDataAndRender(GID.socials, renderSocials);
}

function renderContact(rows) {
  const list = document.getElementById("contact-list");
  if (!list) return;
  if (!rows.length) return;
  list.innerHTML = rows.map(r => { const p=r[0]||"",h=r[1]||"",u=r[2]||"#",ic=r[4]||p.substring(0,2).toUpperCase(); return '<a href="'+u+'" target="_blank" class="contact-item"><div class="contact-icon">'+ic+'</div><div class="contact-info"><div class="contact-platform">'+p+'</div><div class="contact-handle">'+h+'</div></div></a>'; }).join("");
}

async function loadContact() {
  return loadDataAndRender(GID.contact, renderContact);
}

function switchProfileInfo(name, el) {
  document.querySelectorAll(".profile-info-tab").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".profile-info-content").forEach(panel => panel.classList.remove("active"));
  if (el) el.classList.add("active");
  const panel = document.getElementById("profile-info-" + name);
  if (panel) panel.classList.add("active");
  equalizeProfileInfoHeight();
}

function equalizeProfileInfoHeight() {
  const infoPanel = document.querySelector(".profile-info-panel");
  const panels = [...document.querySelectorAll(".profile-info-content")];
  if (!infoPanel || !panels.length) return;

  infoPanel.style.setProperty("--profile-info-content-height", "auto");
  const current = panels.find(panel => panel.classList.contains("active"));
  let maxHeight = 0;

  panels.forEach(panel => {
    const wasActive = panel === current;
    const previous = {
      display: panel.style.display,
      position: panel.style.position,
      visibility: panel.style.visibility,
      pointerEvents: panel.style.pointerEvents,
      inset: panel.style.inset,
      width: panel.style.width
    };

    if (!wasActive) {
      panel.style.display = "block";
      panel.style.position = "absolute";
      panel.style.visibility = "hidden";
      panel.style.pointerEvents = "none";
      panel.style.inset = "auto";
      panel.style.width = infoPanel.clientWidth + "px";
    }

    maxHeight = Math.max(maxHeight, Math.ceil(panel.getBoundingClientRect().height));

    if (!wasActive) {
      panel.style.display = previous.display;
      panel.style.position = previous.position;
      panel.style.visibility = previous.visibility;
      panel.style.pointerEvents = previous.pointerEvents;
      panel.style.inset = previous.inset;
      panel.style.width = previous.width;
    }
  });

  if (maxHeight > 0) {
    infoPanel.style.setProperty("--profile-info-content-height", maxHeight + "px");
  }
}

window.addEventListener("resize", () => {
  clearTimeout(window.profileInfoResizeTimer);
  window.profileInfoResizeTimer = setTimeout(equalizeProfileInfoHeight, 120);
});

function showPage(page, el) {
  const target = document.getElementById("page-" + page);
  if (!target) return;
  document.querySelectorAll('[id^="page-"]').forEach(section => {
    section.hidden = section.id !== "page-" + page;
  });
  document.querySelectorAll(".sidebar a").forEach(a => a.classList.remove("active-menu"));
  if (el) el.classList.add("active-menu");
}

function getYoutubeThumbnail(url) {
  if (!url) return "";
  const m = url.match(/(?:v=|youtu\.be\/|live\/)([^&?\/]+)/);
  return m ? "https://img.youtube.com/vi/" + m[1] + "/maxresdefault.jpg" : "";
}

async function loadVideos() {
  const cacheKeyVideos = "csv_data_" + GID.videos;
  const cacheKeyYoutube = "csv_data_" + GID.youtube;

  function renderVids(rows) {
    const ytGrid = document.getElementById("yt-grid");
    if (ytGrid && rows.length) ytGrid.innerHTML = rows.map(r => { const url=r[0]||"",title=r[1]||"",id=(url.match(/(?:v=|youtu\.be\/|live\/)([^&?\/]+)/)||[])[1]||""; return '<a href="'+url+'" target="_blank" class="yt-link"><img src="'+getYoutubeThumbnail(url)+'" class="yt-thumb" alt="'+title+'" onerror="this.onerror=null;this.src=\'https://img.youtube.com/vi/'+id+'/hqdefault.jpg\'">'+(title?'<div class="yt-title">'+title+'</div>':'')+'</a>'; }).join("");
  }

  function renderYtPage(rows) {
    const ytPageGrid = document.getElementById("yt-page-grid");
    if (ytPageGrid && rows.length) ytPageGrid.innerHTML = rows.map(r => { const url=r[0]||"",title=r[1]||"",id=(url.match(/(?:v=|youtu\.be\/|live\/)([^&?\/]+)/)||[])[1]||""; return '<a href="'+url+'" target="_blank" class="yt-card"><img src="'+getYoutubeThumbnail(url)+'" alt="'+title+'" onerror="this.onerror=null;this.src=\'https://img.youtube.com/vi/'+id+'/hqdefault.jpg\'"><div class="yt-card-title">'+title+'</div></a>'; }).join("");
  }

  // 1. Try cache first
  try {
    const cachedVids = localStorage.getItem(cacheKeyVideos);
    if (cachedVids) renderVids(JSON.parse(cachedVids));
  } catch(e) {}
  try {
    const cachedYt = localStorage.getItem(cacheKeyYoutube);
    if (cachedYt) renderYtPage(JSON.parse(cachedYt));
  } catch(e) {}

  // 2. Fetch both in parallel
  try {
    const [rows, ytRows] = await Promise.all([
      fetchCSV(GID.videos),
      fetchCSV(GID.youtube)
    ]);
    if (rows && rows.length) renderVids(rows);
    if (ytRows && ytRows.length) renderYtPage(ytRows);
  } catch(e) {
    console.warn("loadVideos network/render failed", e);
  }
}

let scheduleEvents = [];
let selectedScheduleDate = formatDateKey(new Date());

function formatDateKey(date) {
  return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,'0')+"-"+String(date.getDate()).padStart(2,'0');
}

function renderSchedule(rows) {
  scheduleEvents = rows.filter(r => r[0]).map(r => ({ date:r[0],title:r[1]||'',location:(r[2]==='-'?'':r[2])||'',time:(r[3]==='-'?'':r[3])||'',livestream:(r[4]==='-'?'':r[4])||'',with:(r[5]==='-'?'':r[5])||'',note:(r[6]==='-'?'':r[6])||'' }));
  scheduleDates = [...new Set(scheduleEvents.map(e => e.date))];
  renderCalendar();
  if (selectedScheduleDate) showEvents(selectedScheduleDate);
}

async function loadSchedule() {
  return loadDataAndRender(GID.schedule, renderSchedule);
}

function renderRewards(rows) {
  const tbody = document.getElementById("rewards-list");
  const thead = document.getElementById("rewards-thead");
  if (!tbody) return;
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="3" class="rewards-empty">ยังไม่มีข้อมูล</td></tr>'; return; }
  const hasEvent = rows.some(r => r[2]);
  if (thead && hasEvent) thead.innerHTML = '<th>Award</th><th>Event</th><th>Date</th>';
  else if (thead) thead.innerHTML = '<th>Award</th><th>Date</th>';
  tbody.innerHTML = rows.map(r => hasEvent ? '<tr><td>'+(r[0]||'')+'</td><td>'+(r[2]||'')+'</td><td class="nowrap">'+(r[1]||'')+'</td></tr>' : '<tr><td>'+(r[0]||'')+'</td><td class="nowrap">'+(r[1]||'')+'</td></tr>').join("");
}

async function loadRewards() {
  return loadDataAndRender(GID.rewards, renderRewards);
}

function closePopup() {}

function showEvents(dateStr) {
  selectedScheduleDate = dateStr;
  const events = scheduleEvents.filter(e => e.date===dateStr);
  const list = document.getElementById("schedule-detail-list");
  const dateTitle = document.getElementById("schedule-detail-date");
  const [y,m,d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (!list) return;
  
  const dateStrFormatted = d + " " + months[parseInt(m)-1] + " " + y;
  if (dateTitle) dateTitle.textContent = dateStrFormatted;

  list.innerHTML = !events.length
    ? `<div class="event-empty"><div class="event-item-date" style="margin-bottom: 6px; text-align: center;">${dateStrFormatted}</div>ไม่มีงานในวันนี้<br><span>No events scheduled for this day.</span></div>`
    : events.map(e => {
        const cleanTime = e.time ? e.time.replace(/\s*\(th\)/i, '') : '';
        const timeBadge = cleanTime ? `<span class="event-item-time">${cleanTime}</span>` : '';
        
        let liveVal = e.livestream || '-';
        if (liveVal !== '-' && (liveVal.startsWith('http://') || liveVal.startsWith('https://'))) {
          liveVal = `<a href="${liveVal}" target="_blank" class="event-link">${liveVal}</a>`;
        }

        const calendarIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" style="width: 1em; height: 1em;"><path d="M152 24c0-13.3-10.7-24-24-24s-24 10.7-24 24V64H64C28.7 64 0 92.7 0 128v320c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64h-40V24c0-13.3-10.7-24-24-24s-24 10.7-24 24V64H152V24zM48 160h352v288c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V160zm80 80c0-8.8 7.2-16 16-16h176c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16zm0 96c0-8.8 7.2-16 16-16h176c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16z"/></svg>`;
        const titleRow = `
          <div class="e-row">
            <span class="e-icon-wrap">${calendarIconSvg}</span>
            <span class="e-colon">:</span>
            <span class="e-value e-title-val">${e.title || '-'}</span>
          </div>
        `;
        const locationRow = `
          <div class="e-row">
            <span class="e-icon-wrap"><i class="fa-solid fa-location-dot"></i></span>
            <span class="e-colon">:</span>
            <span class="e-value">${e.location || '-'}</span>
          </div>
        `;
        const withRow = `
          <div class="e-row">
            <span class="e-icon-wrap"><i class="fa-regular fa-circle-user"></i></span>
            <span class="e-colon">:</span>
            <span class="e-value">${e.with || '-'}</span>
          </div>
        `;
        const liveRow = `
          <div class="e-row">
            <span class="e-icon-wrap"><span class="e-live-label">LIVE</span></span>
            <span class="e-colon">:</span>
            <span class="e-value">${liveVal}</span>
          </div>
        `;
        const noteRow = e.note ? `
          <div class="e-row">
            <span class="e-icon-wrap"><i class="fa-regular fa-note-sticky"></i></span>
            <span class="e-colon">:</span>
            <span class="e-value event-note">${e.note}</span>
          </div>
        ` : '';

        return `
          <div class="event-item">
            <div class="event-item-header">
              <span class="event-item-date">${dateStrFormatted}</span>
              ${timeBadge}
            </div>
            <div class="event-item-body">
              ${titleRow}
              ${locationRow}
              ${withRow}
              ${liveRow}
              ${noteRow}
            </div>
          </div>
        `;
      }).join("");

  document.querySelectorAll(".cal-grid .day").forEach(day => day.classList.toggle("selected", day.dataset.date===dateStr));
}

function renderCalendar() {
  const today=new Date(), selMonth=document.getElementById("cal-month"), selYear=document.getElementById("cal-year");
  if (!selMonth.dataset.initialized) {
    selMonth.value=today.getMonth(); selYear.value=today.getFullYear();
    if (![...selYear.options].some(o => parseInt(o.value)===today.getFullYear())) { const opt=document.createElement("option"); opt.value=today.getFullYear(); opt.textContent=today.getFullYear(); selYear.appendChild(opt); selYear.value=today.getFullYear(); }
    selMonth.dataset.initialized="1";
  }
  const month=parseInt(selMonth.value), year=parseInt(selYear.value);
  const firstDay=new Date(year,month,1).getDay(), daysInMonth=new Date(year,month+1,0).getDate();
  let html=["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>'<div class="day-label">'+d+'</div>').join("");
  for (let i=0;i<firstDay;i++) html+='<div class="day muted"></div>';
  for (let d=1;d<=daysInMonth;d++) {
    const ds=year+"-"+String(month+1).padStart(2,'0')+"-"+String(d).padStart(2,'0');
    const isToday=d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
    const isEvent=scheduleDates.includes(ds);
    html+='<div class="day '+(isToday?"today":isEvent?"highlight":"")+(selectedScheduleDate===ds?" selected":"")+'" data-date="'+ds+'" onclick="showEvents(\''+ds+'\')">'+d+(isEvent?'<span class="event-dot"></span>':'')+'</div>';
  }
  const rem=(7-(firstDay+daysInMonth)%7)%7;
  for (let i=1;i<=rem;i++) html+='<div class="day muted">'+i+'</div>';
  document.getElementById("cal-grid").innerHTML=html;
  if (selectedScheduleDate && selectedScheduleDate.startsWith(year+"-"+String(month+1).padStart(2,'0'))) showEvents(selectedScheduleDate);
}

function changeMonth(dir) {
  const sel=document.getElementById("cal-month"), yrSel=document.getElementById("cal-year");
  let m=parseInt(sel.value)+dir, y=parseInt(yrSel.value);
  if (m<0){m=11;y--;} if (m>11){m=0;y++;}
  sel.value=m; yrSel.value=y; renderCalendar();
}

function switchTab(name, el) {
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(t=>t.classList.remove("active"));
  el.classList.add("active"); document.getElementById("tab-"+name).classList.add("active");
}

function slideYt(dir) {
  const grid = document.getElementById("yt-grid");
  if (!grid) return;
  const scrollAmount = grid.clientWidth + 16;
  grid.scrollBy({ left: dir * scrollAmount, behavior: "smooth" });
}

async function init() {
  renderCalendar();

  const hasCache = (() => {
    try {
      return localStorage.getItem("csv_data_" + GID.config) &&
             localStorage.getItem("csv_data_" + GID.schedule) &&
             localStorage.getItem("csv_data_" + GID.slider);
    } catch(e) {
      return false;
    }
  })();

  const hideOverlay = () => {
    const overlay = document.getElementById("loading-overlay");
    if (overlay && !overlay.classList.contains("is-hidden")) {
      overlay.classList.add("is-hidden");
      setTimeout(() => overlay.hidden = true, 300);
    }
  };

  if (hasCache) {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.style.transition = "none";
      overlay.classList.add("is-hidden");
      overlay.hidden = true;
    }
  }

  // Load Priority 1 tasks (either cache or fast network)
  const p1Promises = [
    loadConfig(),
    loadSchedule(),
    loadSlider()
  ];

  // Max 2 seconds timeout to hide overlay if no cache
  const overlayTimeout = new Promise(resolve => setTimeout(resolve, 2000));

  Promise.all(p1Promises).then(() => {
    hideOverlay();
  });

  overlayTimeout.then(() => {
    hideOverlay();
  });

  // Load remaining tasks in the background
  const p2Promises = [
    loadWorks(),
    loadNews(),
    loadSocials(),
    loadVideos(),
    loadContact(),
    loadRewards()
  ];

  Promise.all([...p1Promises, ...p2Promises]).finally(() => {
    requestAnimationFrame(equalizeProfileInfoHeight);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(equalizeProfileInfoHeight);
    }
  });
}

init();
