const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1aAyI6iVaNDvBRWbwCvd8nMnBMrRMQPoxXR6Kix-iFvb9tDCXJDugY3NalvvY5ZSjIA8uGmJdCcpm/pub?output=csv&gid=0";
const GID = { config:0, slider:214809573, works:326427666, news:2006339432, socials:1571914792, videos:1639743877, schedule:1512851118, youtube:1689560596, contact:1062772734, rewards:1847071245 };
let scheduleDates=[], sliderImages=[], sliderIndex=0, sliderTimer;

function getSheetUrl(gid) { return SHEET_URL.replace(/gid=\d+/, "gid=" + gid); }

async function fetchCSV(gid) {
  try {
    const res = await fetch(getSheetUrl(gid) + "&t=" + Date.now());
    const text = await res.text();
    return text.trim().split("\n").slice(1).map(row => row.split(",").map(c => c.trim().replace(/^"|"$/g, ""))).filter(r => r[0]);
  } catch(e) { return []; }
}

function convertDriveUrl(url) {
  if (!url) return "";
  const m = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return "https://lh3.googleusercontent.com/d/" + m[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m2) return "https://lh3.googleusercontent.com/d/" + m2[1];
  return url;
}

async function loadConfig() {
  const rows = await fetchCSV(GID.config);
  const cfg = {};
  rows.forEach(r => { if(r[0] && r[1] && !cfg[r[0].trim()]) cfg[r[0].trim()] = r[1].trim(); });

  const slider = document.getElementById("profile-slider");
  if (slider) {
    let imgs = "", i = 1;
    while (cfg["profile_img_" + i]) { imgs += '<img class="profile-img" src="' + convertDriveUrl(cfg["profile_img_" + i]) + '" alt="Profile ' + i + '">'; i++; }
    if (imgs) { slider.innerHTML = imgs; setTimeout(updateProfileNav, 100); slider.addEventListener("scroll", updateProfileNav, { passive: true }); }
    let isDown=false, startX=0, scrollLeft=0;
    slider.addEventListener("mousedown", e => { isDown=true; startX=e.pageX-slider.offsetLeft; scrollLeft=slider.scrollLeft; slider.classList.add("is-dragging"); });
    slider.addEventListener("mouseleave", () => { isDown=false; slider.classList.remove("is-dragging"); });
    slider.addEventListener("mouseup", () => { isDown=false; slider.classList.remove("is-dragging"); });
    slider.addEventListener("mousemove", e => { if (!isDown) return; e.preventDefault(); slider.scrollLeft=scrollLeft-(e.pageX-slider.offsetLeft-startX); });
  }

  if (cfg.bio) document.getElementById("bio-text").textContent = cfg.bio;
  const logo = document.getElementById("nav-logo");
  if (cfg.site_name) { logo.textContent = cfg.site_name; document.title = cfg.site_name; }
}

async function loadSlider() {
  const rows = await fetchCSV(GID.slider);
  sliderImages = rows.map(r => convertDriveUrl(r[0])).filter(Boolean);
  const box = document.getElementById("banner-box");
  const dotsEl = document.getElementById("banner-dots");
  if (!sliderImages.length) return;
  sliderImages.forEach((src, i) => { const img = document.createElement("img"); img.src = src; if (i===0) img.classList.add("active"); box.insertBefore(img, dotsEl); });
  dotsEl.innerHTML = sliderImages.map((_,i) => '<div class="dot' + (i===0?' active':'') + '" onclick="goSlide(' + i + ')"></div>').join("");
  startSlider();
}

function goSlide(i) {
  const imgs = document.querySelectorAll("#banner-box img");
  const dots = document.querySelectorAll("#banner-dots .dot");
  imgs.forEach(el => el.classList.remove("active")); dots.forEach(el => el.classList.remove("active"));
  sliderIndex = (i + sliderImages.length) % sliderImages.length;
  imgs[sliderIndex].classList.add("active"); dots[sliderIndex].classList.add("active");
}

function startSlider() {
  if (sliderImages.length < 2) return;
  clearInterval(sliderTimer); sliderTimer = setInterval(() => goSlide(sliderIndex + 1), 3000);
  const box = document.getElementById("banner-box");
  let startX=0;
  box.addEventListener("touchstart", e => { startX=e.touches[0].clientX; }, {passive:true});
  box.addEventListener("touchend", e => { const diff=startX-e.changedTouches[0].clientX; if (Math.abs(diff)>40) { clearInterval(sliderTimer); goSlide(sliderIndex+(diff>0?1:-1)); startSlider(); } }, {passive:true});
  let mouseStartX=0, dragging=false;
  box.addEventListener("mousedown", e => { mouseStartX=e.clientX; dragging=true; });
  box.addEventListener("mouseup", e => { if (!dragging) return; dragging=false; const diff=mouseStartX-e.clientX; if (Math.abs(diff)>40) { clearInterval(sliderTimer); goSlide(sliderIndex+(diff>0?1:-1)); startSlider(); } });
}

function getWorksThumbnail(imageUrl, link) {
  if (imageUrl) { const vid=imageUrl.match(/(?:v=|youtu\.be\/|live\/)([a-zA-Z0-9_-]{11})/); if (vid) return "https://img.youtube.com/vi/"+vid[1]+"/maxresdefault.jpg"; if (imageUrl.includes("drive.google.com")) return convertDriveUrl(imageUrl); if (imageUrl.includes("lh3.googleusercontent.com")) return imageUrl; }
  if (link) { const vid=link.match(/(?:v=|youtu\.be\/|live\/)([a-zA-Z0-9_-]{11})/); if (vid) return "https://img.youtube.com/vi/"+vid[1]+"/maxresdefault.jpg"; }
  return imageUrl ? convertDriveUrl(imageUrl) : "";
}

async function loadWorks() {
  const rows = await fetchCSV(GID.works);
  const grid = document.getElementById("works-grid");
  if (!rows.length || !grid) return;
  grid.innerHTML = rows.map(r => { const title=r[0]||"", imageUrl=r[1]||"", link=r[2]||"#", thumb=getWorksThumbnail(imageUrl,link), id=(link.match(/(?:v=|youtu\.be\/|live\/)([^&?\/]+)/)||[])[1]||"", onerror=id?' onerror="this.onerror=null;this.src=\'https://img.youtube.com/vi/'+id+'/hqdefault.jpg\'"':''; return '<div class="work-item"><a href="'+link+'" target="_blank"><img src="'+thumb+'" alt="'+title+'"'+onerror+'></a><div class="work-title">'+title+'</div></div>'; }).join("");
}

async function loadNews() {
  const rows = await fetchCSV(GID.news);
  const list = document.getElementById("news-list");
  if (!rows.length) { list.innerHTML = "<div class='loading'>ยังไม่มีข้อมูล</div>"; return; }
  list.innerHTML = rows.map(r => '<div class="news-item"><div class="news-date">'+r[0]+'</div><div class="news-title"><a href="'+(r[2]||'#')+'" target="_blank">'+r[1]+'</a></div></div>').join("");
}

async function loadSocials() {
  const rows = await fetchCSV(GID.socials);
  if (!rows.length) return;
  document.getElementById("social-grid").innerHTML = rows.map(r => {
    const platform=r[0]||"", imageUrl=r[1]||"", link=r[2]||"#", followers=r[3]||"";
    const bar = followers ? '<div class="follower-bar"><span class="follower-count">'+followers+'</span><span class="follower-label">followers</span></div>' : '';
    return '<div><div class="s-name">'+platform+'</div><a href="'+link+'" target="_blank" class="social-link"><div class="social-thumb-wrap"><img src="'+convertDriveUrl(imageUrl)+'" class="social-thumb" alt="'+platform+'">'+bar+'</div></a></div>';
  }).join("");
}

function updateProfileNav() {
  const s=document.getElementById("profile-slider"), bl=document.querySelector(".profile-nav.left"), br=document.querySelector(".profile-nav.right");
  if (!s||!bl||!br) return;
  bl.classList.toggle("hidden", s.scrollLeft<=4);
  br.classList.toggle("hidden", s.scrollLeft+s.clientWidth>=s.scrollWidth-4);
}

async function loadContact() {
  const rows = await fetchCSV(GID.contact);
  const list = document.getElementById("contact-list");
  if (!rows.length||!list) return;
  list.innerHTML = rows.map(r => { const p=r[0]||"",h=r[1]||"",u=r[2]||"#",ic=r[4]||p.substring(0,2).toUpperCase(); return '<a href="'+u+'" target="_blank" class="contact-item"><div class="contact-icon">'+ic+'</div><div class="contact-info"><div class="contact-platform">'+p+'</div><div class="contact-handle">'+h+'</div></div></a>'; }).join("");
}

function scrollProfile(dir) {
  const s=document.getElementById("profile-slider");
  if (!s) return;
  const w=s.querySelector(".profile-img")?.offsetWidth||0;
  const gap = 12;
  const visibleCount = w ? Math.max(1, Math.round(s.clientWidth / (w + gap))) : 1;
  s.scrollBy({left:dir*visibleCount*(w+gap),behavior:"smooth"}); setTimeout(updateProfileNav,350);
}

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
  const rows = await fetchCSV(GID.videos);
  const ytGrid = document.getElementById("yt-grid");
  if (ytGrid && rows.length) ytGrid.innerHTML = rows.map(r => { const url=r[0]||"",title=r[1]||"",id=(url.match(/(?:v=|youtu\.be\/|live\/)([^&?\/]+)/)||[])[1]||""; return '<a href="'+url+'" target="_blank" class="yt-link"><img src="'+getYoutubeThumbnail(url)+'" class="yt-thumb" alt="'+title+'" onerror="this.onerror=null;this.src=\'https://img.youtube.com/vi/'+id+'/hqdefault.jpg\'">'+(title?'<div class="yt-title">'+title+'</div>':'')+'</a>'; }).join("");
  const ytRows = await fetchCSV(GID.youtube);
  const ytPageGrid = document.getElementById("yt-page-grid");
  if (ytPageGrid && ytRows.length) ytPageGrid.innerHTML = ytRows.map(r => { const url=r[0]||"",title=r[1]||"",id=(url.match(/(?:v=|youtu\.be\/|live\/)([^&?\/]+)/)||[])[1]||""; return '<a href="'+url+'" target="_blank" class="yt-card"><img src="'+getYoutubeThumbnail(url)+'" alt="'+title+'" onerror="this.onerror=null;this.src=\'https://img.youtube.com/vi/'+id+'/hqdefault.jpg\'"><div class="yt-card-title">'+title+'</div></a>'; }).join("");
}

let scheduleEvents = [];

async function loadSchedule() {
  const rows = await fetchCSV(GID.schedule);
  scheduleEvents = rows.filter(r => r[0]).map(r => ({ date:r[0],title:r[1]||'',location:(r[2]==='-'?'':r[2])||'',time:(r[3]==='-'?'':r[3])||'',livestream:(r[4]==='-'?'':r[4])||'',with:(r[5]==='-'?'':r[5])||'',note:(r[6]==='-'?'':r[6])||'' }));
  scheduleDates = [...new Set(scheduleEvents.map(e => e.date))];
  renderCalendar();
}

async function loadRewards() {
  const rows = await fetchCSV(GID.rewards);
  const tbody = document.getElementById("rewards-list");
  const thead = document.getElementById("rewards-thead");
  if (!tbody) return;
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="3" class="rewards-empty">ยังไม่มีข้อมูล</td></tr>'; return; }
  const hasEvent = rows.some(r => r[2]);
  if (thead && hasEvent) thead.innerHTML = '<th>Award</th><th>Event</th><th>Date</th>';
  else if (thead) thead.innerHTML = '<th>Award</th><th>Date</th>';
  tbody.innerHTML = rows.map(r => hasEvent ? '<tr><td>'+(r[0]||'')+'</td><td>'+(r[2]||'')+'</td><td class="nowrap">'+(r[1]||'')+'</td></tr>' : '<tr><td>'+(r[0]||'')+'</td><td class="nowrap">'+(r[1]||'')+'</td></tr>').join("");
}

function closePopup(e) { if (!e || e.target===document.getElementById("cal-popup-overlay")) document.getElementById("cal-popup-overlay").classList.remove("active"); }

function showEvents(dateStr) {
  const events = scheduleEvents.filter(e => e.date===dateStr);
  const list = document.getElementById("cal-popup-list");
  const dateTitle = document.getElementById("cal-popup-date");
  const [y,m,d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (dateTitle) dateTitle.textContent = d + " " + months[parseInt(m)-1] + " " + y;
  list.innerHTML = !events.length
    ? '<div class="event-empty">ไม่มีงานในวันนี้<br><span>No events scheduled for this day.</span></div>'
    : events.map(e => '<div class="event-item"><div class="e-name">'+e.title+'</div>'+(e.location?'<div class="e-row"><span>Location :</span>'+e.location+'</div>':'')+(e.time?'<div class="e-row"><span>Time :</span>'+e.time+'</div>':'')+(e.livestream?'<div class="e-row"><span>Live Streaming :</span><a href="'+e.livestream+'" target="_blank" class="event-link">'+e.livestream+'</a></div>':'')+(e.with?'<div class="e-row"><span>With :</span>'+e.with+'</div>':'')+(e.note?'<div class="e-row"><span>Note :</span><span class="event-note">'+e.note+'</span></div>':'')+'</div>').join("");
  document.getElementById("cal-popup-overlay").classList.add("active");
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
    html+='<div class="day '+(isToday?"today":isEvent?"highlight":"")+'" onclick="showEvents(\''+ds+'\')">'+d+(isEvent?'<span class="event-dot"></span>':'')+'</div>';
  }
  const rem=(7-(firstDay+daysInMonth)%7)%7;
  for (let i=1;i<=rem;i++) html+='<div class="day muted">'+i+'</div>';
  document.getElementById("cal-grid").innerHTML=html;
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

async function init() {
  renderCalendar();
  await Promise.all([loadConfig(),loadSlider(),loadWorks(),loadNews(),loadSocials(),loadVideos(),loadSchedule(),loadContact(),loadRewards()]);
  const overlay=document.getElementById("loading-overlay");
  if (overlay) { overlay.classList.add("is-hidden"); setTimeout(()=>overlay.hidden=true,300); }
}

init();
