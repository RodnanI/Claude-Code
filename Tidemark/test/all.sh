#!/bin/sh
# Runs every headless test. Usage: sh test/all.sh
set -e
cd "$(dirname "$0")/.."
node test/smoke.js > /dev/null && echo "smoke: ok"
node test/determinism.js | tail -1
node test/stress.js | grep -c PASS | sed 's/^/stress checks passed: /'
node test/ops.js | grep -c PASS | sed 's/^/operational checks passed: /'
node test/liveness.js | tail -1
node test/scen.js 1 > /dev/null && echo "scenarios: ok"
node test/sandbox.js > /dev/null && echo "sandbox towns: ok"
node test/campaign.js | tail -2 | head -1
node test/campaign2.js
node test/campaign3.js
for s in 1 2 3; do node test/fuzz.js $s 4 15 | tail -1; done
node test/session.js 15 40 5 | tail -1
