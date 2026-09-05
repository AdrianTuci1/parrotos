let meta = #{
    name: "rill-e2e",
    description: "Rill→Statsparrot port: evaluate coverage, autonomously integrate Rill features to E2E parity, and verify against the running runtime.",
    when_to_use: "Run when you want a progress/gap audit of the Rill port, or to have a subagent pipeline wire Rill features end to end and verify the build/tests/runtime.",
    phases: [
        #{ title: "Evaluate", detail: "read-only coverage scan per feature area" },
        #{ title: "Integrate", detail: "read-write agents close each gap (sequential to avoid shared-file conflicts)" },
        #{ title: "Verify", detail: "build + tests + runtime health, fail-closed" },
    ],
};

let gap_schema = #{
    "type": "object",
    "required": ["gaps"],
    "properties": #{
        "gaps": #{ "type": "array", "maxItems": 20, "items": #{
            "type": "object", "required": ["component", "status", "note"],
            "properties": #{
                "component": #{ "type": "string" },
                "status": #{ "type": "string", "enum": ["ported", "partial", "missing"] },
                "note": #{ "type": "string" },
            },
        }},
    },
};
let int_schema = #{
    "type": "object",
    "required": ["done", "files", "notes"],
    "properties": #{
        "done": #{ "type": "boolean" },
        "files": #{ "type": "array", "items": #{ "type": "string" } },
        "notes": #{ "type": "string" },
    },
};
let verify_schema = #{
    "type": "object",
    "required": ["build_ok", "test_ok", "runtime_ok", "details"],
    "properties": #{
        "build_ok": #{ "type": "boolean" },
        "test_ok": #{ "type": "boolean" },
        "runtime_ok": #{ "type": "boolean" },
        "details": #{ "type": "string" },
    },
};

fn eval_prompt(label) {
    let p = "";
    p += "Repo: sentry-data is a Rill (Apache-2.0) fork being ported into the Statsparrot product. The Rill React port lives under sentry-data/web-common/src/*/react; the Rill Svelte originals are the sibling .svelte files; the Statsparrot product frontend is sentry-data/frontend/src (React 19, Vite, aliases @ -> ./src, @rilldata/web-common -> ../web-common/src, @rilldata/web-admin -> ../web-admin/src). The product uses MOCK/demo data by default (sentry-data/frontend/src/config/index.js, VITE_DEV_MODE) and has no live Rill runtime by default. ";
    p += "You are READ-ONLY. Use read_file, list_dir, or grep only. Do NOT run npm/go builds or installs. ";
    p += "AREA: " + label + " . ";
    p += "TASK: assess current port coverage and end-to-end (E2E) readiness for this area. Inspect the relevant ported React components under web-common and any Rill Svelte originals, then the product wiring points (routing in sentry-data/frontend/src/components/shell/DashboardPage.jsx and sentry-data/frontend/src/App.jsx, sentry-data/frontend/src/stores/useAppStore.js, the data layer, and the app-root providers). For each notable piece, report status: 'ported' (React component exists AND is wired into the running product app), 'partial' (component exists in web-common but is NOT wired into the product app, or its data is not fed so it cannot render), or 'missing' (no React port exists yet). Be concrete: name the component/file and state exactly what wiring is missing to reach Rill 1:1. Treat 'partial' as a gap that the Integrate phase must close. Keep it to the highest-signal items.";
    return p;
}

fn build_int_prompt(id, gaps_json, runtime_url) {
    let p = "";
    p += "You are integrating Rill features into the Statsparrot product frontend for 1:1 parity. Repo: sentry-data (Rill Apache-2.0 fork). Rill React port: sentry-data/web-common/src/*/react (product-app aliases @rilldata/web-common -> ../web-common/src, @rilldata/web-admin -> ../web-admin/src). Product frontend: sentry-data/frontend/src (React 19, Vite, react-router v7, zustand). It uses MOCK/demo data by default (sentry-data/frontend/src/config/index.js, VITE_DEV_MODE). ";
    p += "You have READ-WRITE access. Edit SOURCE CODE only. Do NOT run `npm install`, `go build`, `go mod download`, or any dependency fetch/install. Do NOT modify files outside your area's allowed scope. When done, report the files you created/edited (paths relative to sentry-data) and concise notes. ";
    if runtime_url != () && runtime_url != "" {
        p += "A Rill runtime IS available at " + runtime_url + " — wire the real runtime (RuntimeClientProvider + TanStack QueryClientProvider at the app root) and query a real metrics view. ";
    } else {
        p += "NO Rill runtime is available — provide a MOCK DATA ADAPTER that returns deterministic {rows, columns, spec, measures} from static sample data (NO connector/SaaS brand names) so components render in devMode. ";
    }
    p += "Gaps to close for this area (JSON): " + gaps_json + " . ";

    if id == "data" {
        p += "SCOPE (data wiring): create a single source of truth for runtime/mock data in sentry-data/frontend/src (a data-layer module + mock adapter). If a runtime_url is given, mount RuntimeClientProvider + QueryClientProvider at the app root (App.jsx or the Layout) pointing at the runtime and plumb an instanceId + a default metrics view. Otherwise build the mock adapter into a clearly-named module importable by the dashboard and chat areas. Allowed: new modules under sentry-data/frontend/src and the single app-root provider mount; do NOT touch DashboardPage section wiring or chat files.";
    } else if id == "dashboard" {
        p += "SCOPE (dashboard/explore): assemble a real React Metrics Explorer / Dashboard view in sentry-data/frontend/src that composes already-ported Rill leaf widgets (import from @rilldata/web-common: RillChart, DimensionTable, Leaderboard, MeasureBigNumber, TimeGrainSelector) into ONE working view, feeding them data from the data layer (mock adapter at minimum; real runtime if runtime_url is set). Wire it into sentry-data/frontend/src/components/shell/DashboardPage.jsx sectionComponents as a new section 'explore' and add 'explore' to projectSections in sentry-data/frontend/src/components/app-shared.jsx. New view component lives under frontend/src/components/shell/. Do NOT touch SettingsView/ChatPanel/App.jsx beyond what the new section needs.";
    } else if id == "chat" {
        p += "SCOPE (chat charts): wire the ported Rill chat into the product chat so assistant messages render real charts. Use the ported messages/chart React components from @rilldata/web-common (ChartBlock / Messages). Add a message-render adapter that maps the store's chat toolCalls (see sentry-data/frontend/src/stores/useAppStore.js) onto the Rill block model (ChartBlockModel) and renders via ChartBlock, feeding chart data from the data layer. Wire into sentry-data/frontend/src/components/shell/ChatPanel.jsx / ChatView.jsx. Keep the existing chat composer/tool behavior working. Do NOT touch SettingsView or DashboardPage beyond what is needed.";
    } else if id == "settings" {
        p += "SCOPE (settings): port Rill's settings into the product app at sentry-data/frontend/src. Rill ORG settings = General, Billing, Usage + Users (Members, Guests, Groups); Rill PROJECT settings = General (name, GitHub, visibility, danger zone), Environment Variables, Public URLs. Build React settings views matching Rill's sections, wired into the existing settings surfaces: global /settings/* (SettingsPage.jsx), project SettingsView.jsx, and org OrganizationSettingsView.jsx. Terminology: org = Rill organization, project = Rill project. Reuse existing settings layout/sidebars. Do NOT break existing settings; scope edits to settings files only.";
    }
    return p;
}

fn verify_prompt(runtime_url) {
    let s = "";
    s += "You are the E2E VERIFIER (read-write / execute allowed). Run, from the workspace root: (1) `cd sentry-data/frontend && npm run build`; (2) `cd sentry-data/frontend && npm run test` (this runs vitest). Capture whether each passes. ";
    if runtime_url != () && runtime_url != "" {
        s += "(3) A Rill runtime is up at " + runtime_url + " — probe its health (e.g. `curl " + runtime_url + "/` and any known health route) and, if reachable, run a runtime query against a metrics view; set runtime_ok=true only if the runtime actually responds. ";
    } else {
        s += "(3) No runtime URL was provided: set runtime_ok=false and note 'no runtime'. ";
    }
    s += "Report build_ok, test_ok, runtime_ok (booleans) and a `details` string with the real command outputs, trimmed. Fail closed: any command that errors => the corresponding _ok=false. If you genuinely cannot execute the commands in this environment, set the related _ok=false and say so in details.";
    return s;
}

let mode = "all";
if args != () && args.mode != () { mode = args.mode; }
if mode != "evaluate" && mode != "integrate" && mode != "all" { mode = "all"; }

let scope = "all";
if args != () && args.scope != () { scope = args.scope; }

let runtime_url = ();
if args != () && args.runtime_url != () { runtime_url = args.runtime_url; }

let areas = [
    #{ id: "dashboard", label: "Dashboard / Explore view (assembled React metric explorer)" },
    #{ id: "chat", label: "Chat chart rendering (Rill ChartBlock port)" },
    #{ id: "settings", label: "Settings (org + project)" },
    #{ id: "data", label: "Runtime + mock data wiring (RuntimeClientProvider / QueryClientProvider + metrics view)" },
];

let sel = [];
for a in areas {
    if scope == "all" { sel.push(a); }
    else if scope == a.id { sel.push(a); }
}
if sel.len() == 0 {
    pause("verification", "args.scope must be all|dashboard|chat|settings|data");
}

phase("Evaluate");
let jobs = [];
for a in sel {
    jobs.push(#{ prompt: eval_prompt(a.label), label: "eval:" + a.id, capability_mode: "read-only", output_schema: gap_schema });
}
let eval_results = parallel(jobs);

let eval_jsons = #{};
let i = 0;
for a in sel {
    let r = eval_results[i];
    let gj = "[]";
    if r != () && r.success && r.output != () && r.output.gaps != () {
        gj = json_encode(r.output.gaps);
    }
    eval_jsons[a.id] = gj;
    i += 1;
    log("eval " + a.id + " gaps=" + eval_jsons[a.id]);
}

let int_results = [];
if mode == "integrate" || mode == "all" {
    phase("Integrate");
    let order = ["data", "dashboard", "chat", "settings"];
    for oid in order {
        for a in sel {
            if a.id == oid {
                let prompt = build_int_prompt(a.id, eval_jsons[a.id], runtime_url);
                let agent_id = "integrate:" + a.id;
                let ai = agent(prompt, #{ label: agent_id, capability_mode: "read-write", output_schema: int_schema });
                let rec = #{ "area": a.id };
                if ai != () && ai.success && ai.output != () {
                    rec["done"] = ai.output.done;
                    rec["files"] = ai.output.files;
                    rec["notes"] = ai.output.notes;
                } else {
                    rec["done"] = false;
                    rec["files"] = [];
                    rec["notes"] = ai.output;
                }
                int_results.push(rec);
                log("integrate " + a.id + " done=" + rec["done"].to_string());
            }
        }
    }

    phase("Verify");
    let v = agent(verify_prompt(runtime_url), #{ label: "verify:e2e", capability_mode: "execute", output_schema: verify_schema });
    let v_out = if v != () && v.success && v.output != () { v.output } else { #{ "build_ok": false, "test_ok": false, "runtime_ok": false, "details": "verify returned nothing" } };

    let report = "";
    report += "# rill-e2e report\n\n";
    report += "- mode: " + mode + "\n";
    report += "- scope: " + scope + "\n";
    report += "\n## Coverage gaps (Evaluate)\n";
    for a in sel {
        report += "- **" + a.id + "**: " + eval_jsons[a.id] + "\n";
    }
    report += "\n## Integration results\n";
    for r in int_results {
        report += "- **" + r.area + "**: done=" + r["done"].to_string() + " files=" + json_encode(r["files"]) + " notes=" + r["notes"] + "\n";
    }
    report += "\n## Verification\n";
    report += "- build_ok: " + v_out.build_ok.to_string() + ", test_ok: " + v_out.test_ok.to_string() + ", runtime_ok: " + v_out.runtime_ok.to_string() + "\n";
    report += "- details: " + v_out.details + "\n";

    let rp = write_scratch_file("rill-e2e-report.md", report);
    complete(#{ path: rp, summary: "gaps=" + sel.len().to_string() + " areas, verify=" + v_out.build_ok.to_string() + "/" + v_out.test_ok.to_string() + "/" + v_out.runtime_ok.to_string(), verify: v_out, results: int_results });
}

// evaluate-only
let report = "";
report += "# rill-e2e report (evaluate only)\n\n";
report += "- mode: " + mode + "\n";
report += "- scope: " + scope + "\n\n";
report += "## Coverage gaps\n";
for a in sel {
    report += "- **" + a.id + "**: " + eval_jsons[a.id] + "\n";
}
let rp = write_scratch_file("rill-e2e-report.md", report);
complete(#{ path: rp, summary: "evaluate only, " + sel.len().to_string() + " areas", gaps: eval_jsons });
