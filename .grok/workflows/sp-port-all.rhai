let meta = #{
    name: "sp-port-all",
    description: "Statsparrot long-running port: iterate a list of increments, Execute -> Audit -> Arbitrate each (with one retry on RESCRIBE), log verdicts, complete with an aggregate.",
    phases: [
        #{ title: "Execute", detail: "Executor produces each increment's candidate port" },
        #{ title: "Audit", detail: "Auditor adversarially verifies each increment" },
        #{ title: "Arbitrate", detail: "Arbiter decides ACCEPT / RESCRIBE / BLOCKER_UPSTREAM per increment" },
    ],
};

let auditor_schema = #{
    "type": "object",
    "required": ["accepted", "issues", "runtime_checks"],
    "properties": #{
        "accepted": #{ "type": "boolean" },
        "issues": #{ "type": "array", "items": #{ "type": "string" } },
        "runtime_checks": #{ "type": "array", "items": #{ "type": "string" } },
    },
};
let arbiter_schema = #{
    "type": "object",
    "required": ["verdict", "feedback", "converged"],
    "properties": #{
        "verdict": #{ "type": "string", "enum": ["ACCEPT", "RESCRIBE", "BLOCKER_UPSTREAM"] },
        "feedback": #{ "type": "string" },
        "converged": #{ "type": "boolean" },
    },
};

let preamble = "You are working on a source-level port of Rill into Statsparrot. Repo root, branch feat/rill-bi. The Rill source already lives in web-common/ (Svelte) and runtime/ + admin/ + proto/ + cli/ (Go). We translate Rill's Svelte UI to React and copy framework-agnostic logic verbatim. HARD RULES: do NOT run npm install, go mod download, go build, tsc, or any command that installs/builds dependencies. Work only at the source level (copy whole modules verbatim, translate .svelte views to React .tsx, resolve conflicts, wire settings). You may safely use: cp, mv, rm (only files you are replacing), mkdir, find, grep, read files, write files, git diff --stat, git status. React components go in a sibling react/ subfolder next to the corresponding Svelte component (e.g. features/x/react/Foo.tsx). Reuse the existing framework-agnostic TS (selectors, filter-utils, data-provider, builder, runtime-client) by importing it; do not rewrite it. For Svelte store values in React, use the existing useReadable() bridge at features/components/charts/react/useReadable.ts. Produce concrete evidence: files created/edited, file counts, key files present, and any build-env runtime checks. Self-contained increment: ";

let increments = if args == () || args.increments == () { [] } else { args.increments };
if increments.len() == 0 {
    pause("verification", "Pass args.increments — an array of self-contained port increment descriptions.");
}

let results = [];
for task in increments {
    phase("Execute: " + task);
    let exec = agent(preamble + task + " .",
        #{ label: "executor", capability_mode: "all", phase: "Execute" });
    if !exec.success {
        results.push(#{ "task": task, "verdict": "EXEC_FAILED", "feedback": exec.output });
        log(task + " => EXEC_FAILED");
        continue;
    }

    phase("Audit: " + task);
    let aud = agent(
        "You are the AUDITOR, READ-ONLY. Adversarially verify the Executor's port increment. You may NOT run npm install/go build/any dependency command. Use only read-only tools (read_file, list_dir, grep, find, git diff --stat, git status) to inspect the repo. Try to REFUTE the Executor's completion: confirm ported files are faithful to their Rill source, imports/aliases resolve, settings are wired, nothing already ported regressed. Environment caveat: no Go toolchain, no node modules installed, and the read-only sandbox may not see the feat/rill-bi branch/working tree -- if you truly cannot access the files, set accepted=false and put a clear 'visibility' note. Otherwise accepted=true only with evidence you inspected. Increment: " + task,
        #{ label: "auditor", capability_mode: "read-only", phase: "Audit", output_schema: auditor_schema });

    phase("Arbitrate: " + task);
    let arb = agent(
        "You are the ARBITER. Decide for this increment: " + task + " . Given the Executor's summary and the Auditor's findings: " + json_encode(aud.output) + " . Decide ACCEPT (converged), RESCRIBE (concrete feedback to fix now), or BLOCKER_UPSTREAM (problem in an earlier/upstream increment or infra outside this one). Be decisive and concrete; set converged=true only if you accept.",
        #{ label: "arbiter", capability_mode: "read-only", phase: "Arbitrate", output_schema: arbiter_schema });

    let arb_v = if arb != () && arb.success && arb.output != () { arb.output } else { #{ "verdict": "MAX_HIT", "feedback": "No arbiter output.", "converged": false } };
    let verdict = arb_v.verdict;
    results.push(#{ "task": task, "verdict": verdict, "feedback": arb_v.feedback, "converged": arb_v.converged, "auditor": aud.output });
    log(task + " => " + verdict);

    if verdict == "RESCRIBE" && arb_v.feedback != () && arb_v.feedback != "" {
        phase("Retry: " + task);
        let exec2 = agent(preamble + task + " . Retry incorporating this feedback: " + arb_v.feedback,
            #{ label: "executor:retry", capability_mode: "all", phase: "Retry" });
        results.push(#{ "task": task + " (retry)", "verdict": "RETRYED", "feedback": exec2.output });
    }
}

let accepted = 0;
let blocked = 0;
for r in results {
    if r.verdict == "ACCEPT" { accepted += 1; }
    if r.verdict == "EXEC_FAILED" || r.verdict == "BLOCKER_UPSTREAM" || r.verdict == "MAX_HIT" { blocked += 1; }
    r.verdict;
}
log("Pipeline done: " + accepted.to_string() + " accepted, " + blocked.to_string() + " blocked/unverified across " + results.len().to_string() + " increments.");
complete(#{ summary: results.len().to_string() + " increments processed (" + accepted.to_string() + " accepted)", results: results });
