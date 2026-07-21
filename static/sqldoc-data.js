/* SQL 常用语法文档数据（中文，语法以本站使用的 SQLite 为准） */
const SQL_DOC_CATS = [
  { id: "all", name: "全部" },
  { id: "basic", name: "基础查询" },
  { id: "cond", name: "条件筛选" },
  { id: "agg", name: "聚合分组" },
  { id: "join", name: "多表连接" },
  { id: "sub", name: "子查询" },
  { id: "dml", name: "增删改" },
  { id: "ddl", name: "表结构" },
  { id: "func", name: "常用函数" },
];

const SQL_DOC_DATA = [
  /* ---------- 基础查询 ---------- */
  { cat: "basic", t: "SELECT 查询所有列", d: "最基础的查询，取出表中的全部数据。", c: "SELECT * FROM employees;" },
  { cat: "basic", t: "SELECT 查询指定列", d: "只查询需要的列，多个列名用逗号分隔。", c: "SELECT name, salary FROM employees;" },
  { cat: "basic", t: "DISTINCT 去重", d: "去除查询结果中的重复值。", c: "SELECT DISTINCT dept_id FROM employees;" },
  { cat: "basic", t: "AS 起别名", d: "给列或表起别名，让结果更易读（中文别名建议加双引号）。", c: "SELECT name AS 姓名, salary AS 工资 FROM employees;" },
  { cat: "basic", t: "ORDER BY 排序", d: "ASC 升序（默认），DESC 降序；可按多列排序。", c: "SELECT * FROM employees ORDER BY salary DESC;\n\n-- 多列排序：先按年龄降序，再按工资升序\nSELECT * FROM employees ORDER BY age DESC, salary ASC;" },
  { cat: "basic", t: "LIMIT 限制行数 / 分页", d: "限制返回的行数；OFFSET 指定偏移量，可实现分页。", c: "SELECT * FROM products ORDER BY price DESC LIMIT 5;\n\n-- 第 3 页（每页 10 条）\nSELECT * FROM orders LIMIT 10 OFFSET 20;" },

  /* ---------- 条件筛选 ---------- */
  { cat: "cond", t: "WHERE 基本条件", d: "比较运算符：=、!=（或<>）、>、<、>=、<=。", c: "SELECT * FROM employees WHERE salary > 10000;\nSELECT * FROM employees WHERE gender = '女';" },
  { cat: "cond", t: "AND / OR / NOT", d: "多条件组合；AND 优先于 OR，建议用括号明确顺序。", c: "SELECT * FROM employees\nWHERE dept_id = 1 AND salary > 15000;\n\nSELECT * FROM employees\nWHERE dept_id = 1 OR dept_id = 2;" },
  { cat: "cond", t: "BETWEEN 范围", d: "筛选某个区间内的值（包含两端）。", c: "SELECT * FROM products\nWHERE price BETWEEN 100 AND 500;" },
  { cat: "cond", t: "IN 列表匹配", d: "匹配括号中的任意一个值。", c: "SELECT * FROM employees\nWHERE dept_id IN (1, 3, 5);" },
  { cat: "cond", t: "LIKE 模糊查询", d: "% 匹配任意多个字符，_ 匹配单个字符。", c: "SELECT * FROM students WHERE name LIKE '%小%';\nSELECT * FROM products WHERE product_name LIKE '蓝牙_';" },
  { cat: "cond", t: "IS NULL 空值判断", d: "判断空值必须用 IS NULL，不能用 = NULL。", c: "SELECT * FROM employees WHERE dept_id IS NULL;\nSELECT * FROM employees WHERE dept_id IS NOT NULL;" },

  /* ---------- 聚合分组 ---------- */
  { cat: "agg", t: "五大聚合函数", d: "COUNT 计数、SUM 求和、AVG 平均、MAX 最大、MIN 最小。", c: "SELECT COUNT(*) AS 人数,\n       ROUND(AVG(salary), 2) AS 平均工资,\n       MAX(salary) AS 最高工资,\n       MIN(salary) AS 最低工资,\n       SUM(salary) AS 工资总额\nFROM employees;" },
  { cat: "agg", t: "COUNT 的区别", d: "COUNT(*) 统计所有行；COUNT(列名) 忽略 NULL；COUNT(DISTINCT 列) 去重计数。", c: "SELECT COUNT(*) AS 总行数,\n       COUNT(DISTINCT dept_id) AS 部门数\nFROM employees;" },
  { cat: "agg", t: "GROUP BY 分组", d: "按列分组，每组应用聚合函数。", c: "SELECT dept_id, COUNT(*) AS 人数\nFROM employees\nGROUP BY dept_id;" },
  { cat: "agg", t: "HAVING 筛选分组", d: "WHERE 在分组前筛选，HAVING 在分组后筛选。", c: "SELECT dept_id, AVG(salary) AS 平均工资\nFROM employees\nGROUP BY dept_id\nHAVING AVG(salary) > 12000;" },

  /* ---------- 多表连接 ---------- */
  { cat: "join", t: "INNER JOIN 内连接", d: "只返回两表中匹配成功的行。", c: "SELECT e.name, e.salary, d.dept_name\nFROM employees e\nINNER JOIN departments d ON e.dept_id = d.dept_id;" },
  { cat: "join", t: "LEFT JOIN 左连接", d: "返回左表全部行，右表无匹配时显示 NULL。", c: "SELECT s.name, sc.subject, sc.score\nFROM students s\nLEFT JOIN scores sc ON s.student_id = sc.student_id;" },
  { cat: "join", t: "表别名", d: "用短别名简化多表查询的书写。", c: "SELECT o.order_id, o.amount, p.product_name\nFROM orders o\nJOIN products p ON o.product_id = p.product_id;" },
  { cat: "join", t: "JOIN + 分组统计", d: "连接后再分组，是实战中最常用的组合。", c: "SELECT d.dept_name, COUNT(*) AS 人数\nFROM employees e\nJOIN departments d ON e.dept_id = d.dept_id\nGROUP BY d.dept_name\nORDER BY 人数 DESC;" },

  /* ---------- 子查询 ---------- */
  { cat: "sub", t: "WHERE 中的子查询", d: "用一个查询的结果作为另一个查询的条件。", c: "SELECT name, salary FROM employees\nWHERE salary > (SELECT AVG(salary) FROM employees);" },
  { cat: "sub", t: "IN 子查询", d: "筛选属于某个结果集的记录。", c: "SELECT * FROM employees\nWHERE dept_id IN (SELECT dept_id FROM departments WHERE location = '北京');" },
  { cat: "sub", t: "FROM 中的子查询", d: "把查询结果当作临时表再查询（派生表需起别名）。", c: "SELECT t.dept_id, t.平均工资\nFROM (SELECT dept_id, AVG(salary) AS 平均工资 FROM employees GROUP BY dept_id) t\nORDER BY t.平均工资 DESC;" },
  { cat: "sub", t: "EXISTS 存在性判断", d: "子查询返回任意行则为真。", c: "SELECT * FROM students s\nWHERE EXISTS (\n  SELECT 1 FROM scores sc\n  WHERE sc.student_id = s.student_id AND sc.score > 90\n);" },

  /* ---------- 增删改 ---------- */
  { cat: "dml", t: "INSERT INTO 插入数据", d: "向表中插入一行或多行新数据。", c: "INSERT INTO departments (dept_id, dept_name, location)\nVALUES (6, '研发部', '杭州');\n\n-- 一次插入多行\nINSERT INTO departments VALUES\n(7, '客服部', '成都'),\n(8, '法务部', '北京');" },
  { cat: "dml", t: "UPDATE 修改数据", d: "⚠️ 不加 WHERE 会修改整张表！", c: "UPDATE employees\nSET salary = salary * 1.1\nWHERE dept_id = 1;" },
  { cat: "dml", t: "DELETE 删除数据", d: "⚠️ 不加 WHERE 会清空整张表！", c: "DELETE FROM orders WHERE order_id = 24;" },

  /* ---------- 表结构 ---------- */
  { cat: "ddl", t: "CREATE TABLE 建表", d: "创建一张新表并定义列及类型。", c: "CREATE TABLE my_table (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  score REAL,\n  created_at TEXT\n);" },
  { cat: "ddl", t: "DROP TABLE 删表", d: "删除整张表（结构和数据一起删除）。", c: "DROP TABLE my_table;" },
  { cat: "ddl", t: "ALTER TABLE 加列", d: "给已有的表增加一列。", c: "ALTER TABLE employees ADD COLUMN email TEXT;" },
  { cat: "ddl", t: "查看数据库里有哪些表", d: "SQLite 专用：查询 sqlite_master 系统表。", c: "SELECT name FROM sqlite_master WHERE type = 'table';" },
  { cat: "ddl", t: "查看表结构", d: "SQLite 专用：PRAGMA 查看表的列信息。", c: "PRAGMA table_info(employees);" },

  /* ---------- 常用函数 ---------- */
  { cat: "func", t: "字符串函数", d: "LENGTH 长度、UPPER 大写、LOWER 小写、SUBSTR 截取、REPLACE 替换、|| 拼接。", c: "SELECT UPPER('abc'), LOWER('XYZ'), LENGTH('你好SQL');\n\nSELECT name || '（' || class || '）' AS 学生信息 FROM students;\n\nSELECT SUBSTR('2024-01-05', 1, 4) AS 年份;" },
  { cat: "func", t: "数值函数", d: "ROUND 四舍五入、ABS 绝对值、MAX/MIN 两值取大/小。", c: "SELECT ROUND(3.14159, 2), ABS(-10), MAX(3, 7), MIN(3, 7);" },
  { cat: "func", t: "日期函数（SQLite）", d: "DATE('now') 当前日期；strftime 按格式提取年月日。", c: "SELECT DATE('now') AS 今天;\n\n-- 统计每年入职人数\nSELECT strftime('%Y', hire_date) AS 年份, COUNT(*) AS 人数\nFROM employees\nGROUP BY 年份;" },
  { cat: "func", t: "COALESCE 空值处理", d: "返回第一个非 NULL 的值，常用于给 NULL 设置默认值。", c: "SELECT name, COALESCE(email, '未填写') AS 邮箱 FROM employees;" },
  { cat: "func", t: "CASE WHEN 条件分支", d: "在查询中做条件判断，类似编程的 if-else。", c: "SELECT name, salary,\n  CASE\n    WHEN salary >= 20000 THEN '高薪'\n    WHEN salary >= 10000 THEN '中等'\n    ELSE '一般'\n  END AS 薪资等级\nFROM employees;" },
];
