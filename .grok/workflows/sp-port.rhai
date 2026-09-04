let meta = #{
    name: "sp-port",
    description: "Statsparrot: execute one Rill-monolith port increment, adversarially audit it, and arbitrate (Executor -> Auditor -> Arbiter).",
    phases: [
        #{ title: "Execute", detail: "Executor produces the candidate port increment" },
        #{ title: "Audit", detail: "Auditor adversarially verifies the increment" },
        #{ title: "Arbitrate", detail: "Arbiter decides ACCEPT / RESCRIBE / BLOCKER_UPSTREAM and convergence" },
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

let task = if args == () { () } else { args.task };
if task == () {
    pause("verification", "Pass args.task — a self-contained description of one port increment: scope, what to produce, acceptance criteria.");
}

phase("Execute");
let exec = agent(
    "You are the EXECUTOR for a source-level port of Rill into Statsparrot (repo root, branch feat/rill-bi). "
    + "HARD RULE: do NOT run npm install, go mod download, go build, tsc, or any command that fetches/builds dependencies. "
    + "Work only at the source level: copy whole modules verbatim, translate .svelte views to React, resolve conflicts, and wire settings/config. "
    + "You may safely use: cp, mv, rm (only for files you are replacing), mkdir, find, grep, read, write, git diff --stat, git status. "
    + "Self-contained increment: " + task + " . "
    + "Produce concrete evidence and a summary: which files you created/edited, file counts, key files present, and any remaining runtime checks that a build environment (Go + node deps) must verify.",
    #{ label: "executor", capability_mode: "all", phase: "Execute" }
);

phase("Audit");
let aud = agent(
    "You are the AUDITOR. Adversarially verify the Executor's increment in the repo at the workspace root (branch feat/rill-bi). "
    + "You are read-only. HARD RULE: do NOT run npm install, go mod download, go build, or any dependency command. Use read-only tools (read_file, list_dir, grep, find, git diff --stat, git status) only. "
    + "Try to REFUTE the Executor's completion: confirm the ported files are faithful to their Rill source, imports/aliases resolve, settings/config are wired, and nothing already ported regressed. "
    + "Environment constraint: there is no Go toolchain and no node modules installed here, so you CANNOT compile/test; list those as runtime_checks for a build environment. "
    + "Set accepted=true only with concrete evidence you inspected yourself; otherwise accepted=false. "
    + "Record concrete issues (resolvable in this repo now) and runtime_checks (must run in a Go+node build environment). Increment: " + task,
    #{ label: "auditor", capability_mode: "read-only", phase: "Audit", output_schema: auditor_schema }
);

phase("Arbitrate");
let arb = agent(
    "You are the ARBITER. Given the Executor's summary and the Auditor's findings for this increment: " + task + " . "
    + "Decide: ACCEPT (increment converged, port continues to the next increment), RESCRIBE (give concrete feedback the Executor must fix in this repo now), or BLOCKER_UPSTREAM (the problem is in an earlier/upstream increment or infra outside this increment). "
    + "Set converged=true only if you accept it and nothing blocks. Auditor findings (if any): " + json_encode(aud.output) + " . Be decisive and concrete.",
    #{ label: "arbiter", capability_mode: "read-only", phase: "Arbitrate", output_schema: arbiter_schema }
);

let arb_v = if arb != () && arb.success && arb.output != () { arb.output } else { #{ "verdict": "MAX_HIT", "feedback": "No arbiter output.", "converged": false } };
log("sp-port verdict: " + arb_v.verdict + " (converged=" + arb_v.converged.to_string() + ")");
complete(#{ verdict: arb_v.verdict, feedback: arb_v.feedback, converged: arb_v.converged, auditor: aud.output });
