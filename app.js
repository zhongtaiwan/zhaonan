document.addEventListener("DOMContentLoaded", async () => {
  let timetableData = [];
  let homerooms = {};
  const days = ["一", "二", "三", "四", "五"];

  // 1. 讀取設定檔與課表資料
  try {
    const [csvRes, hrRes] = await Promise.all([
      fetch(CONFIG.timetableFile),
      fetch(CONFIG.homeroomFile)
    ]);
    const csvText = await csvRes.text();
    homerooms = await hrRes.json();
    timetableData = parseCSV(csvText);
  } catch (err) {
    console.error("資料載入失敗", err);
    alert("課表檔案載入失敗，請確認檔案路徑是否正確！");
    return;
  }

  // 2. 收集所有班級與教師清單
  const classes = [...new Set(timetableData.map(d => d.className))].sort();
  const teachers = [...new Set(timetableData.flatMap(d => d.teacher.split("/")))]
    .filter(t => t && t.trim() !== "")
    .sort((a, b) => a.localeCompare(b, "zh-Hant"));

  // 3. 綁定下拉選單
  const searchType = document.getElementById("search-type");
  const classGroup = document.getElementById("class-select-group");
  const teacherGroup = document.getElementById("teacher-select-group");
  const classSelect = document.getElementById("class-select");
  const teacherSelect = document.getElementById("teacher-select");

  classSelect.innerHTML = classes.map(c => `<option value="${c}">${c} 班</option>`).join("");
  teacherSelect.innerHTML = teachers.map(t => `<option value="${t}">${t} 老師</option>`).join("");

  searchType.addEventListener("change", () => {
    if (searchType.value === "class") {
      classGroup.style.display = "flex";
      teacherGroup.style.display = "none";
      renderClass(classSelect.value);
    } else {
      classGroup.style.display = "none";
      teacherGroup.style.display = "flex";
      renderTeacher(teacherSelect.value);
    }
  });

  classSelect.addEventListener("change", () => renderClass(classSelect.value));
  teacherSelect.addEventListener("change", () => renderTeacher(teacherSelect.value));

  // 預設渲染第一個班級
  if (classes.length > 0) renderClass(classes[0]);

  // 渲染班級課表
  function renderClass(cls) {
    document.getElementById("current-target-title").innerText = `${cls} 班課表`;
    const hr = homerooms[cls];
    document.getElementById("homeroom-info").innerText = hr ? `導師：${hr}` : "";
    
    const grid = buildGrid(timetableData.filter(d => d.className === cls), "teacher");
    renderTable(grid);
  }

  // 渲染教師課表
  function renderTeacher(tea) {
    document.getElementById("current-target-title").innerText = `${tea} 老師課表`;
    document.getElementById("homeroom-info").innerText = "";

    const filtered = timetableData.filter(d => d.teacher.split("/").includes(tea));
    const grid = buildGrid(filtered, "className");
    renderTable(grid);
  }

  function buildGrid(list, subField) {
    const grid = {};
    CONFIG.periods.forEach(p => {
      grid[p.id] = {};
      days.forEach(d => grid[p.id][d] = null);
    });

    list.forEach(item => {
      if (grid[item.period] && days.includes(item.day)) {
        grid[item.period][item.day] = {
          subject: item.subject,
          subText: item[subField]
        };
      }
    });
    return grid;
  }

  function renderTable(grid) {
    const tbody = document.getElementById("timetable-body");
    tbody.innerHTML = CONFIG.periods.map(p => {
      const rowTds = days.map(d => {
        const cell = grid[p.id][d];
        if (!cell) return `<td></td>`;
        return `
          <td>
            <div class="course-name">${cell.subject}</div>
            <span class="course-sub">${cell.subText}</span>
          </td>
        `;
      }).join("");

      return `
        <tr>
          <td class="period-cell">
            ${p.name}
            <span class="period-time">${p.time}</span>
          </td>
          ${rowTds}
        </tr>
      `;
    }).join("");
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length <= 1) return [];
    return lines.slice(1).map(line => {
      const parts = line.split(",");
      return {
        className: parts[0]?.trim(),
        day: parts[1]?.trim(),
        period: parts[2]?.trim(),
        subject: parts[3]?.trim(),
        teacher: parts[4]?.trim()
      };
    }).filter(d => d.className && d.day && d.period);
  }
});
