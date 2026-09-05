// ===== STATE MANAGEMENT =====
let state = {
    segments: [{id: 1, len: 400}],
    supports: [
        {id: 's1', name: 'A', x: 0, type: 'fixed'},
        {id: 's2', name: 'B', x: 400, type: 'roller_y'}
    ],
    loads: [
        {id: 'l1', type: 'Fy', x: 200, val: -1000},
        {id: 'l2', type: 'Fz', x: 300, val: 500}
    ],
    results: null,
    activeTab: 'Qy',
    studyMode: false
};

// ===== UTILITY =====
const getTotalLength = () => state.segments.reduce((sum, s) => sum + s.len, 0);
const uuid = () => Math.random().toString(36).substr(2, 9);

function toggleLoadInputs() {
    const type = document.getElementById('loadType').value;
    if(type.startsWith('q')) {
        document.getElementById('pointLoadInputs').style.display = 'none';
        document.getElementById('distLoadInputs').style.display = 'block';
    } else {
        document.getElementById('pointLoadInputs').style.display = 'block';
        document.getElementById('distLoadInputs').style.display = 'none';
    }
}

// ===== UI RENDERING =====
function renderSidebar() {
    const segList = document.getElementById('segmentList');
    segList.innerHTML = '';
    state.segments.forEach((seg, i) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<span>Đoạn ${i+1}: <input type="number" value="${seg.len}" style="width:50px; padding:2px; border:1px solid #cbd5e1; border-radius:4px;" onchange="updateSegment(${i}, this.value)"> mm</span>
                         <button onclick="deleteSegment(${i})">✕</button>`;
        segList.appendChild(div);
    });
    document.getElementById('totalLen').innerText = getTotalLength();

    const supList = document.getElementById('supportList');
    supList.innerHTML = '';
    state.supports.forEach(s => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<span><strong>${s.name}</strong> @ ${s.x}mm <small>(${s.type})</small></span><button onclick="deleteSupport('${s.id}')">✕</button>`;
        supList.appendChild(div);
    });

    const loadList = document.getElementById('loadList');
    loadList.innerHTML = '';
    state.loads.forEach(l => {
        const div = document.createElement('div');
        div.className = 'list-item';
        let desc = l.type.startsWith('q') ? `${l.type}=${l.val} (${l.start}-${l.end}mm)` : `${l.type}=${l.val} @ ${l.x}mm`;
        div.innerHTML = `<span>${desc}</span><button onclick="deleteLoad('${l.id}')">✕</button>`;
        loadList.appendChild(div);
    });
}

function updateSegment(index, val) {
    state.segments[index].len = Math.max(0, parseFloat(val) || 0);
    renderSidebar(); drawCanvas();
}
function addSegment() {
    const len = parseFloat(document.getElementById('newSegLen').value);
    if(len > 0) { state.segments.push({id: uuid(), len}); document.getElementById('newSegLen').value = ''; renderSidebar(); drawCanvas(); }
}
function deleteSegment(i) { state.segments.splice(i, 1); renderSidebar(); drawCanvas(); }

function addSupport() {
    const name = document.getElementById('supName').value;
    const x = parseFloat(document.getElementById('supPos').value);
    const type = document.getElementById('supType').value;
    if(!isNaN(x)) { state.supports.push({id: uuid(), name, x, type}); renderSidebar(); drawCanvas(); }
}
function deleteSupport(id) { state.supports = state.supports.filter(s => s.id !== id); renderSidebar(); drawCanvas(); }

function addLoad() {
    const type = document.getElementById('loadType').value;
    if(type.startsWith('q')) {
        const start = parseFloat(document.getElementById('loadStart').value);
        const end = parseFloat(document.getElementById('loadEnd').value);
        const val = parseFloat(document.getElementById('loadValDist').value);
        if(!isNaN(start) && !isNaN(end) && !isNaN(val)) {
            state.loads.push({id: uuid(), type, start, end, val});
            renderSidebar(); drawCanvas();
        }
    } else {
        const x = parseFloat(document.getElementById('loadPos').value);
        const val = parseFloat(document.getElementById('loadVal').value);
        if(!isNaN(x) && !isNaN(val)) {
            state.loads.push({id: uuid(), type, x, val});
            renderSidebar(); drawCanvas();
        }
    }
}
function deleteLoad(id) { state.loads = state.loads.filter(l => l.id !== id); renderSidebar(); drawCanvas(); }

// ===== LOAD EXAMPLE FEATURE =====
function loadExample() {
    state.segments = [{id: 1, len: 400}];
    state.supports = [
        {id: 's1', name: 'A', x: 0, type: 'fixed'},
        {id: 's2', name: 'B', x: 400, type: 'roller_y'}
    ];
    state.loads = [
        {id: 'l1', type: 'Fy', x: 200, val: -1000},
        {id: 'l2', type: 'Fz', x: 300, val: 500}
    ];
    renderSidebar(); 
    drawCanvas(); 
    calculate();
    closeGuide();
    alert("✅ Đã tải bài tập mẫu!\n\n- Dầm dài 400mm\n- Gối A (x=0), Gối B (x=400)\n- Lực Fy = -1000N tại x=200\n- Lực Fz = 500N tại x=300\n\nHãy bấm 'TÍNH TOÁN' và bật 'Chế độ Học tập' để khám phá!");
}

// ===== SVG DRAWING: SHAFT =====
function drawCanvas() {
    const svg = document.getElementById('svgCanvas');
    const totalLen = getTotalLength();
    const width = svg.clientWidth;
    const height = svg.clientHeight;
    svg.innerHTML = '';
    if(totalLen === 0) return;

    const margin = 80;
    const scale = (width - 2 * margin) / totalLen;
    const cy = height / 2;

    // Shaft
    const shaft = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    shaft.setAttribute("x", margin); shaft.setAttribute("y", cy - 15);
    shaft.setAttribute("width", totalLen * scale); shaft.setAttribute("height", 30);
    shaft.setAttribute("fill", "#f1f5f9"); shaft.setAttribute("stroke", "var(--shaft-color)");
    shaft.setAttribute("stroke-width", "2"); shaft.setAttribute("rx", "4");
    svg.appendChild(shaft);

    // Dimensions
    let currentX = margin;
    state.segments.forEach(seg => {
        const w = seg.len * scale;
        const dim = document.createElementNS("http://www.w3.org/2000/svg", "line");
        dim.setAttribute("x1", currentX); dim.setAttribute("y1", cy + 40);
        dim.setAttribute("x2", currentX + w); dim.setAttribute("y2", cy + 40);
        dim.setAttribute("stroke", "#94a3b8"); dim.setAttribute("stroke-width", "1");
        svg.appendChild(dim);
        
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", currentX + w/2); text.setAttribute("y", cy + 55);
        text.setAttribute("text-anchor", "middle"); text.setAttribute("font-size", "12");
        text.setAttribute("fill", "#64748b"); text.textContent = seg.len;
        svg.appendChild(text);
        currentX += w;
    });

    // Supports
    state.supports.forEach(s => {
        const sx = margin + s.x * scale;
        const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        tri.setAttribute("points", `${sx-12},${cy+15} ${sx+12},${cy+15} ${sx},${cy+35}`);
        tri.setAttribute("fill", "#dcfce7"); tri.setAttribute("stroke", "#16a34a");
        tri.setAttribute("stroke-width", "2");
        svg.appendChild(tri);
        
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", sx); txt.setAttribute("y", cy + 52);
        txt.setAttribute("text-anchor", "middle"); txt.setAttribute("font-size", "14");
        txt.setAttribute("font-weight", "bold"); txt.setAttribute("fill", "#15803d");
        txt.textContent = s.name;
        svg.appendChild(txt);
    });

    // Loads
    state.loads.forEach(l => {
        if(['Fx','Fy','Fz'].includes(l.type)) {
            const lx = margin + l.x * scale;
            let dir = l.val > 0 ? 1 : -1;
            let startY = cy + dir * 15;
            let endY = cy + dir * 60;
            let color = "#ef4444"; // Default red for Y
            if(l.type === 'Fz') color = "#3b82f6"; // Blue for Z
            if(l.type === 'Fx') color = "#f59e0b"; // Orange for X

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", lx); line.setAttribute("y1", startY);
            line.setAttribute("x2", lx); line.setAttribute("y2", endY);
            line.setAttribute("stroke", color); line.setAttribute("stroke-width", "3");
            svg.appendChild(line);

            const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            arrow.setAttribute("points", `${lx-6},${endY - dir*6} ${lx+6},${endY - dir*6} ${lx},${endY}`);
            arrow.setAttribute("fill", color);
            svg.appendChild(arrow);

            const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
            txt.setAttribute("x", lx + 10); 
            txt.setAttribute("y", startY + (dir > 0 ? 15 : 0));
            txt.setAttribute("font-size", "12"); txt.setAttribute("font-weight", "bold");
            txt.setAttribute("fill", color);
            txt.textContent = `${l.type}=${l.val}`;
            svg.appendChild(txt);
        } else if (l.type.startsWith('q')) {
            const x1 = margin + l.start * scale;
            const x2 = margin + l.end * scale;
            const dir = l.val > 0 ? 1 : -1;
            const yBase = cy + dir * 15;
            const yTop = cy + dir * 45;
            let color = "#ef4444";
            if(l.type === 'qz') color = "#3b82f6";
            if(l.type === 'qx') color = "#f59e0b";

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", x1); rect.setAttribute("y", dir > 0 ? yTop : yBase);
            rect.setAttribute("width", x2 - x1); rect.setAttribute("height", 30);
            rect.setAttribute("fill", color + "33"); // 20% opacity
            svg.appendChild(rect);

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", x1); line.setAttribute("y1", yTop);
            line.setAttribute("x2", x2); line.setAttribute("y2", yTop);
            line.setAttribute("stroke", color); line.setAttribute("stroke-width", "2");
            svg.appendChild(line);

            const steps = Math.floor((x2 - x1) / 15);
            for(let i=0; i<=steps; i++) {
                const ax = x1 + i * 15;
                const aLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                aLine.setAttribute("x1", ax); aLine.setAttribute("y1", yTop);
                aLine.setAttribute("x2", ax); aLine.setAttribute("y2", yBase);
                aLine.setAttribute("stroke", color); aLine.setAttribute("stroke-width", "1");
                svg.appendChild(aLine);
            }
            
            const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
            txt.setAttribute("x", x1 + (x2-x1)/2); txt.setAttribute("y", yTop + (dir > 0 ? -5 : 50));
            txt.setAttribute("text-anchor", "middle"); txt.setAttribute("font-size", "12");
            txt.setAttribute("font-weight", "bold"); txt.setAttribute("fill", color);
            txt.textContent = `${l.type}=${l.val}`;
            svg.appendChild(txt);
        }
    });
}

// ===== CORE SOLVER (3D Statics) =====
function getInternalForces(x) {
    const L = getTotalLength();
    const sortedSups = [...state.supports].sort((a,b) => a.x - b.x);
    if(sortedSups.length < 2) return null;

    const supA = sortedSups[0];
    const supB = sortedSups[1];

    // 1. Calculate Reactions
    let sumFx = 0, sumFy = 0, sumFz = 0;
    let sumMxA = 0, sumMyA = 0, sumMzA = 0;

    state.loads.forEach(l => {
        if(l.type === 'Fx') sumFx += l.val;
        if(l.type === 'Fy') { sumFy += l.val; sumMzA += l.val * (l.x - supA.x); }
        if(l.type === 'Fz') { sumFz += l.val; sumMyA += l.val * (l.x - supA.x); }
        if(l.type === 'Mx') sumMxA += l.val;
        if(l.type === 'My') sumMyA += l.val;
        if(l.type === 'Mz') sumMzA += l.val;
        
        if(l.type === 'qx') {
            const total = l.val * (l.end - l.start);
            sumFx += total;
        }
        if(l.type === 'qy') {
            const total = l.val * (l.end - l.start);
            const centroid = l.start + (l.end - l.start) / 2;
            sumFy += total; sumMzA += total * (centroid - supA.x);
        }
        if(l.type === 'qz') {
            const total = l.val * (l.end - l.start);
            const centroid = l.start + (l.end - l.start) / 2;
            sumFz += total; sumMyA += total * (centroid - supA.x);
        }
    });

    // Solve reactions (Simplified for 2 main supports)
    const RxB = 0; // Assume A takes all X for simplicity in this basic model, or distribute if both fixed
    const RxA = -sumFx;
    
    const RyB = -sumMzA / (supB.x - supA.x);
    const RyA = -sumFy - RyB;
    
    const RzB = -sumMyA / (supB.x - supA.x);
    const RzA = -sumFz - RzB;

    const RxA_val = supA.type === 'fixed' ? RxA : 0;
    const RyA_val = (supA.type === 'fixed' || supA.type === 'roller_z') ? RyA : 0;
    const RzA_val = (supA.type === 'fixed' || supA.type === 'roller_y') ? RzA : 0;

    const RyB_val = (supB.type === 'fixed' || supB.type === 'roller_z') ? RyB : 0;
    const RzB_val = (supB.type === 'fixed' || supB.type === 'roller_y') ? RzB : 0;

    // 2. Calculate Internal Forces at section x
    let N = 0, Qy = 0, Qz = 0, Mx = 0, My = 0, Mz = 0;

    // Support A contributions
    if(x > supA.x) {
        N += RxA_val;
        Qy += RyA_val; Qz += RzA_val;
        Mz += RyA_val * (x - supA.x);
        My += RzA_val * (x - supA.x);
    }
    // Support B contributions
    if(x > supB.x) {
        Qy += RyB_val; Qz += RzB_val;
        Mz += RyB_val * (x - supB.x);
        My += RzB_val * (x - supB.x);
    }

    // Load contributions
    state.loads.forEach(l => {
        if(l.type === 'Fx' && l.x < x) N += l.val;
        if(l.type === 'Fy' && l.x < x) { Qy += l.val; Mz += l.val * (x - l.x); }
        if(l.type === 'Fz' && l.x < x) { Qz += l.val; My += l.val * (x - l.x); }
        if(l.type === 'Mx' && l.x < x) Mx += l.val;
        if(l.type === 'My' && l.x < x) My += l.val;
        if(l.type === 'Mz' && l.x < x) Mz += l.val;

        if(l.type === 'qx') {
            const effEnd = Math.min(l.end, x);
            if(effEnd > l.start) N += l.val * (effEnd - l.start);
        }
        if(l.type === 'qy') {
            const effEnd = Math.min(l.end, x);
            if(effEnd > l.start) {
                const len = effEnd - l.start;
                const total = l.val * len;
                const centroid = l.start + len / 2;
                Qy += total; Mz += total * (x - centroid);
            }
        }
        if(l.type === 'qz') {
            const effEnd = Math.min(l.end, x);
            if(effEnd > l.start) {
                const len = effEnd - l.start;
                const total = l.val * len;
                const centroid = l.start + len / 2;
                Qz += total; My += total * (x - centroid);
            }
        }
    });

    return { RxA: RxA_val, RyA: RyA_val, RzA: RzA_val, RyB: RyB_val, RzB: RzB_val, N, Qy, Qz, Mx, My, Mz };
}

function calculate() {
    const L = getTotalLength();
    if(state.supports.length < 2) {
        alert("Cần ít nhất 2 gối đỡ để giải bài toán tĩnh học!");
        return;
    }

    const steps = 300; // High resolution for smooth curves
    const dx = L / steps;
    let points = [];
    let maxMsum = 0, maxX = 0;

    for(let i = 0; i <= steps; i++) {
        const x = i * dx;
        const forces = getInternalForces(x);
        if(!forces) continue;

        const Msum = Math.sqrt(forces.My * forces.My + forces.Mz * forces.Mz);
        if(Msum > maxMsum) { maxMsum = Msum; maxX = x; }

        points.push({ 
            x: parseFloat(x.toFixed(2)), 
            N: forces.N, Qy: forces.Qy, Qz: forces.Qz, 
            Mx: forces.Mx, My: forces.My, Mz: forces.Mz, 
            Msum 
        });
    }

    const forces0 = getInternalForces(0);
    state.results = {
        reactions: { 
            [state.supports[0].name]: { Rx: forces0.RxA, Ry: forces0.RyA, Rz: forces0.RzA }, 
            [state.supports[1].name]: { Ry: forces0.RyB, Rz: forces0.RzB } 
        },
        points: points,
        maxMsum: maxMsum,
        maxMsumX: maxX
    };

    renderResults();
    drawDiagram();
    if(state.studyMode) updateCutSection(L/2);
}

// ===== SVG DRAWING: DIAGRAMS =====
function drawDiagram() {
    const svg = document.getElementById('svgDiagram');
    svg.innerHTML = '';
    if(!state.results) return;

    const width = svg.clientWidth;
    const height = svg.clientHeight;
    const margin = 50;
    const L = getTotalLength();
    const points = state.results.points;
    const data = points.map(p => p[state.activeTab]);

    let maxV = Math.max(...data.map(Math.abs), 1);
    const scaleX = (width - 2 * margin) / L;
    const scaleY = (height - 60) / (2 * maxV);
    const zeroY = height / 2;

    // Zero line
    const zLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    zLine.setAttribute("x1", margin); zLine.setAttribute("y1", zeroY);
    zLine.setAttribute("x2", width - margin); zLine.setAttribute("y2", zeroY);
    zLine.setAttribute("stroke", "#cbd5e1"); zLine.setAttribute("stroke-width", "1");
    zLine.setAttribute("stroke-dasharray", "4");
    svg.appendChild(zLine);

    // Hatching
    const hatchGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    hatchGroup.setAttribute("stroke", "rgba(0,0,0,0.1)");
    hatchGroup.setAttribute("stroke-width", "1");
    
    let d = `M ${margin} ${zeroY}`;
    for(let i = 0; i < points.length; i++) {
        const p = points[i];
        const px = margin + p.x * scaleX;
        const val = p[state.activeTab];
        const py = zeroY - val * scaleY; 
        
        d += ` L ${px} ${py}`;

        if(i % 3 === 0) { // Hatch every 3rd point for performance
            const hatchLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            hatchLine.setAttribute("x1", px); hatchLine.setAttribute("y1", zeroY);
            hatchLine.setAttribute("x2", px); hatchLine.setAttribute("y2", py);
            hatchGroup.appendChild(hatchLine);
        }
    }
    d += ` L ${margin + L*scaleX} ${zeroY} Z`;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    const isMoment = state.activeTab.startsWith('M');
    path.setAttribute("fill", isMoment ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)");
    path.setAttribute("stroke", isMoment ? "#f59e0b" : "#ef4444");
    path.setAttribute("stroke-width", "2");
    
    svg.appendChild(hatchGroup);
    svg.appendChild(path);

    // Axis Labels
    const yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yLabel.setAttribute("x", 15); yLabel.setAttribute("y", height/2);
    yLabel.setAttribute("text-anchor", "middle"); yLabel.setAttribute("font-size", "12");
    yLabel.setAttribute("font-weight", "bold"); yLabel.setAttribute("fill", "#475569");
    yLabel.setAttribute("transform", `rotate(-90, 15, ${height/2})`);
    const unit = state.activeTab === 'N' || state.activeTab.startsWith('Q') ? '(N)' : '(N.mm)';
    yLabel.textContent = state.activeTab + ' ' + unit;
    svg.appendChild(yLabel);

    // Interactive Hover
    if(state.studyMode) {
        const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        tooltip.setAttribute("r", 5); tooltip.setAttribute("fill", "#1e293b"); tooltip.setAttribute("opacity", "0");
        svg.appendChild(tooltip);

        svg.addEventListener("mousemove", (e) => {
            const rect = svg.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const xVal = (mx - margin) / scaleX;
            
            if(xVal >= 0 && xVal <= L) {
                const nearest = points.reduce((prev, curr) => Math.abs(curr.x - xVal) < Math.abs(prev.x - xVal) ? curr : prev);
                
                tooltip.setAttribute("cx", margin + nearest.x * scaleX);
                tooltip.setAttribute("cy", zeroY - nearest[state.activeTab] * scaleY);
                tooltip.setAttribute("opacity", "1");

                updateCutSection(nearest.x);
            }
        });
        svg.addEventListener("mouseleave", () => { tooltip.setAttribute("opacity", "0"); });
    }
}

// ===== EDUCATIONAL FEATURE: CUT SECTION EXPLAINER =====
function updateCutSection(x) {
    const forces = getInternalForces(x);
    if(!forces) return;

    document.getElementById('cutSectionHint').style.display = 'none';
    const box = document.getElementById('cutSectionContent');
    box.style.display = 'block';
    document.getElementById('cutX').innerText = x.toFixed(1);

    let math = `📌 Xét cân bằng phần bên TRÁI mặt cắt tại x = ${x.toFixed(1)} mm:\n\n`;
    
    math += `1. Lực dọc (N):\n   N = ∑Fx (bên trái)\n   N = ${forces.N.toFixed(2)} N\n\n`;
    
    math += `2. Lực cắt đứng (Qy):\n   Qy = ∑Fy (bên trái)\n   Qy = ${forces.Qy.toFixed(2)} N\n\n`;
    
    math += `3. Mô men uốn (Mz):\n   Mz = ∑M (tại mặt cắt)\n   Mz = ${forces.Mz.toFixed(2)} N.mm`;

    document.getElementById('cutMath').innerText = math;
}

function switchTab(tab, element) {
    state.activeTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if(element) element.classList.add('active');
    drawDiagram();
}

function renderResults() {
    const r = state.results;
    let html = '';
    for(let sup of state.supports) {
        const react = r.reactions[sup.name] || {};
        let parts = [];
        if(react.Rx) parts.push(`Rx=${react.Rx.toFixed(1)}`);
        if(react.Ry) parts.push(`Ry=${react.Ry.toFixed(1)}`);
        if(react.Rz) parts.push(`Rz=${react.Rz.toFixed(1)}`);
        html += `<div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid #e2e8f0;">
                    <span>Gối <strong>${sup.name}</strong>:</span>
                    <span style="font-weight:600; color:#15803d">${parts.join(', ') || '0'}</span>
                 </div>`;
    }
    document.getElementById('reactionsContent').innerHTML = html || 'Không có dữ liệu';

    document.getElementById('dangerousContent').innerHTML = `
        Vị trí: <strong>x = ${r.maxMsumX.toFixed(1)} mm</strong><br>
        Mô men tổng hợp: <strong style="color:#dc2626; font-size:16px;">${r.maxMsum.toFixed(1)} N.mm</strong>
    `;

    const tbody = document.querySelector('#resultTable tbody');
    tbody.innerHTML = '';
    const keyPoints = new Set([0, getTotalLength()]);
    state.supports.forEach(s => keyPoints.add(s.x));
    state.loads.forEach(l => { 
        if(!l.type.startsWith('q')) keyPoints.add(l.x); 
        else { keyPoints.add(l.start); keyPoints.add(l.end); }
    });
    
    Array.from(keyPoints).sort((a,b)=>a-b).forEach(x => {
        const p = r.points.reduce((prev, curr) => Math.abs(curr.x - x) < Math.abs(prev.x - x) ? curr : prev);
        tbody.innerHTML += `<tr>
            <td><strong>${p.x.toFixed(1)}</strong></td>
            <td>${p.N.toFixed(1)}</td>
            <td>${p.Qy.toFixed(1)}</td>
            <td>${p.Mz.toFixed(1)}</td>
        </tr>`;
    });
}

function toggleStudyMode() {
    state.studyMode = !state.studyMode;
    document.getElementById('studyModePanel').style.display = state.studyMode ? 'block' : 'none';
    if(state.studyMode && state.results) {
        drawDiagram();
        updateCutSection(getTotalLength()/2);
    }
}

// ===== FILE & EXPORT =====
function newProject() {
    if(confirm("Xóa toàn bộ dữ liệu hiện tại?")) {
        state = { segments: [{id: 1, len: 100}], supports: [], loads: [], results: null, activeTab: 'Qy', studyMode: state.studyMode };
        renderSidebar(); drawCanvas();
        document.getElementById('reactionsContent').innerText = 'Chưa tính toán.';
        document.querySelector('#resultTable tbody').innerHTML = '';
    }
}
function saveProject() {
    const blob = new Blob([JSON.stringify(state)], {type: "application/json"});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "bai_tap_noi_luc.json"; a.click();
}
function loadProject(event) {
    const reader = new FileReader();
    reader.onload = e => {
        Object.assign(state, JSON.parse(e.target.result));
        renderSidebar(); drawCanvas();
        if(state.results) { renderResults(); drawDiagram(); }
    };
    reader.readAsText(event.target.files[0]);
}
function exportCSV() {
    if(!state.results) return alert("Vui lòng bấm TÍNH TOÁN trước!");
    let csv = "x,N,Qy,Qz,Mx,My,Mz,Msum\n";
    state.results.points.forEach(p => csv += `${p.x},${p.N},${p.Qy},${p.Qz},${p.Mx},${p.My},${p.Mz},${p.Msum}\n`);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type: "text/csv"})); a.download = "ket_qua_noi_luc.csv"; a.click();
}

// ===== MODAL =====
function openGuide() { document.getElementById('guideModal').style.display = 'flex'; }
function closeGuide() { document.getElementById('guideModal').style.display = 'none'; }
window.addEventListener('click', (e) => { if(e.target === document.getElementById('guideModal')) closeGuide(); });
window.addEventListener('resize', () => { drawCanvas(); if(state.results) drawDiagram(); });

// ===== INIT =====
renderSidebar();
drawCanvas();
// Auto-calculate on load so the student sees something immediately
setTimeout(calculate, 500);