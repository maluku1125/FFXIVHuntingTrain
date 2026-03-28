import { supabase } from './supabaseConfig.js';
import { gameData } from './gameData.js';

// Add simple HTML escaping function to prevent XSS
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// ============================================================
// State
// ============================================================
let currentUser = null;
let currentRole = 'user';
let currentRoomId = null;
let currentRoomSubscription = null;
let scoutingPoints = [];
let currentPointIndex = -1;
let isAdmin = false;
let countdownInterval = null;
let homeRefreshInterval = null; // for auto-refresh lobby every 5s

// ============================================================
// DOM references (resolved after DOMContentLoaded)
// ============================================================
let views, navBtns, modals;

// ============================================================
// View routing
// ============================================================
function switchView(viewName) {
    Object.values(views).forEach(v => {
        v.classList.toggle('hidden', v !== views[viewName]);
        v.classList.toggle('section-active', v === views[viewName]);
    });

    if (viewName === 'home') {
        fetchRooms();
        // Auto-refresh room list every 5 seconds while on home view
        if (homeRefreshInterval) clearInterval(homeRefreshInterval);
        homeRefreshInterval = setInterval(fetchRooms, 5000);
    } else {
        // Stop polling when not on home view
        if (homeRefreshInterval) {
            clearInterval(homeRefreshInterval);
            homeRefreshInterval = null;
        }
    }
}

// ============================================================
// Auth UI
// ============================================================
function updateAuthUI() {
    const loggedIn = !!currentUser;
    navBtns.login.classList.toggle('hidden', loggedIn);
    navBtns.logout.classList.toggle('hidden', !loggedIn);
    const createBtn = document.getElementById('btn-open-create-modal');
    if (createBtn) createBtn.classList.toggle('hidden', !loggedIn);
}

// ============================================================
// Session initialisation (called once on load)
// ============================================================
async function init() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('[init] getSession error:', error);

        if (session) {
            currentUser = session.user;
            currentRole = 'conductor';
            try {
                const { data } = await supabase
                    .from('admins').select('id').eq('id', currentUser.id).maybeSingle();
                isAdmin = !!data;
            } catch (e) { console.warn('[init] admins check failed:', e); }

            updateAuthUI();

            try {
                await checkAndResumeConductorRoom();
            } catch (e) { console.warn('[init] checkAndResumeConductorRoom failed:', e); }
        }
    } catch (e) {
        console.error('[init] unexpected error:', e);
    } finally {
        // Always fetch rooms — even if session check or room resume threw
        fetchRooms();
        // Start auto-refresh for home view
        if (homeRefreshInterval) clearInterval(homeRefreshInterval);
        homeRefreshInterval = setInterval(fetchRooms, 5000);
    }
}

// ============================================================
// Conductor room resume (F5 / page reload)
// ============================================================
async function checkAndResumeConductorRoom() {
    if (!currentUser) return;

    const { data: activeRoom, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('conductor_id', currentUser.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

    if (error) { console.warn('[checkAndResumeConductorRoom]', error); return; }
    if (!activeRoom) return;

    currentRoomId = activeRoom.id;
    document.getElementById('conductor-dashboard-title').innerText = `車長後台 - ${activeRoom.name}`;
    document.getElementById('btn-close-room').classList.remove('hidden');

    const { data: points } = await supabase
        .from('points').select('*')
        .eq('room_id', currentRoomId)
        .order('step_order', { ascending: true });

    if (points && points.length > 0) {
        scoutingPoints = points.map(pt => ({
            id: pt.id, version: pt.point_version, mapName: pt.map_name,
            monster: pt.monster, rank: pt.monster_rank, x: pt.x, y: pt.y
        }));
        currentPointIndex = activeRoom.current_point_index ?? 0;

        document.getElementById('conductor-scouting').classList.add('hidden');
        document.getElementById('conductor-active').classList.remove('hidden');
        updateActivePhaseUI();
    } else {
        const saved = localStorage.getItem('draft_points_' + currentRoomId);
        scoutingPoints = saved ? JSON.parse(saved) : [];
        currentPointIndex = -1;
        document.getElementById('conductor-active').classList.add('hidden');
        document.getElementById('conductor-scouting').classList.remove('hidden');
        window.renderScoutingPoints();
    }

    switchView('conductor');
}

// ============================================================
// Export / Copy Points List Logic
// ============================================================
function getFormattedPointsList() {
    if (!scoutingPoints || scoutingPoints.length === 0) return '';

    let output = '';

    scoutingPoints.forEach((pt) => {
        const mapData = gameData[pt.version]?.[pt.mapName];
        const mapNameEn = mapData?.mapNameEn || pt.mapName;
        const monsterData = mapData?.monsters?.find(m => m.name === pt.monster);
        const monsterEn = monsterData?.nameEn || pt.monster;

        output += `${monsterEn} @ ${mapNameEn} ( ${pt.x} , ${pt.y} )\n`;
    });

    return output;
}

async function handleCopyPointsList(btnId) {
    const text = getFormattedPointsList();
    if (!text) {
        alert('目前沒有任何點位可以複製！');
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById(btnId);
        if (btn) {
            const original = btn.innerText;
            btn.innerText = '✅ 已複製';
            setTimeout(() => btn.innerText = original, 2000);
        }
    } catch (err) {
        alert('複製失敗，您的瀏覽器可能不支援剪貼簿 API');
    }
}

function handleExportPointsList(btnId) {
    const text = getFormattedPointsList();
    if (!text) {
        alert('目前沒有任何點位可以輸出！');
        return;
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'points_list.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const btn = document.getElementById(btnId);
    if (btn) {
        const original = btn.innerText;
        btn.innerText = '✅ 已儲存';
        setTimeout(() => btn.innerText = original, 2000);
    }
}

document.getElementById('btn-copy-pts').addEventListener('click', () => handleCopyPointsList('btn-copy-pts'));
document.getElementById('btn-export-pts').addEventListener('click', () => handleExportPointsList('btn-export-pts'));
document.getElementById('btn-copy-pts-active').addEventListener('click', () => handleCopyPointsList('btn-copy-pts-active'));
document.getElementById('btn-export-pts-active').addEventListener('click', () => handleExportPointsList('btn-export-pts-active'));

document.getElementById('btn-import-pts').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            if (!text) return;
            
            const lines = text.split(/\r?\n/);
            const newPoints = [];

            const pointRegex = /^\d+\.\s+(.+?)\s+-\s+(?:\[(.*?)怪\]|\((水晶)\))\s+(.+?)\s+\(X:([\d.]+),\s+Y:([\d.]+)\)/;
            const enRegex = /^(.+?)\s*@\s*(.+?)\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/;
            const currentVersion = document.getElementById('input-point-version').value;
            const { mapLookup, monsterLookup } = buildEnglishLookup();
            // Strip instance markers, invisible chars, normalize apostrophes
            const stripSuffix = s => s
                .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g, '') // invisible
                .replace(/[‘’‚‛ʼˈʹ]/g, "'")          // curly → straight apostrophe
                .trim()
                .replace(/\s+instance\s+\w+\s*$/i, '')                 // Instance ONE/TWO/THREE
                .replace(/\s*[(（][ivxIVX1-9]{1,3}[)）]\s*$/, '')      // (i)(ii)(1)(2)
                .replace(/\s*[①-⑨⑴-⑼⓪❶-❾㊀-㊉㊱-㊿\uE0B1-\uE0B9]\s*$/, '') // ①⑴❶ etc.
                .trim();

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // Try English format first: MonsterName @ MapName ( X , Y )
                const enMatch = trimmed.match(enRegex);
                if (enMatch) {
                    const cleanMap = stripSuffix(enMatch[2]);
                    const mapFound = mapLookup[cleanMap.toLowerCase()];
                    const monsterFound = monsterLookup[enMatch[1].trim().toLowerCase()];
                    newPoints.push({ id: crypto.randomUUID(), version: mapFound?.version || currentVersion, mapName: mapFound?.zhName || cleanMap, monster: monsterFound?.zhName || enMatch[1].trim(), rank: monsterFound?.rank || '', x: enMatch[3], y: enMatch[4] });
                    continue;
                }

                // Fallback: old TXT format
                const match = line.match(pointRegex);
                if (match) {
                    const mapName = match[1].trim();
                    const monsterRank = match[2] || match[3]; // group 2 = normal rank (A/B/S), group 3 = 水晶
                    const monsterName = match[4].trim();
                    const ptX = match[5];
                    const ptY = match[6];
                    
                    newPoints.push({
                        id: crypto.randomUUID(),
                        version: document.getElementById('input-point-version').value, // Use current selected version
                        mapName: mapName,
                        monster: monsterName,
                        rank: monsterRank,
                        x: ptX,
                        y: ptY
                    });
                }
            }
            
            if (newPoints.length > 0) {
                if (confirm(`偵測到 ${newPoints.length} 個有效點位，是否要覆蓋目前的準備清單？`)) {
                    scoutingPoints = newPoints;
                    if (currentRoomId) {
                        localStorage.setItem('draft_points_' + currentRoomId, JSON.stringify(scoutingPoints));
                    }
                    window.renderScoutingPoints();
                    if (typeof window.renderMapMarkers === 'function') window.renderMapMarkers();
                    
                    const btn = document.getElementById('btn-import-pts');
                    const original = btn.innerText;
                    btn.innerText = '✅ 已匯入';
                    setTimeout(() => btn.innerText = original, 2000);
                }
            } else {
                alert('在這個檔案中找不到任何有效的點位資料！請確定您匯入的是由系統輸出的TXT檔案。');
            }
        };
        reader.readAsText(file);
    };
    input.click();
});

// ============================================================
// JSON Export / Import (with English names)
// ============================================================

// Build lookup maps from gameData for reverse-mapping English names → Chinese
function buildEnglishLookup() {
    const mapLookup = {};   // mapNameEn (lowercase) → { zhName, version }
    const monsterLookup = {}; // nameEn (lowercase) → { zhName, rank }
    // Normalize: replace curly apostrophes/quotes with straight ones for robust matching
    const nk = s => s.toLowerCase()
        .replace(/[‘’‚‛ʼˈʹ]/g, "'");

    for (const [version, maps] of Object.entries(gameData)) {
        for (const [zhMapName, mapData] of Object.entries(maps)) {
            if (mapData.mapNameEn) {
                mapLookup[nk(mapData.mapNameEn)] = { zhName: zhMapName, version };
            }
            for (const monster of (mapData.monsters || [])) {
                if (monster.nameEn) {
                    monsterLookup[nk(monster.nameEn)] = { zhName: monster.name, rank: monster.rank };
                }
            }
        }
    }
    return { mapLookup, monsterLookup };
}

function getPointsAsJSON() {
    if (!scoutingPoints || scoutingPoints.length === 0) return null;

    const arr = scoutingPoints.map(pt => {
        // Look up English names from gameData if available
        const mapData = gameData[pt.version]?.[pt.mapName];
        const mapNameEn = mapData?.mapNameEn || '';
        const monsterData = mapData?.monsters?.find(m => m.name === pt.monster);
        const monsterEn = monsterData?.nameEn || '';

        return {
            monster: pt.monster,
            monsterEn,
            mapName: pt.mapName,
            mapNameEn,
            rank: pt.rank,
            x: pt.x,
            y: pt.y,
            version: pt.version
        };
    });
    return JSON.stringify(arr, null, 2);
}

// ============================================================
// Room list (home lobby)
// ============================================================
async function fetchRooms() {
    const container = document.getElementById('room-list-container');
    if (!container) return;

    // Only show loading on first fetch (avoid flickering on auto-refresh)
    if (container.innerHTML.trim() === '' || container.querySelector('.empty-state')?.innerText === '載入中...') {
        container.innerHTML = '<div class="empty-state">載入中...</div>';
    }

    try {
        // Fetch public rooms + conductor's own rooms in parallel
        const publicQuery = supabase.from('rooms').select('*')
            .eq('is_active', true).eq('is_published', true)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        const myQuery = currentUser
            ? supabase.from('rooms').select('*')
                .eq('conductor_id', currentUser.id)
                .eq('is_active', true)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] });

        const [{ data: publicRooms, error: pubErr }, { data: myRooms }] =
            await Promise.all([publicQuery, myQuery]);

        if (pubErr) {
            container.innerHTML = `<div class="empty-state">無法載入房間（${pubErr.message}）</div>`;
            console.error('[fetchRooms] public:', pubErr);
            return;
        }

        let rooms = publicRooms ? [...publicRooms] : [];
        (myRooms || []).forEach(r => {
            if (!rooms.find(pub => pub.id === r.id)) rooms.unshift(r);
        });

        if (rooms.length === 0) {
            container.innerHTML = '<div class="empty-state">目前沒有開啟的房間</div>';
            return;
        }

        // Fetch point counts for all rooms in a single query
        const roomIds = rooms.map(r => r.id);
        const { data: allPoints } = await supabase
            .from('points').select('room_id')
            .in('room_id', roomIds);

        const pointCountMap = {};
        (allPoints || []).forEach(p => {
            pointCountMap[p.room_id] = (pointCountMap[p.room_id] || 0) + 1;
        });

        container.innerHTML = '';
        rooms.forEach(room => renderRoomCard(container, room, pointCountMap[room.id] || 0));

        // Run countdown update immediately to avoid showing "讀取時間中..." for 1 second
        updateCountdowns();

        // Keep updating every second
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(updateCountdowns, 1000);

    } catch (err) {
        container.innerHTML = `<div class="empty-state">載入房間時發生錯誤：${err.message}</div>`;
        console.error('[fetchRooms] unexpected:', err);
    }
}

function updateCountdowns() {
    document.querySelectorAll('.countdown-timer').forEach(el => {
        const diff = new Date(el.dataset.expires) - Date.now();
        if (diff > 0) {
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            el.innerText = `剩餘時間: ${h}時${m}分${s}秒`;
        } else {
            el.innerText = '已過期 (清理中)';
        }
    });
}

function renderRoomCard(container, room, totalPoints) {
    const isMine = currentUser && room.conductor_id === currentUser.id;

    // Progress display
    let progressHTML = '';
    if (!room.is_published) {
        progressHTML = '<span style="color:var(--text-secondary);font-size:0.85rem;">找點階段</span>';
    } else if (totalPoints === 0) {
        progressHTML = '<span style="color:var(--text-secondary);font-size:0.85rem;">準備發車</span>';
    } else {
        const idx = room.current_point_index ?? -1;
        const displayed = idx < 0 ? 0 : idx + 1;
        progressHTML = `<span style="color:var(--acc-accent);font-size:0.85rem;font-weight:bold;">第 ${displayed} / ${totalPoints} 站</span>`;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
            <h3 style="margin:0;">${escapeHTML(room.name)}
                ${isMine ? '<span style="color:var(--acc-accent);font-size:0.7rem;vertical-align:top;margin-left:4px;">(我的車)</span>' : ''}
                ${isAdmin && !isMine ? '<span style="color:var(--acc-danger);font-size:0.7rem;vertical-align:top;">(Admin)</span>' : ''}
            </h3>
            <div>
                ${room.version ? `<span style="background:var(--acc-primary);color:white;padding:0.2rem 0.6rem;border-radius:12px;font-size:0.8rem;font-weight:bold;">${escapeHTML(room.version)}</span>` : ''}
                ${room.server ? `<span class="server-badge">${escapeHTML(room.server)}</span>` : ''}
            </div>
        </div>
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.3rem;">
            ${progressHTML}
            ${room.is_published ? '' : '<span style="color:var(--acc-danger);font-size:0.8rem">[未發布]</span>'}
        </div>
        <p style="color:var(--text-secondary);font-size:0.8rem;margin:0.2rem 0;">房間 ID：${room.id.substring(0, 6)}...</p>
        <p class="countdown-timer" data-expires="${room.expires_at}" style="color:var(--acc-danger);font-weight:bold;margin-top:0.4rem;">讀取時間中...</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            ${!isMine ? `<button class="btn-primary" style="margin-top:1rem" onclick="window.joinRoom('${room.id}','${room.name}')">加入房間</button>` : ''}
            ${isAdmin ? `<button class="btn-danger" style="margin-top:1rem" onclick="window.forceCloseRoom('${room.id}')">強制關閉</button>` : ''}
            ${isMine ? `<button class="btn-accent" style="margin-top:1rem" onclick="window.rejoinAsConductor('${room.id}','${room.name}',${!!room.is_published})">加入房間（車長）</button>` : ''}
        </div>
    `;
    container.appendChild(card);
}

// ============================================================
// Active phase UI (conductor)
// ============================================================
// --- Helper to render map image and destination ping ---
function renderMapWithPing(point, imgElement, placeholderElement) {
    if (!imgElement) return;

    const mapData = gameData[point.version]?.[point.mapName];
    if (mapData && mapData.mapImage) {
        imgElement.src = mapData.mapImage;
        imgElement.style.display = 'block';
        if (placeholderElement) placeholderElement.style.display = 'none';

        let ping = imgElement.parentElement.querySelector('.destination-ping');
        if (!ping) {
            ping = document.createElement('div');
            ping.className = 'destination-ping';
            imgElement.parentElement.appendChild(ping);
        }
        let x = parseFloat(point.x), y = parseFloat(point.y);
        ping.style.left = (((x - 1) / 41) * 100) + '%';
        ping.style.top = (((y - 1) / 41) * 100) + '%';
    } else {
        imgElement.style.display = 'none';
        if (placeholderElement) {
            placeholderElement.style.display = 'block';
            placeholderElement.innerText = point.mapName === '行程結束' ? '行程結束' : '地圖未載入';
        }
        const oldPing = imgElement.parentElement.querySelector('.destination-ping');
        if (oldPing) oldPing.remove();
    }
}

function updateActivePhaseUI() {
    const isPrep = currentPointIndex < 0;

    const editBtn = document.getElementById('btn-edit-room-title');
    if (editBtn) {
        if (!document.getElementById('edit-room-title').classList.contains('hidden')) {
            // currently editing, do nothing
        } else {
            editBtn.classList.remove('hidden');
        }
    }

    const pt = isPrep
        ? { mapName: '準備發車中...', monster: '請等待車長廣播第一站', rank: '', x: '-', y: '-', version: '' }
        : scoutingPoints[currentPointIndex] || { mapName: '--', monster: '--', rank: '', x: '--', y: '--' };

    document.getElementById('active-map-name').innerText = pt.mapName;

    const rankEl = document.getElementById('active-rank');
    if (pt.rank && pt.rank !== '水晶' && !isPrep) {
        rankEl.innerText = `${pt.rank}怪`;
        rankEl.style.display = 'inline-block';
    } else {
        rankEl.style.display = 'none';
    }

    document.getElementById('active-monster').innerText = pt.monster;
    document.getElementById('active-x').innerText = pt.x;
    document.getElementById('active-y').innerText = pt.y;

    const total = scoutingPoints.length;
    const displayedIndex = isPrep ? 0 : currentPointIndex + 1;
    document.getElementById('progress-text').innerText = `${displayedIndex}/${total}`;

    // Next button
    const nextBtn = document.getElementById('btn-next-point');
    const finished = currentPointIndex >= total - 1;
    nextBtn.innerText = finished ? '行程結束' : (isPrep ? '開始第一站' : '廣播下個點位');
    nextBtn.style.opacity = '1';
    nextBtn.disabled = false;

    // Prev button
    const prevBtn = document.getElementById('btn-prev-point');
    prevBtn.disabled = currentPointIndex <= 0;
    prevBtn.style.opacity = currentPointIndex <= 0 ? '0.5' : '1';

    // Update Macro Values (Dynamic Replacements)
    const monsterTemplates = [1, 2, 3, 4, 5].map(i => {
        let t = localStorage.getItem('custom_macro_monster_' + i);
        // Fallback to legacy if available, then defaults
        if (t === null) t = localStorage.getItem('custom_macro_' + i); 
        if (t === null && i === 1) t = '/sh 下一站為： <map> <target> 座標：<pos>';
        if (t === null && i === 2) t = '/y 下一站為： <map> <target> 座標：<pos>';
        return t || '';
    });
    
    const aetheryteTemplates = [1, 2, 3, 4, 5].map(i => {
        let t = localStorage.getItem('custom_macro_aetheryte_' + i);
        if (t === null && i === 1) t = '/sh 傳送至水晶： <target>';
        return t || '';
    });

    [1, 2, 3, 4, 5].forEach((num, index) => {
        document.getElementById('macro-monster-' + num).value = monsterTemplates[index];
        document.getElementById('macro-aetheryte-' + num).value = aetheryteTemplates[index];
    });

    // Global copy point macro tool
    window.copyPointMacro = async (index) => {
        const point = scoutingPoints[index];
        if (!point) return;

        const rankVal = point.rank && point.rank !== '水晶' ? point.rank : '';
        const targetVal = point.monster;
        const posStr = `(X:${point.x}, Y:${point.y})`;

        const lines = [];
        const prefix = point.rank === '水晶' ? 'macro-aetheryte-' : 'macro-monster-';
        
        for (let i = 1; i <= 5; i++) {
            const template = document.getElementById(prefix + i).value.trim();
            if (template) {
                lines.push(template
                    .replace(/<map>/g, point.mapName || '')
                    .replace(/<rank>/g, rankVal)
                    .replace(/<target>/g, targetVal || '')
                    .replace(/<pos>/g, posStr || ''));
            }
        }

        if (lines.length === 0) return;
        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            const btn = document.getElementById(`btn-copy-pt-${index}`);
            if (btn) {
                const original = btn.innerText;
                btn.innerText = '✅ copied';
                btn.style.background = 'var(--acc-success)';
                btn.style.borderColor = 'var(--acc-success)';
                setTimeout(() => {
                    btn.innerText = original;
                    btn.style.background = '';
                    btn.style.borderColor = '';
                }, 2000);
            }
        } catch (err) {
            alert('複製失敗，您的瀏覽器可能不支援剪貼簿 API');
        }
    };

    // Populate Points List
    const listEl = document.getElementById('active-points-list');
    if (listEl) {
        listEl.innerHTML = '';
        scoutingPoints.forEach((p, i) => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.marginBottom = '0.6rem';
            li.style.padding = '0.8rem 1rem';
            li.style.borderRadius = '8px';

            if (i === currentPointIndex) {
                li.style.background = 'rgba(255, 255, 255, 0.15)'; // Highlight active
                li.style.borderLeft = '4px solid var(--acc-accent)';
            } else {
                li.style.background = 'rgba(255, 255, 255, 0.03)';
                li.style.borderLeft = '4px solid transparent';
            }

            if (i < currentPointIndex) {
                li.style.opacity = '0.4';
            }

            li.innerHTML = `
                <div style="flex: 1; padding-right: 0.5rem; display: flex; flex-direction: column;">
                    <div style="font-weight: bold; margin-bottom: 0.4rem; line-height: 1.4;">
                        <div style="margin-bottom: 0.2rem;">${i + 1}. <span style="color:var(--acc-primary)">[${escapeHTML(p.version)}]</span> ${escapeHTML(p.mapName)} - </div>
                        <div>
                            ${p.rank && p.rank !== '水晶' ? `<span style="color:var(--acc-danger);">${escapeHTML(p.rank)}怪</span>` : ''} 
                            ${escapeHTML(p.monster)}
                        </div>
                    </div>
                    <div style="color:var(--text-secondary); font-size: 0.85rem;">X:${escapeHTML(p.x)} Y:${escapeHTML(p.y)}</div>
                </div>
                <button id="btn-copy-pt-${i}" class="btn-primary" style="padding: 0.4rem 0.6rem; font-size: 0.8rem; border-radius: 6px; flex-shrink: 0;" onclick="window.copyPointMacro(${i})">
                    複製巨集
                </button>
            `;
            if (i === currentPointIndex) li.scrollIntoView({ behavior: 'smooth', block: 'center' });
            listEl.appendChild(li);
        });
    }

    // Populate Map Image & Ping overlay (Current & Next)
    const activeMapImg = document.getElementById('active-map-img');
    renderMapWithPing(pt, activeMapImg);

    const nextPt = (currentPointIndex >= 0 && currentPointIndex < scoutingPoints.length - 1)
        ? scoutingPoints[currentPointIndex + 1]
        : (currentPointIndex < 0 && scoutingPoints.length > 0)
            ? scoutingPoints[0]
            : { mapName: '行程結束', monster: '', rank: '', x: '-', y: '-', version: '' };

    const nextMapImg = document.getElementById('next-map-img');
    const nextPlaceholder = document.getElementById('next-map-placeholder');
    renderMapWithPing(nextPt, nextMapImg, nextPlaceholder);
}

// ============================================================
// Scouting points list
// ============================================================
window.renderScoutingPoints = () => {
    const list = document.getElementById('points-list');
    list.innerHTML = '';
    scoutingPoints.forEach((pt, index) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.marginBottom = '0.6rem';
        li.style.background = 'rgba(255, 255, 255, 0.03)';
        li.style.padding = '0.8rem 1rem';
        li.style.borderRadius = '8px';

        li.innerHTML = `
                <div style="flex: 1; padding-right: 0.5rem;">
                    <div style="font-weight: bold; margin-bottom: 0.4rem; line-height: 1.4;">
                        <div style="margin-bottom: 0.2rem;">${index + 1}. <span style="color:var(--acc-primary)">[${escapeHTML(pt.version)}]</span> ${escapeHTML(pt.mapName)} - </div>
                        <div>
                            ${pt.rank && pt.rank !== '水晶' ? `<span style="color:var(--acc-danger);">${escapeHTML(pt.rank)}怪</span>` : ''} 
                            ${escapeHTML(pt.monster)}
                        </div>
                    </div>
                    <div style="color:var(--text-secondary); font-size: 0.85rem;">X:${escapeHTML(pt.x)} Y:${escapeHTML(pt.y)}</div>
                </div>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                    <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                        <button class="btn-secondary" style="padding: 0.2rem 0.4rem; font-size: 0.7rem; min-width: 24px; visibility: ${index === 0 ? 'hidden' : 'visible'}" onclick="window.movePointUp(${index})" title="上移">▲</button>
                        <button class="btn-secondary" style="padding: 0.2rem 0.4rem; font-size: 0.7rem; min-width: 24px; visibility: ${index === scoutingPoints.length - 1 ? 'hidden' : 'visible'}" onclick="window.movePointDown(${index})" title="下移">▼</button>
                    </div>
                    <button id="btn-copy-scouting-pt-${index}" class="btn-primary" style="padding: 0.4rem 0.6rem; font-size: 0.8rem; border-radius: 6px; white-space: nowrap;" onclick="window.copyScoutingPointMacro(${index})">
                        複製巨集
                    </button>
                    <button class="btn-danger" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 6px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 36px; height: 46px; line-height: 1.2;" onclick="window.removePoint('${pt.id}')">
                        <span>刪</span><span>除</span>
                    </button>
                </div>
            `;
        list.appendChild(li);
    });
    document.getElementById('btn-start-train').disabled = scoutingPoints.length === 0;

    // Sync scouting macros with saved values
    [1, 2, 3, 4, 5].forEach(num => {
        const monVal = localStorage.getItem('custom_macro_monster_' + num);
        if (monVal !== null) {
            const scoutMonEl = document.getElementById('scouting-macro-monster-' + num);
            if (scoutMonEl) scoutMonEl.value = monVal;
        }

        const aetherVal = localStorage.getItem('custom_macro_aetheryte_' + num);
        if (aetherVal !== null) {
            const scoutAethEl = document.getElementById('scouting-macro-aetheryte-' + num);
            if (scoutAethEl) scoutAethEl.value = aetherVal;
        }
    });
};

window.removePoint = (id) => {
    scoutingPoints = scoutingPoints.filter(p => p.id !== id);
    localStorage.setItem('draft_points_' + currentRoomId, JSON.stringify(scoutingPoints));
    window.renderScoutingPoints();
    if (typeof window.renderMapMarkers === 'function') window.renderMapMarkers();
};

window.movePointUp = (index) => {
    if (index <= 0) return;
    const temp = scoutingPoints[index];
    scoutingPoints[index] = scoutingPoints[index - 1];
    scoutingPoints[index - 1] = temp;
    localStorage.setItem('draft_points_' + currentRoomId, JSON.stringify(scoutingPoints));
    window.renderScoutingPoints();
    if (typeof window.renderMapMarkers === 'function') window.renderMapMarkers();
};

window.movePointDown = (index) => {
    if (index >= scoutingPoints.length - 1) return;
    const temp = scoutingPoints[index];
    scoutingPoints[index] = scoutingPoints[index + 1];
    scoutingPoints[index + 1] = temp;
    localStorage.setItem('draft_points_' + currentRoomId, JSON.stringify(scoutingPoints));
    window.renderScoutingPoints();
    if (typeof window.renderMapMarkers === 'function') window.renderMapMarkers();
};

window.copyScoutingPointMacro = async (index) => {
    const point = scoutingPoints[index];
    if (!point) return;

    const rankVal = point.rank && point.rank !== '水晶' ? point.rank : '';
    const targetVal = point.monster;
    const posStr = `(X:${point.x}, Y:${point.y})`;

    const lines = [];
    const prefix = point.rank === '水晶' ? 'scouting-macro-aetheryte-' : 'scouting-macro-monster-';
    
    for (let i = 1; i <= 5; i++) {
        const el = document.getElementById(prefix + i);
        if (!el) continue;
        const template = el.value.trim();
        if (template) {
            lines.push(template
                .replace(/<map>/g, point.mapName || '')
                .replace(/<rank>/g, rankVal)
                .replace(/<target>/g, targetVal || '')
                .replace(/<pos>/g, posStr || ''));
        }
    }

    if (lines.length === 0) return;
    try {
        await navigator.clipboard.writeText(lines.join('\n'));
        const btn = document.getElementById(`btn-copy-scouting-pt-${index}`);
        if (btn) {
            const original = btn.innerText;
            btn.innerText = '✅ copied';
            btn.style.background = 'var(--acc-success)';
            btn.style.borderColor = 'var(--acc-success)';
            setTimeout(() => {
                btn.innerText = original;
                btn.style.background = '';
                btn.style.borderColor = '';
            }, 2000);
        }
    } catch (err) {
        alert('複製失敗');
    }
};

// ============================================================
// Global room actions
// ============================================================
window.joinRoom = async (roomId, roomName) => {
    if (currentRoomSubscription) {
        await supabase.removeChannel(currentRoomSubscription);
        currentRoomSubscription = null;
    }

    currentRoomId = roomId;
    document.getElementById('user-room-title').innerText = roomName;
    switchView('userRoom');

    // 1) Reset Visitor UI immediately upon entering
    document.getElementById('map-placeholder').innerText = '正在同步車長進度...';
    document.getElementById('coord-map-name').innerText = '載入中...';
    document.getElementById('coord-monster').innerText = '--';
    document.getElementById('coord-x').innerText = '-';
    document.getElementById('coord-y').innerText = '-';
    document.getElementById('coord-version').style.display = 'none';
    document.getElementById('coord-rank').style.display = 'none';

    const userMapImg = document.getElementById('current-map-img');
    userMapImg.style.display = 'none';
    document.getElementById('map-placeholder').style.display = 'block';
    const existingPing = userMapImg.parentElement.querySelector('.destination-ping');
    if (existingPing) existingPing.remove();

    // 2) Fetch points and room details concurrently
    const [{ data: points }, { data: roomData }] = await Promise.all([
        supabase.from('points').select('*').eq('room_id', roomId).order('step_order', { ascending: true }),
        supabase.from('rooms').select('current_point_index, is_active').eq('id', roomId).single()
    ]);

    const updateListenerUI = (index) => {
        const point = points && points[index];
        if (index < 0 || !point) return;

        document.getElementById('coord-version').innerText = `[${point.point_version}]`;
        document.getElementById('coord-version').style.display = 'inline-block';

        const rankEl = document.getElementById('coord-rank');
        if (rankEl) {
            if (point.monster_rank && point.monster_rank !== '水晶') {
                rankEl.innerText = `${point.monster_rank}怪`;
                rankEl.style.display = 'inline-block';
            } else {
                rankEl.style.display = 'none';
            }
        }

        document.getElementById('coord-map-name').innerText = point.map_name;
        document.getElementById('coord-monster').innerText = point.monster;
        document.getElementById('coord-x').innerText = point.x;
        document.getElementById('coord-y').innerText = point.y;
        document.getElementById('map-placeholder').innerText = `${point.map_name} / ${point.monster}`;

        // Update User Map Ping
        if (gameData[point.point_version]?.[point.map_name]?.mapImage) {
            userMapImg.src = gameData[point.point_version][point.map_name].mapImage;
            userMapImg.style.display = 'block';
            document.getElementById('map-placeholder').style.display = 'none';
            userMapImg.parentElement.style.position = 'relative';

            let ping = userMapImg.parentElement.querySelector('.destination-ping');
            if (!ping) {
                ping = document.createElement('div');
                ping.className = 'destination-ping';
                userMapImg.parentElement.appendChild(ping);
            }
            const leftPct = ((point.x - 1) / 41) * 100;
            const topPct = ((point.y - 1) / 41) * 100;
            ping.style.left = leftPct + '%';
            ping.style.top = topPct + '%';
        } else {
            userMapImg.style.display = 'none';
            document.getElementById('map-placeholder').style.display = 'block';
            const oldPing = userMapImg.parentElement.querySelector('.destination-ping');
            if (oldPing) oldPing.remove();
        }

        const cd = document.querySelector('.coord-display');
        cd.classList.remove('updating');
        void cd.offsetWidth;
        cd.classList.add('updating');
    };

    // 3) Apply initial state from database
    if (roomData != null) {
        if (roomData.is_active === false) {
            alert('此班車已經結束囉，請尋找其他班車。');
            document.getElementById('btn-leave-room').click();
            return;
        }

        const idx = roomData.current_point_index;
        if (idx >= 0) {
            updateListenerUI(idx);
        } else {
            // Index < 0 -> prep phase
            const hasPoints = points && points.length > 0;
            document.getElementById('map-placeholder').innerText = hasPoints ? '列車就緒，等待車長廣播第一站...' : '目前車長還在找點中，請稍候。';
            document.getElementById('coord-map-name').innerText = '準備發車中...';
            document.getElementById('coord-monster').innerText = '--';
            document.getElementById('coord-x').innerText = '-';
            document.getElementById('coord-y').innerText = '-';
        }
    }

    // Subscribe to conductor's point advances via Realtime
    // NOTE: requires `ALTER TABLE public.rooms REPLICA IDENTITY FULL` in SQL
    currentRoomSubscription = supabase
        .channel(`room-${roomId}`)
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
            async (payload) => {
                const isActive = payload.new.is_active;
                if (isActive === false) {
                    alert('車長已結束此班車，感謝搭乘！');
                    document.getElementById('btn-leave-room').click();
                    return;
                }

                const newIndex = payload.new.current_point_index;

                // If no points yet (conductor was still scouting), re-fetch
                if (!points || points.length === 0) {
                    const { data: fresh } = await supabase
                        .from('points').select('*')
                        .eq('room_id', roomId).order('step_order', { ascending: true });
                    if (fresh && fresh.length > 0) {
                        points.length = 0;
                        points.push(...fresh);
                        if (newIndex >= 0) {
                            document.getElementById('map-placeholder').innerText = '同步完成，發車中！';
                        }
                    }
                }

                if (newIndex < 0) {
                    document.getElementById('map-placeholder').innerText = '列車就緒，等待車長廣播第一站...';
                    document.getElementById('coord-map-name').innerText = '準備發車中...';
                    document.getElementById('coord-monster').innerText = '--';
                    document.getElementById('coord-x').innerText = '-';
                    document.getElementById('coord-y').innerText = '-';
                    document.getElementById('coord-version').style.display = 'none';
                    document.getElementById('coord-rank').style.display = 'none';

                    const userMapImg = document.getElementById('current-map-img');
                    userMapImg.style.display = 'none';
                    document.getElementById('map-placeholder').style.display = 'block';
                    const oldPing = userMapImg.parentElement.querySelector('.destination-ping');
                    if (oldPing) oldPing.remove();
                } else {
                    updateListenerUI(newIndex);
                }
            }
        )
        .subscribe((status) => {
            console.log('[Realtime] subscription status:', status);
        });
};

window.rejoinAsConductor = async (roomId, roomName, isPublished) => {
    currentRoomId = roomId;
    document.getElementById('conductor-dashboard-title').innerText = `車長後台 - ${roomName}`;
    document.getElementById('btn-close-room').classList.remove('hidden');
    document.getElementById('checkbox-publish').checked = !!isPublished;

    const [{ data: points }, { data: roomData }] = await Promise.all([
        supabase.from('points').select('*').eq('room_id', roomId).order('step_order', { ascending: true }),
        supabase.from('rooms').select('current_point_index').eq('id', roomId).single()
    ]);

    if (points && points.length > 0) {
        scoutingPoints = points.map(pt => ({
            id: pt.id, version: pt.point_version, mapName: pt.map_name,
            monster: pt.monster, rank: pt.monster_rank, x: pt.x, y: pt.y
        }));
        currentPointIndex = roomData?.current_point_index ?? 0;

        document.getElementById('conductor-scouting').classList.add('hidden');
        document.getElementById('conductor-active').classList.remove('hidden');
        updateActivePhaseUI();
    } else {
        const saved = localStorage.getItem('draft_points_' + roomId);
        scoutingPoints = saved ? JSON.parse(saved) : [];
        currentPointIndex = -1;
        document.getElementById('conductor-active').classList.add('hidden');
        document.getElementById('conductor-scouting').classList.remove('hidden');
        window.renderScoutingPoints();
        setTimeout(window.renderMapMarkers, 150);
    }

    switchView('conductor');
};

window.forceCloseRoom = async (id) => {
    if (!confirm('【管理員】確定要強制關閉這組車隊嗎？')) return;
    await supabase.from('rooms').update({ is_active: false }).eq('id', id);
    fetchRooms();
};

// ============================================================
// DOMContentLoaded — bind all UI events, then init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    views = {
        home: document.getElementById('view-home'),
        maps: document.getElementById('view-maps'),
        userRoom: document.getElementById('view-user-room'),
        conductor: document.getElementById('view-conductor'),
    };
    navBtns = {
        home: document.getElementById('btn-home'),
        maps: document.getElementById('btn-maps'),
        login: document.getElementById('btn-login'),
        logout: document.getElementById('btn-logout'),
    };
    modals = {
        login: document.getElementById('login-modal'),
        createRoom: document.getElementById('create-room-modal'),
    };

    // --- Navigation ---
    navBtns.home.addEventListener('click', () => switchView('home'));
    if (navBtns.maps) navBtns.maps.addEventListener('click', () => switchView('maps'));
    document.getElementById('btn-leave-room').addEventListener('click', async () => {
        if (currentRoomSubscription) {
            await supabase.removeChannel(currentRoomSubscription);
            currentRoomSubscription = null;
        }
        currentRoomId = null;
        switchView('home');
        fetchRooms();
    });

    navBtns.login.addEventListener('click', () => modals.login.classList.remove('hidden'));
    navBtns.logout.addEventListener('click', async () => {
        await supabase.auth.signOut();
        currentUser = null;
        currentRole = 'user';
        isAdmin = false;
        updateAuthUI();
        switchView('home');
    });
    document.getElementById('close-login').addEventListener('click', () =>
        modals.login.classList.add('hidden'));

    // --- Cascading selects: version -> map -> monster / coordinate ---
    const versionSelect = document.getElementById('input-point-version');
    const mapSelect = document.getElementById('input-map-name');
    const monsterSelect = document.getElementById('input-monster');
    const pointSelect = document.getElementById('input-point-name');

    function updateMapOptions() {
        const version = versionSelect.value;
        mapSelect.innerHTML = '<option value="">選擇地圖</option>';
        monsterSelect.innerHTML = '<option value="">選擇怪物</option>';
        pointSelect.innerHTML = '<option value="">選擇座標</option>';
        document.getElementById('scout-map-wrapper').style.display = 'none';

        if (gameData[version]) {
            Object.keys(gameData[version]).forEach(map => {
                const opt = document.createElement('option');
                opt.value = map;
                opt.innerText = map;
                mapSelect.appendChild(opt);
            });
        }
    }

    function updateMonsterOptions() {
        const version = versionSelect.value;
        const map = mapSelect.value;
        monsterSelect.innerHTML = '<option value="">選擇怪物</option>';
        pointSelect.innerHTML = '<option value="">選擇座標</option>';

        const mapPreview = document.getElementById('scout-map-preview');
        const mapWrapper = document.getElementById('scout-map-wrapper');
        const mapData = gameData[version]?.[map];

        if (!mapData) { mapWrapper.style.display = 'none'; return; }

        if (mapData.mapImage) {
            mapPreview.src = mapData.mapImage;
            mapWrapper.style.display = 'flex';
        } else {
            mapWrapper.style.display = 'none';
        }

        const allTargets = [
            ...(mapData.monsters || []),
            ...(mapData.aetherytes || []).map(a => ({ name: '傳送水晶: ' + a.name, rank: '水晶', _isHiddenRank: true, _aetheryte: a }))
        ];

        allTargets.forEach((m, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.dataset.name = m.name;
            opt.dataset.rank = m.rank || 'A';
            opt.innerText = m.name;
            monsterSelect.appendChild(opt);

            // Auto add an option to points if it's an aetheryte to simplify flow
            if (m._aetheryte) {
                const ptOpt = document.createElement('option');
                ptOpt.value = `${m._aetheryte.x},${m._aetheryte.y}`;
                ptOpt.dataset.x = m._aetheryte.x;
                ptOpt.dataset.y = m._aetheryte.y;
                ptOpt.dataset.forAetheryte = m.name;
                ptOpt.innerText = `水晶座標 (X:${m._aetheryte.x}, Y: ${m._aetheryte.y})`;
                ptOpt.style.display = 'none'; // hidden from manual list, selected automatically
                pointSelect.appendChild(ptOpt);
            }
        });

        // Coordinates are map-level
        (mapData.points || []).forEach(pt => {
            const opt = document.createElement('option');
            opt.value = `${pt.x},${pt.y}`;
            opt.dataset.x = pt.x;
            opt.dataset.y = pt.y;
            opt.innerText = `${pt.label} (X:${pt.x}, Y:${pt.y})`;
            pointSelect.appendChild(opt);
        });

        // Ensure map markers update immediately when map changes
        setTimeout(() => {
            if (typeof window.renderMapMarkers === 'function') {
                window.renderMapMarkers();
            }
        }, 50);
    }

    versionSelect.addEventListener('change', updateMapOptions);
    mapSelect.addEventListener('change', updateMonsterOptions);

    monsterSelect.addEventListener('change', (e) => {
        const sel = e.target.options[e.target.selectedIndex];
        if (sel && sel.dataset.name && sel.dataset.name.startsWith('傳送水晶: ')) {
            // Auto-select coordinates for this aetheryte
            Array.from(pointSelect.options).forEach(opt => {
                if (opt.dataset.forAetheryte === sel.dataset.name) {
                    pointSelect.value = opt.value;
                }
            });
        }
    });

    updateMapOptions();
    setTimeout(initMapInteractions, 100);

    // Intercept map dropdown update for scouting map marker rendering
    const _oldUpdateMonsterOptions = updateMonsterOptions;
    updateMonsterOptions = function () {
        if (typeof _oldUpdateMonsterOptions === 'function') _oldUpdateMonsterOptions();
        window.renderMapMarkers();
    };

    // --- Map Viewer Logic ---
    const viewerVersionSelect = document.getElementById('map-viewer-version');
    const viewerMapSelect = document.getElementById('map-viewer-map');
    const viewerWrapper = document.getElementById('map-viewer-wrapper');
    const viewerImg = document.getElementById('map-viewer-img');
    const viewerPlaceholder = document.getElementById('map-viewer-placeholder');

    function updateViewerMapOptions() {
        const version = viewerVersionSelect.value;
        viewerMapSelect.innerHTML = '<option value="">選擇地圖</option>';
        viewerWrapper.style.display = 'none';
        viewerPlaceholder.style.display = 'block';

        if (gameData[version]) {
            Object.keys(gameData[version]).forEach(map => {
                const opt = document.createElement('option');
                opt.value = map;
                opt.innerText = map;
                viewerMapSelect.appendChild(opt);
            });
        }
    }

    function renderViewerMapMarkers() {
        const version = viewerVersionSelect.value;
        const map = viewerMapSelect.value;
        const mapData = gameData[version]?.[map];

        const existing = viewerWrapper.querySelectorAll('.map-marker');
        existing.forEach(el => el.remove());

        if (!mapData || !mapData.mapImage) {
            viewerWrapper.style.display = 'none';
            viewerPlaceholder.style.display = 'block';
            return;
        }

        viewerImg.src = mapData.mapImage;
        viewerWrapper.style.display = 'block';
        viewerPlaceholder.style.display = 'none';

        (mapData.points || []).forEach(pt => {
            const marker = document.createElement('div');
            marker.className = 'map-marker';
            marker.innerText = pt.label;
            marker.style.left = (((pt.x - 1) / 41) * 100) + '%';
            marker.style.top = (((pt.y - 1) / 41) * 100) + '%';
            viewerWrapper.appendChild(marker);
        });

        (mapData.aetherytes || []).forEach(a => {
            const marker = document.createElement('div');
            marker.className = 'map-marker aetheryte';
            marker.title = a.name;
            marker.style.left = (((a.x - 1) / 41) * 100) + '%';
            marker.style.top = (((a.y - 1) / 41) * 100) + '%';
            viewerWrapper.appendChild(marker);
        });
    }

    if (viewerVersionSelect && viewerMapSelect) {
        viewerVersionSelect.addEventListener('change', updateViewerMapOptions);
        viewerMapSelect.addEventListener('change', renderViewerMapMarkers);
        updateViewerMapOptions();
    }

    // --- Conductor: Edit Room Title ---
    const titleH2 = document.getElementById('conductor-dashboard-title');
    const titleInput = document.getElementById('edit-room-title');
    const editBtn = document.getElementById('btn-edit-room-title');
    const saveBtn = document.getElementById('btn-save-room-title');
    const cancelBtn = document.getElementById('btn-cancel-room-title');

    const finishEditTitle = () => {
        titleH2.classList.remove('hidden');
        editBtn.classList.remove('hidden');
        titleInput.classList.add('hidden');
        saveBtn.classList.add('hidden');
        cancelBtn.classList.add('hidden');
    };

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            titleInput.value = titleH2.innerText.replace('車長後台 - ', '').trim();
            titleH2.classList.add('hidden');
            editBtn.classList.add('hidden');
            titleInput.classList.remove('hidden');
            saveBtn.classList.remove('hidden');
            cancelBtn.classList.remove('hidden');
            titleInput.focus();
        });

        cancelBtn.addEventListener('click', finishEditTitle);

        saveBtn.addEventListener('click', async () => {
            const newName = titleInput.value.trim();
            if (!newName) return alert('請輸入車隊名稱！');
            if (!currentRoomId) return finishEditTitle();

            const { error } = await supabase.from('rooms').update({ name: newName }).eq('id', currentRoomId);
            if (error) {
                alert('更新標題失敗: ' + error.message);
            } else {
                titleH2.innerText = `車長後台 - ${newName}`;
            }
            finishEditTitle();
        });
    }

    // --- Discord OAuth ---
    document.getElementById('btn-discord-login').addEventListener('click', async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: { redirectTo: window.location.origin + window.location.pathname }
        });
        if (error) alert('Discord 登入失敗: ' + error.message);
    });

    // --- User room: leave ---
    document.getElementById('btn-leave-room').addEventListener('click', async () => {
        if (currentRoomSubscription) {
            await supabase.removeChannel(currentRoomSubscription);
            currentRoomSubscription = null;
        }
        currentRoomId = null;
        switchView('home');
    });

    // --- Conductor: create room ---
    document.getElementById('btn-open-create-modal').addEventListener('click', () =>
        modals.createRoom.classList.remove('hidden'));

    document.getElementById('close-create-room').addEventListener('click', () =>
        modals.createRoom.classList.add('hidden'));

    document.getElementById('btn-submit-create-room').addEventListener('click', async () => {
        const roomName = document.getElementById('input-room-name').value.trim();
        if (!roomName) return alert('請輸入車隊名稱！');

        const versions = Array.from(
            document.querySelectorAll('#version-checkboxes input:checked')
        ).map(cb => cb.value).join(', ');

        const servers = Array.from(
            document.querySelectorAll('#server-checkboxes input:checked')
        ).map(cb => cb.value).join(', ');

        const { data, error } = await supabase.from('rooms').insert([{
            name: roomName, version: versions, server: servers,
            conductor_id: currentUser.id,
            is_published: false, current_point_index: -1
        }]).select().single();

        if (error) return alert('建立房間失敗: ' + error.message);

        currentRoomId = data.id;
        modals.createRoom.classList.add('hidden');
        document.getElementById('input-room-name').value = '';
        document.getElementById('btn-close-room').classList.remove('hidden');
        document.getElementById('conductor-scouting').classList.remove('hidden');
        document.getElementById('conductor-active').classList.add('hidden');
        document.getElementById('conductor-dashboard-title').innerText = `車長後台 - ${roomName}`;
        document.getElementById('checkbox-publish').checked = false;
        scoutingPoints = [];
        window.renderScoutingPoints();
        switchView('conductor');
    });

    // --- Conductor: publish toggle ---
    document.getElementById('checkbox-publish').addEventListener('change', async (e) => {
        if (!currentRoomId) return;
        const isPublished = e.target.checked;
        const { error } = await supabase.from('rooms')
            .update({ is_published: isPublished }).eq('id', currentRoomId);
        if (error) {
            alert('更新發布狀態失敗: ' + error.message);
            e.target.checked = !isPublished;
        }
    });

    // --- Conductor: close room ---
    document.getElementById('btn-close-room').addEventListener('click', async () => {
        if (currentRoomId) {
            await supabase.from('rooms').update({ is_active: false }).eq('id', currentRoomId);
            localStorage.removeItem('draft_points_' + currentRoomId);
        }
        currentRoomId = null;
        scoutingPoints = [];
        currentPointIndex = -1;
        document.getElementById('btn-close-room').classList.add('hidden');
        document.getElementById('conductor-scouting').classList.add('hidden');
        document.getElementById('conductor-active').classList.add('hidden');
        switchView('home');
    });

    // --- Scouting: add point ---
    document.getElementById('add-point-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (scoutingPoints.length >= 100) return alert('最多 100 個點位');

        const version = versionSelect.value;
        const mapName = mapSelect.value;

        if (!monsterSelect.value || !pointSelect.value) return alert('請選擇怪物與座標點位！');

        const selMon = monsterSelect.options[monsterSelect.selectedIndex];
        const selPt = pointSelect.options[pointSelect.selectedIndex];
        const savedCoordValue = selPt.value; // preserve coordinate selection

        scoutingPoints.push({
            version, mapName,
            monster: selMon.dataset.name,
            rank: selMon.dataset.rank || 'A',
            x: selPt.dataset.x,
            y: selPt.dataset.y,
            id: Date.now()
        });

        localStorage.setItem('draft_points_' + currentRoomId, JSON.stringify(scoutingPoints));

        // Reset only the monster; restore coordinate so user can quickly add another monster at same spot
        monsterSelect.value = '';
        pointSelect.value = savedCoordValue;

        window.renderScoutingPoints();
        if (typeof window.renderMapMarkers === 'function') window.renderMapMarkers();
    });

    // --- Conductor: start train ---
    document.getElementById('btn-start-train').addEventListener('click', async () => {
        if (!currentRoomId || scoutingPoints.length === 0) return;

        const isPublic = document.getElementById('checkbox-publish').checked;
        if (!isPublic) {
            return alert('請先勾選發布房間，才能出發！');
        }

        const startBtn = document.getElementById('btn-start-train');
        startBtn.innerText = '發車!';
        startBtn.disabled = true;

        try {
            const pointsToInsert = scoutingPoints.map((pt, index) => {
                const x = parseFloat(pt.x);
                const y = parseFloat(pt.y);
                if (isNaN(x) || isNaN(y)) throw new Error(`點位 #${index + 1} 座標無效（${pt.x}, ${pt.y}）`);
                return {
                    room_id: currentRoomId, step_order: index,
                    point_version: pt.version, map_name: pt.mapName,
                    monster: pt.monster, monster_rank: pt.rank || 'A', x, y
                };
            });

            const isPublic = document.getElementById('checkbox-publish').checked;
            const { error: roomErr } = await supabase.from('rooms')
                .update({ is_published: isPublic }).eq('id', currentRoomId);
            if (roomErr) throw new Error('更新發布狀態失敗: ' + roomErr.message);

            const { error: pointsErr } = await supabase.from('points').insert(pointsToInsert);
            if (pointsErr) throw new Error('儲存點位失敗: ' + pointsErr.message);

            document.getElementById('conductor-scouting').classList.add('hidden');
            document.getElementById('conductor-active').classList.remove('hidden');
            currentPointIndex = -1;
            localStorage.removeItem('draft_points_' + currentRoomId);
            updateActivePhaseUI();
        } catch (err) {
            alert(err.message);
            startBtn.innerText = '開始發車';
            startBtn.disabled = false;
        }
    });

    // --- Conductor: next point / end train ---
    document.getElementById('btn-next-point').addEventListener('click', async () => {
        if (currentPointIndex < scoutingPoints.length - 1) {
            currentPointIndex++;
            updateActivePhaseUI();

            const isLastPoint = currentPointIndex >= scoutingPoints.length - 1;
            const updates = { current_point_index: currentPointIndex };

            // When reaching the last point, shrink expires_at to now + 15 minutes
            if (isLastPoint) {
                updates.expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            }

            await supabase.from('rooms').update(updates).eq('id', currentRoomId);
        } else {
            // Already at the last point, so button acts as "Finish"
            if (confirm('已經沒有下一站了，確定要結束行程並關閉班車嗎？')) {
                await supabase.from('rooms').update({ is_active: false }).eq('id', currentRoomId);
                alert('感謝車長開車！行程已圓滿結束。');

                // Clear and reset UI
                localStorage.removeItem('draft_points_' + currentRoomId);
                currentRoomId = null;
                scoutingPoints = [];
                currentPointIndex = -1;
                document.getElementById('btn-close-room').classList.add('hidden');
                document.getElementById('conductor-scouting').classList.add('hidden');
                document.getElementById('conductor-active').classList.add('hidden');
                switchView('home');
            }
        }
    });

    // --- Conductor: previous point ---
    document.getElementById('btn-prev-point').addEventListener('click', async () => {
        if (currentPointIndex > 0) {
            currentPointIndex--;
            updateActivePhaseUI();
            await supabase.from('rooms')
                .update({ current_point_index: currentPointIndex }).eq('id', currentRoomId);
        }
    });

    // --- Conductor: Macro interactions ---
    [1, 2, 3, 4, 5].forEach(num => {
        const monEl = document.getElementById('macro-monster-' + num);
        const aethEl = document.getElementById('macro-aetheryte-' + num);

        if (monEl) {
            monEl.addEventListener('input', (e) => {
                localStorage.setItem('custom_macro_monster_' + num, e.target.value);
                // Sync with scouting phase macro if exists
                const scoutMon = document.getElementById('scouting-macro-monster-' + num);
                if (scoutMon) scoutMon.value = e.target.value;
            });
        }
        if (aethEl) {
            aethEl.addEventListener('input', (e) => {
                localStorage.setItem('custom_macro_aetheryte_' + num, e.target.value);
                // Sync with scouting phase macro if exists
                const scoutAeth = document.getElementById('scouting-macro-aetheryte-' + num);
                if (scoutAeth) scoutAeth.value = e.target.value;
            });
        }

        // Add listeners for scouting phase macro inputs
        const scoutMonEl = document.getElementById('scouting-macro-monster-' + num);
        const scoutAethEl = document.getElementById('scouting-macro-aetheryte-' + num);

        if (scoutMonEl) {
            scoutMonEl.addEventListener('input', (e) => {
                localStorage.setItem('custom_macro_monster_' + num, e.target.value);
                // Sync with active phase macro
                const activeMon = document.getElementById('macro-monster-' + num);
                if (activeMon) activeMon.value = e.target.value;
            });
        }
        if (scoutAethEl) {
            scoutAethEl.addEventListener('input', (e) => {
                localStorage.setItem('custom_macro_aetheryte_' + num, e.target.value);
                // Sync with active phase macro
                const activeAeth = document.getElementById('macro-aetheryte-' + num);
                if (activeAeth) activeAeth.value = e.target.value;
            });
        }
    });

    // --- Conductor: Macro Export/Import for Scouting Phase ---
    const handleMacroExport = (isScouting) => {
        const prefix = isScouting ? 'scouting-macro-' : 'macro-';
        const exportDataObj = { monster: [], aetheryte: [] };
        for (let i = 1; i <= 5; i++) {
            exportDataObj.monster.push(document.getElementById(prefix + 'monster-' + i).value || '');
            exportDataObj.aetheryte.push(document.getElementById(prefix + 'aetheryte-' + i).value || '');
        }
        
        const exportData = JSON.stringify(exportDataObj, null, 2);
        const blob = new Blob([exportData], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'macros_template.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const btnId = isScouting ? 'btn-scouting-export-macro' : 'btn-export-macro';
        const btn = document.getElementById(btnId);
        if (btn) {
            const original = btn.innerText;
            btn.innerText = '✅ 已匯出';
            setTimeout(() => btn.innerText = original, 2000);
        }
    };

    const handleMacroImport = (isScouting) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const text = event.target.result;
                    let parsed;
                    try {
                        parsed = JSON.parse(text);
                    } catch (parseError) {
                        throw new Error('檔案內容格式不正確，不是有效的 JSON 格式');
                    }

                    let monsterLines = [];
                    let aetheryteLines = ['', '', '', '', ''];
                    
                    if (Array.isArray(parsed) && parsed.length >= 5) {
                        monsterLines = parsed.slice(0, 5);
                    } else if (parsed && parsed.monster && parsed.aetheryte) {
                        monsterLines = parsed.monster;
                        aetheryteLines = parsed.aetheryte;
                    } else {
                        throw new Error('巨集格式不正確，找不到怪物與水晶的資料');
                    }

                    for (let i = 1; i <= 5; i++) {
                        const mVal = monsterLines[i - 1] || '';
                        const aVal = aetheryteLines[i - 1] || '';
                        
                        localStorage.setItem('custom_macro_monster_' + i, mVal);
                        localStorage.setItem('custom_macro_aetheryte_' + i, aVal);

                        const scoutMon = document.getElementById('scouting-macro-monster-' + i);
                        const activeMon = document.getElementById('macro-monster-' + i);
                        if (scoutMon) scoutMon.value = mVal;
                        if (activeMon) activeMon.value = mVal;

                        const scoutAeth = document.getElementById('scouting-macro-aetheryte-' + i);
                        const activeAeth = document.getElementById('macro-aetheryte-' + i);
                        if (scoutAeth) scoutAeth.value = aVal;
                        if (activeAeth) activeAeth.value = aVal;
                    }

                    const btnId = isScouting ? 'btn-scouting-import-macro' : 'btn-import-macro';
                    const btn = document.getElementById(btnId);
                    if (btn) {
                        const original = btn.innerText;
                        btn.innerText = '✅ 已匯入';
                        setTimeout(() => btn.innerText = original, 2000);
                    }
                } catch (err) {
                    alert('匯入失敗：' + err.message + '\n請確認您選擇了正確的 txt 檔案。');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    document.getElementById('btn-export-macro').addEventListener('click', () => handleMacroExport(false));
    document.getElementById('btn-scouting-export-macro')?.addEventListener('click', () => handleMacroExport(true));
    document.getElementById('btn-import-macro').addEventListener('click', () => handleMacroImport(false));
    document.getElementById('btn-scouting-import-macro')?.addEventListener('click', () => handleMacroImport(true));



    // --- Auth state listener (handles login / logout AFTER page load) ---
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            if (currentUser && currentUser.id === session?.user?.id) return;

            currentUser = session.user;
            currentRole = 'conductor';
            try {
                const { data } = await supabase
                    .from('admins').select('id').eq('id', currentUser.id).maybeSingle();
                isAdmin = !!data;
            } catch (e) { /* ignore */ }

            modals.login.classList.add('hidden');
            updateAuthUI();
            try { await checkAndResumeConductorRoom(); } catch (e) { /* ignore */ }
            fetchRooms();

        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            currentRole = 'user';
            isAdmin = false;
            updateAuthUI();
            fetchRooms();
        }
    });

    init();
});

// Interactive map previews
function initMapInteractions() {
    const previewMap = document.getElementById('scout-map-preview');
    const activeMap = document.getElementById('active-map-img');
    const userMap = document.getElementById('current-map-img');

    function setupTooltip(imgEl) {
        let tooltip = imgEl.parentElement.querySelector('.map-coordinate-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'map-coordinate-tooltip';
            tooltip.style.display = 'none';
            imgEl.parentElement.style.position = 'relative';
            imgEl.parentElement.appendChild(tooltip);
        }

        imgEl.addEventListener('mousemove', (e) => {
            const rect = imgEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Map from 1.0 to 42.0
            const mapX = (x / rect.width) * 41 + 1;
            const mapY = (y / rect.height) * 41 + 1;

            tooltip.innerText = `X: ${mapX.toFixed(1)}, Y: ${mapY.toFixed(1)}`;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
            tooltip.style.display = 'block';
        });

        imgEl.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    }

    [previewMap, activeMap, userMap, document.getElementById('map-viewer-img')].forEach(el => {
        if (el) setupTooltip(el);
    });

    // Handle clicking on preview map to choose coordinate
    if (previewMap) {
        previewMap.addEventListener('click', (e) => {
            const rect = previewMap.getBoundingClientRect();
            let drawWidth = rect.width; let drawHeight = rect.height;
            if (previewMap.naturalWidth && previewMap.naturalHeight) {
                const ratio = Math.min(rect.width / previewMap.naturalWidth, rect.height / previewMap.naturalHeight);
                drawWidth = previewMap.naturalWidth * ratio;
                drawHeight = previewMap.naturalHeight * ratio;
            }
            const offX = (rect.width - drawWidth) / 2;
            const offY = (rect.height - drawHeight) / 2;

            const trueX = e.clientX - rect.left - offX;
            const trueY = e.clientY - rect.top - offY;

            if (trueX < 0 || trueX > drawWidth || trueY < 0 || trueY > drawHeight) return;

            const mapX = (trueX / drawWidth) * 41 + 1;
            const mapY = (trueY / drawHeight) * 41 + 1;

            const pointSelect = document.getElementById('input-point-name');
            let closestOpt = null;
            let minDist = 2.0;

            Array.from(pointSelect.options).forEach(opt => {
                if (opt.dataset.x && opt.dataset.y) {
                    const dx = parseFloat(opt.dataset.x) - mapX;
                    const dy = parseFloat(opt.dataset.y) - mapY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < minDist) {
                        minDist = dist;
                        closestOpt = opt;
                    }
                }
            });

            if (closestOpt) {
                pointSelect.value = closestOpt.value;
                renderMapMarkers();
            } else {
                const customVal = `${mapX.toFixed(1)},${mapY.toFixed(1)}`;
                let opt = Array.from(pointSelect.options).find(o => o.value === customVal);
                if (!opt) {
                    opt = document.createElement('option');
                    opt.value = customVal;
                    opt.dataset.x = mapX.toFixed(1);
                    opt.dataset.y = mapY.toFixed(1);
                    opt.innerText = `自訂 (X:${mapX.toFixed(1)}, Y:${mapY.toFixed(1)})`;
                    pointSelect.appendChild(opt);
                }
                pointSelect.value = customVal;
                renderMapMarkers();
            }
        });
    }
}

window.renderMapMarkers = function () {
    const previewMap = document.getElementById('scout-map-preview');
    if (!previewMap) return;
    const container = previewMap.parentElement;

    container.querySelectorAll('.map-marker').forEach(el => el.remove());

    const versionSelect = document.getElementById('input-point-version');
    const mapSelect = document.getElementById('input-map-name');
    const pointSelect = document.getElementById('input-point-name');
    const monsterSelect = document.getElementById('input-monster');

    const version = versionSelect.value;
    const map = mapSelect.value;
    const mapData = gameData[version]?.[map];
    if (!mapData || !mapData.mapImage) return;

    (mapData.points || []).forEach(pt => {
        const marker = document.createElement('div');
        marker.className = 'map-marker';
        marker.innerText = pt.label;

        const leftPct = ((pt.x - 1) / 41) * 100;
        const topPct = ((pt.y - 1) / 41) * 100;

        marker.style.left = leftPct + '%';
        marker.style.top = topPct + '%';

        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            pointSelect.value = `${pt.x},${pt.y}`;
            window.renderMapMarkers();
        });

        // Check if this point is currently selected in the dropdown
        if (pointSelect.value === `${pt.x},${pt.y}`) {
            marker.classList.add('selected');
        } else if (scoutingPoints.some(sp => 
            sp.mapName?.trim() === map.trim() && 
            sp.version?.trim() === version.trim() && 
            Math.abs(parseFloat(sp.x) - parseFloat(pt.x)) <= 1.5 && 
            Math.abs(parseFloat(sp.y) - parseFloat(pt.y)) <= 1.5
        )) {
            // Check if this point is already added to the scouting list (with a 1.5 coordinate variance)
            marker.classList.add('added');
        }

        container.appendChild(marker);
    });

    (mapData.aetherytes || []).forEach(a => {
        const marker = document.createElement('div');
        marker.className = 'map-marker aetheryte';
        marker.title = a.name;

        const leftPct = ((a.x - 1) / 41) * 100;
        const topPct = ((a.y - 1) / 41) * 100;
        marker.style.left = leftPct + '%';
        marker.style.top = topPct + '%';

        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            const mOpt = Array.from(monsterSelect.options).find(o => o.dataset.name === '傳送水晶: ' + a.name);
            if (mOpt) {
                monsterSelect.value = mOpt.value;
                monsterSelect.dispatchEvent(new Event('change'));
            }
            window.renderMapMarkers();
        });
        container.appendChild(marker);
    });
}



document.getElementById('input-point-name')?.addEventListener('change', window.renderMapMarkers);
