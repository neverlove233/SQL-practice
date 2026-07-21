/* SQL 文档弹窗：分类浏览 + 实时搜索 */
(function () {
  const docModal = document.getElementById("docModal");
  const docList = document.getElementById("docList");
  const docCats = document.getElementById("docCats");
  const docSearch = document.getElementById("docSearch");
  let curCat = "all";

  /* 分类按钮 */
  SQL_DOC_CATS.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "doc-cat" + (cat.id === "all" ? " active" : "");
    btn.textContent = cat.name;
    btn.dataset.cat = cat.id;
    btn.addEventListener("click", () => {
      curCat = cat.id;
      docCats.querySelectorAll(".doc-cat").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderDocList();
    });
    docCats.appendChild(btn);
  });

  function escLocal(v) {
    return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderDocList() {
    const q = docSearch.value.trim().toLowerCase();
    docList.innerHTML = "";
    const items = SQL_DOC_DATA.filter((it) => {
      if (curCat !== "all" && it.cat !== curCat) return false;
      if (!q) return true;
      return (it.t + " " + it.d + " " + it.c).toLowerCase().includes(q);
    });
    if (items.length === 0) {
      docList.innerHTML = '<div class="doc-empty">😢 没有找到相关内容，换个关键词试试</div>';
      return;
    }
    items.forEach((it) => {
      const catName = (SQL_DOC_CATS.find((c) => c.id === it.cat) || {}).name || "";
      const card = document.createElement("div");
      card.className = "doc-card";
      card.innerHTML = `
        <div class="doc-head">
          <span class="doc-title">${escLocal(it.t)}</span>
          <span class="doc-cat-tag">${escLocal(catName)}</span>
          <button class="btn btn-sm doc-fill">✏️ 填入编辑器</button>
        </div>
        <div class="doc-desc">${escLocal(it.d)}</div>
        <pre class="doc-code">${escLocal(it.c)}</pre>`;
      card.querySelector(".doc-fill").addEventListener("click", () => {
        setSQL(it.c);           // app.js 中定义的全局函数
        closeDoc();
        toast("已填入编辑器，点击运行试试");
      });
      docList.appendChild(card);
    });
  }

  docSearch.addEventListener("input", renderDocList);

  function openDoc() {
    docModal.classList.add("show");
    renderDocList();
    setTimeout(() => docSearch.focus(), 50);
  }
  function closeDoc() {
    docModal.classList.remove("show");
  }

  document.getElementById("docBtn").addEventListener("click", openDoc);
  document.getElementById("docClose").addEventListener("click", closeDoc);
  docModal.addEventListener("click", (e) => {
    if (e.target === docModal) closeDoc();  // 点击遮罩关闭
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDoc();
      document.getElementById("nameModal").classList.remove("show");
    }
  });
})();
