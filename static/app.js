/* SQL 练习平台前端逻辑 */
const $ = (s) => document.querySelector(s);

/* ---------------- SQL 编辑器（CodeMirror，加载失败则退回普通文本框） ---------------- */
let cm = null;
if (window.CodeMirror) {
  cm = CodeMirror.fromTextArea($("#sqlInput"), {
    mode: "text/x-sql",
    theme: "dracula",
    lineNumbers: true,
    lineWrapping: true,
    extraKeys: { "Ctrl-Enter": runQuery },
  });
  $("#sqlInput").style.display = "none";
} else {
  const ta = $("#sqlInput");
  ta.className = "plain-editor";
  ta.style.display = "block";
  ta.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") runQuery();
  });
}
function getSQL() { return cm ? cm.getValue() : $("#sqlInput").value; }
function setSQL(v) {
  if (cm) { cm.setValue(v); cm.focus(); }
  else { $("#sqlInput").value = v; $("#sqlInput").focus(); }
}

/* ---------------- 提示消息 ---------------- */
function toast(msg, ok = true) {
  const el = document.createElement("div");
  el.className = "toast-item " + (ok ? "toast-ok" : "toast-err");
  el.textContent = msg;
  $("#toast").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ---------------- 执行 SQL ---------------- */
let lastSQL = "";
let showAll = false;  // 全部行模式：不限 500 行

async function runQuery() {
  const sql = getSQL().trim();
  if (!sql) { toast("请输入 SQL 语句", false); return; }
  lastSQL = sql;
  setStatus("执行中…", "");
  try {
    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql, all: showAll }),
    });
    renderResult(await res.json());
  } catch (e) {
    renderResult({ success: false, error: "网络错误：" + e.message });
  }
}

function setStatus(text, cls) {
  const sb = $("#statusBar");
  sb.textContent = text;
  sb.className = "status-bar " + cls;
}

function esc(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderResult(data) {
  const box = $("#resultBox");
  if (!data.success) {
    setStatus("✖ 执行出错", "status-err");
    box.innerHTML = `<div class="msg-box msg-err">❌ ${esc(data.error)}</div>`;
    return;
  }
  if (!data.columns) {
    setStatus(`✔ 成功 · ${data.elapsed} ms`, "status-ok");
    box.innerHTML = `<div class="msg-box msg-ok">✅ ${esc(data.message)}</div>`;
    loadTables();
    return;
  }
  let note = data.truncated ? "（仅显示前 " + data.row_count + " 行，点右上角「全部行」看全部）" : "";
  if (showAll && !note) note = "（全部行模式）";
  setStatus(`✔ 成功 · ${data.row_count} 行 · ${data.elapsed} ms ${note}`, "status-ok");
  let html = "<table class='result-table'><thead><tr>";
  data.columns.forEach((c) => (html += `<th>${esc(c)}</th>`));
  html += "</tr></thead><tbody>";
  if (data.rows.length === 0) {
    html += `<tr><td colspan="${data.columns.length}" class="null-val">（结果为空）</td></tr>`;
  }
  data.rows.forEach((r) => {
    html += "<tr>";
    r.forEach((v) => {
      html += v === null ? "<td class='null-val'>NULL</td>" : `<td>${esc(v)}</td>`;
    });
    html += "</tr>";
  });
  box.innerHTML = html + "</tbody></table>";
}

/* ---------------- 数据表列表 ---------------- */
async function loadTables() {
  try {
    const res = await fetch("/api/tables");
    const data = await res.json();
    const list = $("#tableList");
    list.innerHTML = "";
    data.tables.forEach((t) => {
      const card = document.createElement("div");
      card.className = "tbl-card";
      let cols = "";
      t.columns.forEach((c) => {
        cols += `<div class="col-line" title="点击插入列名">
          <span class="cname">${esc(c.name)}</span><span class="ctype">${esc(c.type)}</span></div>`;
      });
      card.innerHTML = `<div class="tbl-head">🗃 <span class="tbl-name" title="点击插入表名">${esc(t.name)}</span>
        <span class="rows-badge">${t.row_count} 行</span></div>
        <div class="tbl-cols">${cols}</div>`;
      card.querySelector(".tbl-head").addEventListener("click", () => {
        card.classList.toggle("open");
      });
      card.querySelector(".tbl-name").addEventListener("click", (e) => {
        e.stopPropagation();
        insertAtCursor(sqlIdent(t.name));
        toast(`已插入表名 ${t.name}`);
      });
      card.querySelectorAll(".col-line").forEach((el, i) => {
        el.addEventListener("click", () => insertAtCursor(sqlIdent(t.columns[i].name)));
      });
      list.appendChild(card);
    });
  } catch (e) { /* 忽略 */ }
}

function insertAtCursor(text) {
  if (cm) { cm.replaceSelection(text); cm.focus(); }
  else { const t = $("#sqlInput"); t.setRangeText(text); t.focus(); }
}

/* 标识符以数字开头时需要加双引号才能在 SQL 中使用 */
function sqlIdent(name) {
  return /^[0-9]/.test(name) ? '"' + name + '"' : name;
}

/* ---------------- 上传 Excel（先弹窗命名表） ---------------- */
let pendingFile = null;

function requestUpload(file) {
  if (!file) return;
  if (!/\.xlsx?$/i.test(file.name)) { toast("仅支持 .xlsx / .xls 文件", false); return; }
  pendingFile = file;
  $("#uploadFileName").textContent = file.name;
  $("#tableNameInput").value = file.name.replace(/\.[^.]+$/, "");
  $("#nameModal").classList.add("show");
  setTimeout(() => {
    const inp = $("#tableNameInput");
    inp.focus(); inp.select();
  }, 50);
}

$("#nameConfirm").addEventListener("click", () => {
  const name = $("#tableNameInput").value.trim();
  $("#nameModal").classList.remove("show");
  uploadFile(pendingFile, name);
  pendingFile = null;
});
$("#nameCancel").addEventListener("click", () => {
  $("#nameModal").classList.remove("show");
  pendingFile = null;
});
$("#tableNameInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#nameConfirm").click();
});
$("#nameModal").addEventListener("click", (e) => {
  if (e.target.id === "nameModal") {
    $("#nameModal").classList.remove("show");
    pendingFile = null;
  }
});

async function uploadFile(file, tableName) {
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);
  if (tableName) fd.append("table_name", tableName);
  toast(`正在导入 ${file.name} …`);
  try {
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.success) {
      toast("✅ " + data.message);
      loadTables();
      setSQL("SELECT * FROM " + sqlIdent(data.tables[0].name) + ";");
    } else {
      toast("❌ " + data.error, false);
    }
  } catch (e) {
    toast("上传失败：" + e.message, false);
  }
}

$("#uploadBtn").addEventListener("click", () => $("#fileInput").click());
$("#fileInput").addEventListener("change", (e) => {
  requestUpload(e.target.files[0]);
  e.target.value = "";
});

/* 拖拽上传 */
let dragCount = 0;
window.addEventListener("dragenter", (e) => {
  e.preventDefault(); dragCount++;
  $("#dropOverlay").classList.add("show");
});
window.addEventListener("dragleave", (e) => {
  e.preventDefault(); dragCount--;
  if (dragCount <= 0) { dragCount = 0; $("#dropOverlay").classList.remove("show"); }
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  e.preventDefault(); dragCount = 0;
  $("#dropOverlay").classList.remove("show");
  if (e.dataTransfer.files.length) requestUpload(e.dataTransfer.files[0]);
});

/* ---------------- 重置数据库 ---------------- */
$("#resetBtn").addEventListener("click", async () => {
  if (!confirm("确定要重置数据库吗？\n将恢复内置示例数据，并清除所有上传的表和修改。")) return;
  const res = await fetch("/api/reset", { method: "POST" });
  const data = await res.json();
  if (data.success) { toast("✅ " + data.message); loadTables(); }
  else toast("❌ " + data.error, false);
});

/* ---------------- 侧栏选项卡 ---------------- */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    $("#tab-tables").classList.toggle("hidden", tab.dataset.tab !== "tables");
    $("#tab-exercises").classList.toggle("hidden", tab.dataset.tab !== "exercises");
  });
});

/* ---------------- 练习题 ---------------- */
const EXERCISES = [
  { lv: 1, title: "查询全部数据", q: "查询 employees（员工表）中的所有数据。", a: "SELECT * FROM employees;" },
  { lv: 1, title: "查询指定列", q: "只查询所有员工的姓名（name）和工资（salary）两列。", a: "SELECT name, salary FROM employees;" },
  { lv: 1, title: "WHERE 条件筛选", q: "查询工资大于 15000 的员工姓名和工资。", a: "SELECT name, salary FROM employees\nWHERE salary > 15000;" },
  { lv: 1, title: "排序 ORDER BY", q: "查询所有员工的姓名和工资，按工资从高到低排序。", a: "SELECT name, salary FROM employees\nORDER BY salary DESC;" },
  { lv: 1, title: "模糊查询 LIKE", q: "查询姓名中包含「小」字的所有学生。", a: "SELECT * FROM students\nWHERE name LIKE '%小%';" },
  { lv: 2, title: "限制行数 LIMIT", q: "查询价格最高的 5 件商品的名称和价格。", a: "SELECT product_name, price FROM products\nORDER BY price DESC\nLIMIT 5;" },
  { lv: 2, title: "聚合函数", q: "统计员工总人数、平均工资、最高工资和最低工资。", a: "SELECT COUNT(*) AS 总人数,\n       ROUND(AVG(salary), 2) AS 平均工资,\n       MAX(salary) AS 最高工资,\n       MIN(salary) AS 最低工资\nFROM employees;" },
  { lv: 2, title: "分组 GROUP BY", q: "统计每个部门（dept_id）的员工人数，按人数从多到少排序。", a: "SELECT dept_id, COUNT(*) AS emp_count\nFROM employees\nGROUP BY dept_id\nORDER BY emp_count DESC;" },
  { lv: 2, title: "日期条件", q: "查询 2020 年 1 月 1 日之后入职的员工姓名和入职日期。", a: "SELECT name, hire_date FROM employees\nWHERE hire_date > '2020-01-01';" },
  { lv: 2, title: "子查询", q: "查询工资高于全公司平均工资的员工姓名和工资。", a: "SELECT name, salary FROM employees\nWHERE salary > (SELECT AVG(salary) FROM employees);" },
  { lv: 3, title: "表连接 JOIN", q: "查询每个员工的姓名、工资和所在部门名称（连接 employees 和 departments）。", a: "SELECT e.name, e.salary, d.dept_name\nFROM employees e\nJOIN departments d ON e.dept_id = d.dept_id;" },
  { lv: 3, title: "HAVING 筛选分组", q: "查询平均工资超过 12000 的部门名称及其平均工资。", a: "SELECT d.dept_name, ROUND(AVG(e.salary), 2) AS avg_salary\nFROM employees e\nJOIN departments d ON e.dept_id = d.dept_id\nGROUP BY d.dept_name\nHAVING AVG(e.salary) > 12000;" },
  { lv: 3, title: "多列分组统计", q: "统计每个商品分类的商品数量、平均价格和总库存。", a: "SELECT category,\n       COUNT(*) AS 商品数量,\n       ROUND(AVG(price), 2) AS 平均价格,\n       SUM(stock) AS 总库存\nFROM products\nGROUP BY category;" },
  { lv: 3, title: "综合：消费排行榜", q: "查询订单总金额最高的前 3 位客户及其总金额（orders 表）。", a: "SELECT customer_name, SUM(amount) AS total_amount\nFROM orders\nGROUP BY customer_name\nORDER BY total_amount DESC\nLIMIT 3;" },
  { lv: 3, title: "综合：学生总分排名", q: "查询每个学生的总分，按总分从高到低排名（连接 students 和 scores）。", a: "SELECT s.name, s.class, SUM(sc.score) AS total_score\nFROM students s\nJOIN scores sc ON s.student_id = sc.student_id\nGROUP BY s.student_id, s.name, s.class\nORDER BY total_score DESC;" },
];
const LV_NAME = { 1: "简单", 2: "中等", 3: "困难" };

function renderExercises() {
  const list = $("#exerciseList");
  EXERCISES.forEach((ex, i) => {
    const card = document.createElement("div");
    card.className = "ex-card";
    card.innerHTML = `
      <div class="ex-head">
        <span class="ex-level lv-${ex.lv}">${LV_NAME[ex.lv]}</span>
        <span>${i + 1}. ${esc(ex.title)}</span>
      </div>
      <div class="ex-body">
        <div class="ex-q">${esc(ex.q)}</div>
        <div class="ex-answer">${esc(ex.a)}</div>
        <div class="ex-btns">
          <button class="btn btn-sm act-show">👁 查看答案</button>
          <button class="btn btn-sm act-fill">✏️ 填入编辑器</button>
        </div>
      </div>`;
    card.querySelector(".ex-head").addEventListener("click", () => {
      card.classList.toggle("open");
    });
    card.querySelector(".act-show").addEventListener("click", (e) => {
      const ans = card.querySelector(".ex-answer");
      const show = ans.style.display !== "block";
      ans.style.display = show ? "block" : "none";
      e.target.textContent = show ? "🙈 隐藏答案" : "👁 查看答案";
    });
    card.querySelector(".act-fill").addEventListener("click", () => {
      setSQL(ex.a);
      toast("已填入编辑器，点击运行试试");
    });
    list.appendChild(card);
  });
}

/* ---------------- 按钮事件 ---------------- */
$("#runBtn").addEventListener("click", runQuery);
$("#clearBtn").addEventListener("click", () => setSQL(""));

/* ---------------- 主题切换 ---------------- */
const CM_THEMES = {
  blue: "dracula",
  purple: "material-palenight",
  green: "material-darker",
  amber: "monokai",
  light: "eclipse",
  sunset: "monokai",
  cyber: "dracula",
  candy: "material-palenight",
  ocean: "material-darker",
};
function applyTheme(name) {
  if (!CM_THEMES[name]) name = "blue";
  document.body.setAttribute("data-theme", name);
  if (cm) cm.setOption("theme", CM_THEMES[name]);
  localStorage.setItem("sql-theme", name);
  $("#themeSelect").value = name;
}
$("#themeSelect").addEventListener("change", (e) => applyTheme(e.target.value));
applyTheme(localStorage.getItem("sql-theme") || "blue");

/* ---------------- 复制编辑器内容 ---------------- */
$("#copyBtn").addEventListener("click", async () => {
  const text = getSQL();
  if (!text.trim()) { toast("编辑器是空的，没有内容可复制", false); return; }
  try {
    await navigator.clipboard.writeText(text);
    toast("✅ 已复制到剪贴板");
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast("✅ 已复制到剪贴板");
  }
});

/* ---------------- 清理缓存（仅浏览器本地数据，不动数据库） ---------------- */
$("#cacheBtn").addEventListener("click", () => {
  if (!confirm("清理本网站在浏览器中的缓存数据（localStorage 等）？\n不会影响数据库中的表，清理后页面自动刷新。\n（主题等个性化设置会恢复默认）")) return;
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  toast("✅ 缓存已清理，正在刷新页面…");
  setTimeout(() => location.reload(), 600);
});

/* ---------------- 全部行开关 ---------------- */
$("#allRowsBtn").addEventListener("click", () => {
  showAll = !showAll;
  $("#allRowsBtn").classList.toggle("active", showAll);
  const isSelect = /^\s*(select|with|pragma)/i.test(lastSQL);
  if (showAll) {
    toast("已开启「全部行」模式" + (isSelect ? "，正在重新查询…" : "，下次执行生效"));
    if (isSelect) runQuery();
  } else {
    toast("已恢复 500 行上限");
    if (isSelect) runQuery();
  }
});

/* ---------------- 编辑器高度拖拽条 ---------------- */
const splitter = $("#splitter");
let resizing = false, resizeStartY = 0, resizeStartH = 0;

function currentEditorHeight() {
  return cm ? cm.getWrapperElement().offsetHeight : $("#sqlInput").offsetHeight;
}
function setEditorHeight(h) {
  h = Math.min(Math.max(h, 100), window.innerHeight - 240);
  if (cm) cm.setSize(null, h);
  else $("#sqlInput").style.height = h + "px";
}
splitter.addEventListener("mousedown", (e) => {
  resizing = true;
  resizeStartY = e.clientY;
  resizeStartH = currentEditorHeight();
  document.body.classList.add("resizing");
  e.preventDefault();
});
window.addEventListener("mousemove", (e) => {
  if (resizing) setEditorHeight(resizeStartH + (e.clientY - resizeStartY));
});
window.addEventListener("mouseup", () => {
  if (resizing) { resizing = false; document.body.classList.remove("resizing"); }
});
splitter.addEventListener("dblclick", () => setEditorHeight(180));

/* ---------------- 初始化 ---------------- */
loadTables();
renderExercises();
