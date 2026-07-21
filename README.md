# SQL 练习平台（KIMI3 巨献）

本地运行的 SQL 练习网站：上传 Excel 即可对其执行 SQL，内置示例数据与练习题，适合 SQL 初学者。

## 功能
- 📤 上传任意 xlsx：第一行识别为列名，其余作为数据导入（可自定义表名）
- ⌨️ SQL 编辑器：语法高亮、Ctrl+Enter 运行、高度可拖拽、结果不限行数查看
- 🗄 真实 SQLite 数据库：重启即重置，不保存数据
- 📊 内置 6 张示例表 + 15 道分级练习题 + 可搜索的中文 SQL 文档
- 🎨 9 套视觉主题，CodeMirror 已本地化，断网可用

## 运行方法
1. 安装 Python（勾选 Add python.exe to PATH）
2. 双击 `启动网站.bat`（首次运行自动装依赖，需联网）
3. 浏览器自动打开 http://127.0.0.1:5000

## 技术栈
Flask + SQLite + pandas / 原生 HTML·CSS·JS + CodeMirror
