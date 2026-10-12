// Minimal static renderer for the mock-up's .dc.html boards (x-dc templates).
// Supports {{dotted.path}} holes, <sc-if>, <sc-for>, <dc-import>, a component class with
// constructor/renderVals/componentDidMount/setState, and fast-forwarded timers.
// Event handlers are dropped: the output is a static snapshot of each board's first screen.
(function () {
  const SOURCES = window.__SOURCES; // { "App": "<html…>", … }
  const BLOBS = window.__BLOBS; // { "/_blob/<id>": "relative/path" }

  // ---- virtual clock so mount-time animations (count-ups) finish before the snapshot
  let now = 1_800_000_000_000;
  const timers = new Map();
  let nextId = 1;
  Date.now = () => now;
  window.setTimeout = (fn, ms) => { const id = nextId++; timers.set(id, { fn, at: now + (ms || 0), every: 0 }); return id; };
  window.setInterval = (fn, ms) => { const id = nextId++; timers.set(id, { fn, at: now + (ms || 0), every: ms || 16 }); return id; };
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  function runClock(ms) {
    const end = now + ms;
    while (now < end) {
      now += 16;
      for (const [id, t] of [...timers]) {
        if (t.at <= now && timers.has(id)) {
          if (t.every) t.at = now + t.every; else timers.delete(id);
          try { t.fn(); } catch (e) { console.error(e); }
        }
      }
    }
  }

  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(u) { this.state = Object.assign({}, this.state, typeof u === "function" ? u(this.state) : u); }
  }

  const compiled = {};
  function load(name) {
    if (compiled[name]) return compiled[name];
    const src = SOURCES[name];
    if (!src) throw new Error("No board source " + name);
    const doc = new DOMParser().parseFromString(src, "text/html");
    const xdc = doc.querySelector("x-dc");
    const script = doc.querySelector('script[type="text/x-dc"]');
    const Component = new Function("DCLogic", script.textContent + "\nreturn Component;")(DCLogic);
    compiled[name] = { xdc, Component };
    return compiled[name];
  }

  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  function lookup(scopes, path) {
    if (path === "true") return true;
    if (path === "false") return false;
    const parts = path.split(".");
    let v;
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i] && Object.prototype.hasOwnProperty.call(scopes[i], parts[0])) { v = scopes[i][parts[0]]; break; }
    }
    for (let k = 1; k < parts.length; k++) v = v == null ? undefined : v[parts[k]];
    return v;
  }
  function fill(str, scopes) {
    return str.replace(HOLE, (_, p) => { const v = lookup(scopes, p); return v == null || typeof v === "function" ? "" : String(v); });
  }
  function single(str) { const m = str.trim().match(/^\{\{\s*([^}]+?)\s*\}\}$/); return m ? m[1] : null; }

  function renderNodes(nodes, scopes, out) {
    for (const node of nodes) {
      if (node.nodeType === 3) { out.push(document.createTextNode(fill(node.nodeValue, scopes))); continue; }
      if (node.nodeType !== 1) continue;
      const tag = node.tagName.toLowerCase();
      if (tag === "helmet" || tag === "script") continue;
      if (tag === "sc-if") {
        const p = single(node.getAttribute("value") || "");
        if (p && lookup(scopes, p)) renderNodes(node.childNodes, scopes, out);
        continue;
      }
      if (tag === "sc-for") {
        const p = single(node.getAttribute("list") || "");
        const as = node.getAttribute("as");
        const list = (p && lookup(scopes, p)) || [];
        for (const item of list) renderNodes(node.childNodes, scopes.concat([{ [as]: item }]), out);
        continue;
      }
      if (tag === "dc-import") {
        const props = {};
        for (const a of node.attributes) if (a.name !== "name" && !a.name.startsWith("hint-")) props[a.name] = fill(a.value, scopes);
        out.push(...renderComponent(node.getAttribute("name"), props));
        continue;
      }
      const el = node.cloneNode(false);
      for (const a of [...el.attributes]) {
        if (/^on[A-Z]/.test(a.name) || /^on[a-z]+$/.test(a.name)) { el.removeAttribute(a.name); continue; }
        if (a.value.includes("{{")) {
          const v = fill(a.value, scopes);
          if (a.name === "value" && el.tagName === "INPUT") el.setAttribute("value", v);
          else el.setAttribute(a.name, v);
        }
      }
      if (el.tagName === "IMG" && BLOBS[el.getAttribute("src")]) el.setAttribute("src", BLOBS[el.getAttribute("src")]);
      if (el.getAttribute && el.getAttribute("style") && el.getAttribute("style").includes("/_blob/")) {
        el.setAttribute("style", el.getAttribute("style").replace(/\/_blob\/[0-9a-f]{32}/g, (m) => BLOBS[m] || m));
      }
      const kids = [];
      renderNodes(node.childNodes, scopes, kids);
      for (const k of kids) el.appendChild(k);
      out.push(el);
    }
    return out;
  }

  function renderComponent(name, props) {
    const { xdc, Component } = load(name);
    const comp = new Component(props || {});
    if (typeof comp.componentDidMount === "function") { try { comp.componentDidMount(); } catch (e) { console.error(e); } }
    runClock(3000);
    const vals = comp.renderVals();
    return renderNodes(xdc.childNodes, [vals], []);
  }

  window.renderBoard = function (name) {
    const root = document.getElementById("root");
    root.innerHTML = "";
    for (const n of renderComponent(name, {})) root.appendChild(n);
  };
})();
