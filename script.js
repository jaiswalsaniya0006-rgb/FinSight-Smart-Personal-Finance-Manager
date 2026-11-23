(function () {
  const KEY = "finsight_v2";
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const today = () => ymd(new Date());
  const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
  const ICONS = { "Food & Dining":"🍔", Shopping:"🛍️", Transport:"🚕", Entertainment:"🎬", Health:"💊", Education:"📚", Bills:"📄", Salary:"💰", Freelance:"💻", Gift:"🎁", Other:"📦" };
  const CATS = { Expense:["Food & Dining","Shopping","Transport","Entertainment","Health","Education","Bills","Other"], Income:["Salary","Freelance","Gift","Other"] };
  const PAY = ["UPI","Cash","Debit Card","Credit Card","Net Banking","Bank Transfer"];

  function seed() {
    const first = ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    let id = 1;
    const t = (title, type, category, amount, date, payment) => ({ id: id++, title, type, category, amount, date, payment, notes: "" });
    return {
      name: "Saniya Jaiswal", budget: 35000,
      cb: { "Food & Dining": 8000, Transport: 5000, Shopping: 8000, Bills: 7000 },
      goals: [
        { id: 1, name: "Japan Trip", icon: "✈️", kind: "Travel Goal", saved: 30000, target: 100000, due: "2027-12" },
        { id: 2, name: "Emergency Fund", icon: "🛡️", kind: "Safety Goal", saved: 5000, target: 30000, due: "2027-06" },
        { id: 3, name: "New Laptop", icon: "💻", kind: "Personal Goal", saved: 0, target: 50000, due: "" }
      ],
      tx: [
        t("Salary", "Income", "Salary", 45000, first, "Bank Transfer"),
        t("Electricity bill", "Expense", "Bills", 2100, first, "Net Banking"),
        t("Shopping", "Expense", "Shopping", 1200, ago(5), "Debit Card"),
        t("Transport", "Expense", "Transport", 250, ago(2), "UPI"),
        t("Coffee", "Expense", "Food & Dining", 120, ago(1), "UPI"),
        t("Food & Dining", "Expense", "Food & Dining", 350, ago(0), "UPI")
      ]
    };
  }
  let store = null;
  const mem = {};
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  const S = load();

  let route = "home", prev = "home", addType = "Expense", filter = "All", q = "", period = "month";

  // ---------- helpers ----------
  const sum = (arr) => arr.reduce((a, t) => a + Number(t.amount), 0);
  const ofType = (type, from, to) => S.tx.filter(t => t.type === type && (!from || t.date >= from) && (!to || t.date <= to));
  const mRange = (off = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + off); const p = d.getFullYear() + "-" + pad(d.getMonth() + 1); return [p + "-01", p + "-31"]; };
  function nice(d) {
    if (d === today()) return "Today";
    if (d === ago(1)) return "Yesterday";
    return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  const sorted = a => [...a].sort((x, y) => y.date.localeCompare(x.date) || y.id - x.id);
  const monthSpent = () => sum(ofType("Expense", ...mRange()));
  const catSpent = c => sum(ofType("Expense", ...mRange()).filter(t => t.category === c));

  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 1800);
  }
  function sheet(title, body, cb, okLabel = "Save") {
    const el = $("#sheet");
    el.innerHTML = `<form><h3>${title}</h3>${body}<div class="acts"><button type="button" class="btn ghost" data-act="close">Cancel</button><button class="btn">${okLabel}</button></div></form>`;
    el.classList.add("open");
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      if (cb(data) !== false) closeSheet();
    };
  }
  const closeSheet = () => { $("#sheet").classList.remove("open"); $("#sheet").innerHTML = ""; };
  const field = (label, name, val = "", attrs = "") => `<div class="fg"><label>${label}</label><input class="in" name="${name}" value="${esc(val)}" ${attrs}></div>`;

  // ---------- rows ----------
  function txRow(t, withDelete) {
    const inc = t.type === "Income";
    return `<div class="tx"><div class="ico">${ICONS[t.category] || "📦"}</div>
      <div class="inf"><b>${esc(t.title)}</b><small>${nice(t.date)} · ${esc(t.payment || t.category)}</small></div>
      <div><strong class="${inc ? "g" : "r"}">${inc ? "+" : "-"}${fmt(t.amount)}</strong>
      ${withDelete ? `<button class="del" data-act="del" data-id="${t.id}">Delete</button>` : ""}</div></div>`;
  }
  function txList() {
    let list = sorted(S.tx);
    if (filter !== "All") list = list.filter(t => t.type === filter);
    if (q) list = list.filter(t => (t.title + " " + t.category).toLowerCase().includes(q));
    return list.length ? list.map(t => txRow(t, true)).join("") : `<p class="mut empty">No transactions found.</p>`;
  }
  const topNav = (title, right = "") => `<div class="top"><h2>${title}</h2>${right}</div>`;

  // ---------- views ----------
  const V = {};
  V.home = () => {
    const inc = sum(S.tx.filter(t => t.type === "Income")), exp = sum(S.tx.filter(t => t.type === "Expense"));
    const spent = monthSpent(), pct = S.budget > 0 ? Math.round(spent / S.budget * 100) : 0;
    const now = new Date(), dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const safe = Math.max(0, (S.budget - spent) / (dim - now.getDate() + 1));
    const over = spent > S.budget;
    return `<div class="top"><div class="brand"><div class="logo">F</div><div><h3>FinSight</h3><small>SMART FINANCE</small></div></div><button class="ibtn" data-act="toast" data-msg="No new notifications">♧</button></div>
    <div class="welcome"><small>WELCOME BACK</small><h2>Hello, ${esc(S.name.split(" ")[0])}!</h2><p class="mut">Here's your financial overview.</p></div>
    <div class="bal"><p>Total Balance</p><h1>${fmt(inc - exp)}</h1><div class="row"><div><small>↗ Income</small><b>${fmt(inc)}</b></div><div><small>↘ Expenses</small><b>${fmt(exp)}</b></div></div></div>
    <div class="card split"><div><p>Monthly Spending</p><h2>${fmt(spent)}</h2><small class="${over ? "r" : "g"}">${pct}% of budget used</small></div>
      <div class="ring" style="background:conic-gradient(${over ? "var(--r)" : "var(--g)"} ${Math.min(pct, 100) * 3.6}deg,#46504c 0)"><span>${pct}%</span></div></div>
    <div class="card split"><div><p>Safe to Spend</p><h2>${fmt(Math.round(safe))}/day</h2><small class="${over ? "r" : "g"}">${over ? "You're over budget" : "You're on track!"}</small></div><span class="big">✦</span></div>
    <h3 class="sec">Quick Actions</h3>
    <div class="qa"><button data-go="add" data-type="Expense"><span>＋</span><small>Add Expense</small></button><button data-go="add" data-type="Income"><span>↗</span><small>Add Income</small></button><button data-go="budget"><span>◎</span><small>Set Budget</small></button></div>
    <div class="head"><h3>Recent Transactions</h3><button class="link" data-go="transactions">See all</button></div>
    ${sorted(S.tx).slice(0, 4).map(t => txRow(t)).join("") || `<p class="mut empty">No transactions yet. Add your first one.</p>`}`;
  };
  V.transactions = () => `${topNav("Transactions")}<p class="mut">Track your income and expenses.</p>
    <input class="search" id="q" type="search" placeholder="Search transactions..." value="${esc(q)}">
    <div class="chips">${["All","Income","Expense"].map(f => `<button data-act="filter" data-v="${f}" class="${filter === f ? "on" : ""}">${f}</button>`).join("")}</div>
    <div class="head" style="margin-top:6px"><h3>Recent Activity</h3><small class="mut">${new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</small></div>
    <div id="txList">${txList()}</div>`;
  const opts = (arr, sel) => arr.map(o => `<option ${o === sel ? "selected" : ""}>${o}</option>`).join("");
  V.add = () => `<div class="top"><button class="back" data-act="back">‹</button><h2>Add Transaction</h2><span style="width:30px"></span></div>
    <p class="mut">Record your income or expenses.</p>
    <form id="txForm" autocomplete="off">
      <div class="seg"><button type="button" data-act="type" data-v="Expense" class="${addType === "Expense" ? "on" : ""}">Expense</button><button type="button" data-act="type" data-v="Income" class="${addType === "Income" ? "on" : ""}">Income</button></div>
      <input type="hidden" name="type" value="${addType}">
      <div class="amt"><small>ENTER AMOUNT</small><input name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="₹ 0.00" required><p class="mut" style="font-size:10px">Enter transaction amount</p></div>
      <div class="fg"><label>Transaction Title</label><input class="in" name="title" placeholder="e.g. Grocery shopping" required></div>
      <div class="fg"><label>Category</label><select class="in" name="category" id="catSel" required><option value="">Select Category</option>${opts(CATS[addType])}</select></div>
      <div class="fg"><label>Date</label><input class="in" type="date" name="date" value="${today()}" required></div>
      <div class="fg"><label>Payment Method</label><select class="in" name="payment" required><option value="">Select Payment Method</option>${opts(PAY)}</select></div>
      <div class="fg"><label>Notes (Optional)</label><input class="in" name="notes" placeholder="Add a note..."></div>
      <button class="btn">Save Transaction</button><p class="msg" id="msg"></p>
    </form>`;

  function periodData() {
    const d = new Date(), t = today();
    let cur, prv, buckets = [], labels = [];
    if (period === "week") {
      cur = [ago(6), t]; prv = [ago(13), ago(7)];
      for (let i = 6; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); buckets.push(sum(ofType("Expense", ymd(x), ymd(x)))); labels.push(x.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)); }
    } else if (period === "year") {
      const y = d.getFullYear(); cur = [y + "-01-01", y + "-12-31"]; prv = [(y - 1) + "-01-01", (y - 1) + "-12-31"];
      for (let m = 1; m <= 12; m++) { const p = y + "-" + pad(m); buckets.push(sum(ofType("Expense", p + "-01", p + "-31"))); labels.push("JFMAMJJASOND"[m - 1]); }
    } else {
      cur = mRange(); prv = mRange(-1);
      buckets = [0, 0, 0, 0];
      ofType("Expense", ...cur).forEach(x => { buckets[Math.min(Math.floor((+x.date.slice(8) - 1) / 7), 3)] += Number(x.amount); });
      labels = ["W1", "W2", "W3", "W4"];
    }
    return { cur, prv, buckets, labels };
  }
  V.analytics = () => {
    const { cur, prv, buckets, labels } = periodData();
    const exp = ofType("Expense", ...cur), inc = ofType("Income", ...cur);
    const te = sum(exp), tp = sum(ofType("Expense", ...prv));
    const cats = {}; exp.forEach(t => cats[t.category] = (cats[t.category] || 0) + Number(t.amount));
    const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...buckets, 1);
    const change = tp > 0 ? ((te - tp) / tp * 100) : null;
    const word = { week: "last week", month: "last month", year: "last year" }[period];
    return `${topNav("Analytics")}<p class="mut">Understand your spending habits.</p>
    <div class="chips">${["week","month","year"].map(p => `<button data-act="period" data-v="${p}" class="${period === p ? "on" : ""}">${p[0].toUpperCase() + p.slice(1)}</button>`).join("")}</div>
    <div class="card"><small class="mut">Total Expenses</small><h1>${fmt(te)}</h1>
      <small class="${change !== null && change > 0 ? "r" : "g"}">${change === null ? "No data for " + word : (change > 0 ? "↑ " : "↓ ") + Math.abs(change).toFixed(1) + "% compared to " + word}</small>
      <div class="chart">${buckets.map((v, i) => `<div style="height:${v ? Math.max(v / max * 100, 6) : 4}%;${v ? "" : "opacity:.3"}"><small>${labels[i]}</small></div>`).join("")}</div></div>
    <h3 class="sec">Income vs Expenses</h3>
    <div class="two"><div class="card"><small>Income</small><h3 class="g">${fmt(sum(inc))}</h3></div><div class="card"><small>Expenses</small><h3 class="r">${fmt(te)}</h3></div></div>
    <h3 class="sec">Spending by Category</h3>
    <div class="card">${entries.length ? entries.map(([c, a]) => `<div class="crow"><span>${ICONS[c] || ""} ${esc(c)}</span><b>${fmt(a)}</b></div><div class="bar"><i style="width:${a / te * 100}%"></i></div>`).join("") : `<p class="mut">No expense data for this period.</p>`}</div>
    <div class="card"><small class="g">SPENDING INSIGHT</small><p class="mut" style="margin-top:10px;color:#d0d6df">${entries.length ? "Your highest spending category in this period is " + esc(entries[0][0]) + " (" + Math.round(entries[0][1] / te * 100) + "% of expenses)." : "Add some expenses to see insights."}</p></div>`;
  };
  V.budget = () => {
    const spent = monthSpent(), left = S.budget - spent, pct = S.budget ? Math.min(spent / S.budget * 100, 100) : 0;
    return `<div class="top"><button class="back" data-act="back">‹</button><h2>My Budget</h2><button class="ibtn" data-act="editBudget">＋</button></div>
    <p class="mut">Manage your monthly spending limits.</p><div style="height:16px"></div>
    <div class="card"><small>Total Monthly Budget</small><h1>${fmt(S.budget)}</h1>
      <div class="nums"><span>Spent <b>${fmt(spent)}</b></span><span>${left < 0 ? "Over by" : "Left"} <b class="${left < 0 ? "r" : "g"}">${fmt(Math.abs(left))}</b></span></div>
      <div class="bar ${left < 0 ? "over" : ""}"><i style="width:${pct}%"></i></div><small class="mut">${Math.round(S.budget ? spent / S.budget * 100 : 0)}% of your budget used</small></div>
    <div class="head"><h3>Category Budgets</h3><button class="link" data-act="editBudget">Edit</button></div>
    ${Object.entries(S.cb).map(([c, lim]) => { const s = catSpent(c), o = s > lim; return `<div class="card"><div class="crow" style="margin-top:0"><span>${ICONS[c] || ""} ${esc(c)}</span><b>${fmt(s)} / ${fmt(lim)}</b></div><div class="bar ${o ? "over" : ""}"><i style="width:${lim ? Math.min(s / lim * 100, 100) : 0}%"></i></div><small class="${o ? "r" : "mut"}" style="font-size:10px">${o ? fmt(s - lim) + " over limit" : fmt(lim - s) + " remaining"}</small></div>`; }).join("") || `<p class="mut empty">No category budgets yet.</p>`}
    <button class="btn" data-act="editBudget">＋ Create New Budget</button>`;
  };
  const dueLabel = v => v ? "Target: " + new Date(v + "-01T12:00:00").toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "No target date";
  V.savings = () => `<div class="top"><button class="back" data-act="back">‹</button><h2>Savings Goals</h2><button class="ibtn" data-act="newGoal">＋</button></div>
    <p class="mut">Save today for your tomorrow.</p><div style="height:16px"></div>
    <div class="card"><small>Total Savings</small><h1>${fmt(sum(S.goals.map(g => ({ amount: g.saved }))))}</h1><p class="g" style="font-size:12px">Across all your goals</p></div>
    <div class="head"><h3>Your Goals</h3></div>
    ${S.goals.map(g => { const p = g.target ? Math.min(Math.round(g.saved / g.target * 100), 100) : 0; return `<div class="card goal"><div class="goalh"><div class="ico">${g.icon}</div><div><h3>${esc(g.name)}</h3><small class="mut" style="font-size:10px">${esc(g.kind)}</small></div><button class="link r" data-act="delGoal" data-id="${g.id}">Delete</button></div>
      <h2>${fmt(g.saved)} <small>/ ${fmt(g.target)}</small></h2><div class="bar"><i style="width:${p}%"></i></div>
      <div class="foot"><small class="g">${p}% completed</small><small class="mut">${dueLabel(g.due)}</small><button class="mini" data-act="fund" data-id="${g.id}">＋ Add money</button></div></div>`; }).join("") || `<p class="mut empty">No goals yet. Create one to get started.</p>`}
    <button class="btn" data-act="newGoal">＋ Create New Goal</button>`;
  V.profile = () => {
    const m = (icon, t, s, attr) => `<button class="menu" ${attr}><span>${icon}</span><div><b>${t}</b><small>${s}</small></div><strong>›</strong></button>`;
    return `${topNav("My Profile", `<button class="ibtn" data-act="toast" data-msg="Settings coming soon">⚙</button>`)}
    <div class="prof"><div class="av">${esc(S.name[0] || "U").toUpperCase()}</div><h2>${esc(S.name)}</h2><p class="mut">saniya@example.com</p><button class="btn" data-act="editProfile">Edit Profile</button></div>
    <h3 class="sec">Account</h3>
    ${m("🎯", "Savings Goals", "Track your financial goals", 'data-go="savings"')}
    ${m("◎", "Budget", "Manage monthly limits", 'data-go="budget"')}
    ${m("💳", "My Accounts", "Manage your accounts", 'data-act="toast" data-msg="Accounts coming soon"')}
    ${m("🔔", "Reminders", "Manage upcoming bills", 'data-act="toast" data-msg="Reminders coming soon"')}
    <h3 class="sec">Preferences</h3>
    ${m("🌙", "Appearance", "Dark theme", 'data-act="toast" data-msg="Dark theme is active"')}
    ${m("💱", "Currency", "Indian Rupee (INR)", 'data-act="toast" data-msg="Currency is set to INR"')}
    ${m("🗑️", "Reset Data", "Restore the sample data", 'data-act="reset"')}
    ${m("🧹", "Clear All Data", "Start with a blank slate", 'data-act="clear"')}
    <button class="logout" data-act="toast" data-msg="Logged out (demo)">Log Out</button>`;
  };

  // ---------- render / navigation ----------
  const NAVMAP = { home: "home", transactions: "transactions", analytics: "analytics", budget: "analytics", profile: "profile", savings: "profile" };
  function render() {
    $("#view").innerHTML = V[route]();
    document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("on", b.dataset.go === NAVMAP[route]));
  }
  function go(name, type) {
    if (name === "add") { prev = route; addType = type || "Expense"; }
    route = name; render(); $("#view").scrollTop = 0;
  }

  // ---------- actions ----------
  const A = {
    close: closeSheet,
    back: () => go(prev === "add" ? "home" : prev),
    toast: el => toast(el.dataset.msg),
    filter: el => { filter = el.dataset.v; render(); },
    period: el => { period = el.dataset.v; render(); },
    type: el => {
      addType = el.dataset.v;
      document.querySelectorAll(".seg button").forEach(b => b.classList.toggle("on", b.dataset.v === addType));
      document.querySelector('#txForm [name=type]').value = addType;
      $("#catSel").innerHTML = '<option value="">Select Category</option>' + opts(CATS[addType]);
    },
    del: el => sheet("Delete transaction?", `<p class="mut" style="margin-bottom:16px">This can't be undone.</p>`, () => {
      S.tx = S.tx.filter(t => t.id !== Number(el.dataset.id)); save(); render(); toast("Transaction deleted");
    }, "Delete"),
    editBudget: () => {
      const cats = [...new Set([...Object.keys(S.cb), ...CATS.Expense])];
      sheet("Edit budgets", field("Total monthly budget (₹)", "total", S.budget, 'type="number" min="0" step="1" required') +
        `<p class="mut" style="margin-bottom:10px">Category limits (leave blank to remove)</p>` +
        cats.map(c => field(c, "c_" + c, S.cb[c] ?? "", 'type="number" min="0" step="1" placeholder="No limit"')).join(""),
        d => {
          S.budget = Number(d.total) || 0; S.cb = {};
          cats.forEach(c => { if (d["c_" + c] !== "" && Number(d["c_" + c]) > 0) S.cb[c] = Number(d["c_" + c]); });
          save(); render(); toast("Budget updated");
        });
    },
    newGoal: () => sheet("New savings goal",
      field("Goal name", "name", "", 'required placeholder="e.g. New phone"') +
      field("Target amount (₹)", "target", "", 'type="number" min="1" required') +
      field("Already saved (₹)", "saved", "0", 'type="number" min="0"') +
      field("Target month", "due", "", 'type="month"') +
      `<div class="fg"><label>Icon</label><select class="in" name="icon">${["🎯","✈️","🛡️","💻","🏠","🚗","📱","🎓"].map(i => `<option>${i}</option>`).join("")}</select></div>`,
      d => { S.goals.push({ id: Date.now(), name: d.name.trim(), icon: d.icon, kind: "Personal Goal", saved: Number(d.saved) || 0, target: Number(d.target), due: d.due }); save(); render(); toast("Goal created"); }),
    fund: el => {
      const g = S.goals.find(x => x.id === Number(el.dataset.id));
      sheet("Add to " + esc(g.name), field("Amount (₹)", "amt", "", 'type="number" min="1" required'),
        d => { g.saved += Number(d.amt); save(); render(); toast("Money added"); });
    },
    delGoal: el => sheet("Delete goal?", `<p class="mut" style="margin-bottom:16px">This goal and its progress will be removed.</p>`,
      () => { S.goals = S.goals.filter(g => g.id !== Number(el.dataset.id)); save(); render(); }, "Delete"),
    editProfile: () => sheet("Edit profile", field("Full name", "name", S.name, "required"),
      d => { S.name = d.name.trim() || S.name; save(); render(); toast("Profile updated"); }),
    reset: () => sheet("Reset data?", `<p class="mut" style="margin-bottom:16px">Everything will be replaced with the sample data.</p>`,
      () => { Object.assign(S, seed()); save(); go("home"); toast("Sample data restored"); }, "Reset"),
    clear: () => sheet("Clear all data?", `<p class="mut" style="margin-bottom:16px">All transactions and goals will be deleted.</p>`,
      () => { S.tx = []; S.goals = []; S.cb = {}; save(); go("home"); toast("All data cleared"); }, "Clear")
  };

  document.addEventListener("click", e => {
    const el = e.target.closest("[data-go],[data-act]");
    if (!el) return;
    if (el.dataset.go) return go(el.dataset.go, el.dataset.type);
    const fn = A[el.dataset.act]; if (fn) fn(el);
  });
  document.addEventListener("input", e => {
    if (e.target.id === "q") { q = e.target.value.trim().toLowerCase(); $("#txList").innerHTML = txList(); }
  });
  document.addEventListener("submit", e => {
    if (e.target.id !== "txForm") return;
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target)), msg = $("#msg");
    const amount = Number(d.amount);
    if (!(amount > 0) || !d.title.trim() || !d.category || !d.date || !d.payment) {
      msg.textContent = "Please enter all required details."; msg.className = "msg r"; return;
    }
    S.tx.push({ id: Date.now(), title: d.title.trim(), type: d.type, category: d.category, amount, date: d.date, payment: d.payment, notes: (d.notes || "").trim() });
    save(); filter = "All"; q = "";
    toast(d.type + " saved"); go("transactions");
  });

  render();
})();
