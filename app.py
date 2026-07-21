# -*- coding: utf-8 -*-
"""
SQL 练习网站后端
- 使用 SQLite 临时文件作为数据库（每次启动重建，数据不持久保存）
- 支持上传 xlsx：第一行作为列名，其余作为数据
- 不上传时内置示例数据表供练习
"""
import os
import re
import sqlite3
import tempfile
import threading
import time
import webbrowser

import pandas as pd
from flask import Flask, jsonify, render_template, request

from seed_data import SCHEMA_SQL, SEED_SQL

app = Flask(__name__)

DB_PATH = os.path.join(tempfile.gettempdir(), "sql_practice_session.db")
MAX_ROWS = 500  # 单次查询最多返回的行数，防止页面卡死


def get_conn():
    return sqlite3.connect(DB_PATH)


def init_db():
    """每次启动都重建一个全新的临时数据库（含内置示例数据）。"""
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    conn = get_conn()
    try:
        conn.executescript(SCHEMA_SQL)
        conn.executescript(SEED_SQL)
        conn.commit()
    finally:
        conn.close()


def sanitize_identifier(name, fallback):
    """把任意文本清洗成安全的 SQL 标识符（保留中文）。"""
    name = str(name).strip()
    if not name or name.lower().startswith("unnamed"):
        name = fallback
    name = re.sub(r"\s+", "_", name)
    for ch in [".", "-", "/", "\\"]:
        name = name.replace(ch, "_")
    name = re.sub(r'["\'`();，。！？、（）()\[\]{}:：]', "", name)
    return name or fallback


# ------------------------------------------------------------ 路由
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/tables")
def api_tables():
    """返回当前数据库中所有表的结构信息。"""
    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' "
            "AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
        tables = []
        for (name,) in rows:
            cols = conn.execute(f'PRAGMA table_info("{name}")').fetchall()
            count = conn.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
            tables.append({
                "name": name,
                "columns": [{"name": c[1], "type": c[2] or "TEXT"} for c in cols],
                "row_count": count,
            })
        return jsonify({"tables": tables})
    finally:
        conn.close()


@app.route("/api/query", methods=["POST"])
def api_query():
    """执行 SQL，支持多条语句（分号分隔），返回最后一条查询的结果集。"""
    data = request.get_json(silent=True) or {}
    sql = data.get("sql", "").strip()
    show_all = bool(data.get("all"))  # 全部行模式：不限制 500 行
    if not sql:
        return jsonify({"success": False, "error": "SQL 不能为空"})

    statements = [s.strip() for s in sql.split(";") if s.strip()]
    conn = get_conn()
    start = time.time()
    try:
        result = None
        affected = 0
        for stmt in statements:
            cur = conn.execute(stmt)
            if cur.description:  # 有结果集（SELECT / PRAGMA 等）
                cap = 100000 if show_all else MAX_ROWS
                cols = [d[0] for d in cur.description]
                rows = cur.fetchmany(cap + 1)
                truncated = len(rows) > cap
                result = {
                    "columns": cols,
                    "rows": [list(r) for r in rows[:cap]],
                    "truncated": truncated,
                }
            elif cur.rowcount and cur.rowcount > 0:
                affected += cur.rowcount
        conn.commit()
        elapsed = round((time.time() - start) * 1000, 1)
        if result:
            result.update({"success": True, "elapsed": elapsed,
                           "row_count": len(result["rows"])})
            return jsonify(result)
        return jsonify({"success": True, "columns": None, "elapsed": elapsed,
                        "message": f"执行成功，影响行数：{affected}"})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()


@app.route("/api/upload", methods=["POST"])
def api_upload():
    """上传 xlsx：第一行作为列名，其余作为数据导入为新表。"""
    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify({"success": False, "error": "请选择要上传的文件"})
    if not f.filename.lower().endswith((".xlsx", ".xls")):
        return jsonify({"success": False, "error": "仅支持 .xlsx / .xls 文件"})

    # 优先使用用户自定义的表名，否则用文件名
    custom_name = (request.form.get("table_name") or "").strip()
    if custom_name:
        base = sanitize_identifier(custom_name, "my_table")
    else:
        base = sanitize_identifier(
            os.path.splitext(os.path.basename(f.filename))[0], "my_table")
    try:
        sheets = pd.read_excel(f, sheet_name=None)  # 读取所有工作表
    except Exception as e:
        return jsonify({"success": False, "error": f"读取 Excel 失败：{e}"})

    conn = get_conn()
    created = []
    try:
        multi = len(sheets) > 1
        for sheet_name, df in sheets.items():
            if df.empty:
                continue
            tname = base if not multi else sanitize_identifier(
                f"{base}_{sheet_name}", f"{base}_sheet")
            # 清洗列名并去重
            cols = [sanitize_identifier(c, f"col_{i + 1}")
                    for i, c in enumerate(df.columns)]
            seen = {}
            final_cols = []
            for c in cols:
                if c in seen:
                    seen[c] += 1
                    final_cols.append(f"{c}_{seen[c]}")
                else:
                    seen[c] = 0
                    final_cols.append(c)
            df.columns = final_cols
            # 同名表直接覆盖，方便反复上传练习
            df.to_sql(tname, conn, if_exists="replace", index=False)
            created.append({"name": tname, "rows": len(df),
                            "cols": len(df.columns)})
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": f"导入失败：{e}"})
    finally:
        conn.close()

    if not created:
        return jsonify({"success": False, "error": "文件中没有可导入的数据"})
    msg = "；".join(f"表 {t['name']}（{t['rows']} 行 × {t['cols']} 列）"
                    for t in created)
    return jsonify({"success": True, "tables": created,
                    "message": f"成功导入 {msg}"})


@app.route("/api/reset", methods=["POST"])
def api_reset():
    """重置数据库：恢复内置示例数据，清除所有上传/修改。"""
    try:
        init_db()
        return jsonify({"success": True,
                        "message": "数据库已重置为初始内置数据"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


if __name__ == "__main__":
    init_db()
    url = "http://127.0.0.1:5000"
    threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    print("=" * 50)
    print(f"  SQL 练习网站已启动: {url}")
    print("  关闭本窗口即可停止网站（数据不会保存）")
    print("=" * 50)
    app.run(host="127.0.0.1", port=5000, debug=False)
