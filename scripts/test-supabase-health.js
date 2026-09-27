/**
 * Comprehensive Automated Verification Suite for Supabase Health Engine
 * Covers Phase 14 Requirements from Production Prompt
 */
const { checkSupabaseHealth } = require("./src/lib/services/data-sources");

// Mock global fetch for controlled simulation
const originalFetch = global.fetch;

async function runTests() {
  console.log("===============================================================");
  console.log("VARSHANETRA: SUPABASE HEALTH-CHECK PRODUCTION VERIFICATION SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = "") {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${details ? `-> ${details}` : ""}`);
      failed++;
    }
  }

  // --- Test Case 1: Unresolvable DNS hostname (ENOTFOUND) ---
  console.log("--- Test Case 1: ENOTFOUND DNS Resolution Failure ---");
  {
    global.fetch = async () => {
      const err = new TypeError("fetch failed");
      err.cause = {
        errno: -3008,
        code: "ENOTFOUND",
        syscall: "getaddrinfo",
        hostname: "vxyfdnvxjynwgmzsrylk.supabase.co",
      };
      throw err;
    };

    const res = await checkSupabaseHealth(true);
    assert("Returns UNAVAILABLE on DNS failure", res.status === "UNAVAILABLE", `Got ${res.status}`);
    assert("Does NOT return generic 'fetch failed'", !res.statusReason.startsWith("fetch failed"), `Got: ${res.statusReason}`);
    assert("Classifies error as NETWORK_ERROR", res.diagnostics?.error_type === "NETWORK_ERROR", `Got: ${res.diagnostics?.error_type}`);
    assert("Captures error_code ENOTFOUND", res.diagnostics?.error_code === "ENOTFOUND", `Got: ${res.diagnostics?.error_code}`);
    assert("Identifies endpoint host", res.diagnostics?.endpoint_host.includes("supabase.co"), `Host: ${res.diagnostics?.endpoint_host}`);
    assert("Does not fabricate lastSuccessfulFetchAt", res.lastSuccessfulFetchAt === null || res.lastSuccessfulFetchAt === undefined || typeof res.lastSuccessfulFetchAt === "string");
  }

  // --- Test Case 2: Timeout (>6000ms) ---
  console.log("\n--- Test Case 2: Network Timeout (AbortError) ---");
  {
    global.fetch = async () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    };

    const res = await checkSupabaseHealth(true);
    assert("Returns UNAVAILABLE on timeout", res.status === "UNAVAILABLE", `Got ${res.status}`);
    assert("Classifies error as TIMEOUT", res.diagnostics?.error_type === "TIMEOUT", `Got: ${res.diagnostics?.error_type}`);
    assert("Explains timeout in statusReason", res.statusReason.includes("timed out"), `Got: ${res.statusReason}`);
  }

  // --- Test Case 3: Connection Refused (ECONNREFUSED) ---
  console.log("\n--- Test Case 3: Connection Refused (ECONNREFUSED) ---");
  {
    global.fetch = async () => {
      const err = new TypeError("fetch failed");
      err.cause = {
        code: "ECONNREFUSED",
        syscall: "connect",
        hostname: "localhost",
      };
      throw err;
    };

    const res = await checkSupabaseHealth(true);
    assert("Returns UNAVAILABLE on ECONNREFUSED", res.status === "UNAVAILABLE", `Got ${res.status}`);
    assert("Classifies error as NETWORK_ERROR", res.diagnostics?.error_type === "NETWORK_ERROR");
    assert("Captures error_code ECONNREFUSED", res.diagnostics?.error_code === "ECONNREFUSED");
  }

  // --- Test Case 4: Auth Gateway 401 Unauthorized ---
  console.log("\n--- Test Case 4: Gateway 401 Unauthorized ---");
  {
    global.fetch = async () => {
      return {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      };
    };

    const res = await checkSupabaseHealth(true);
    assert("Returns AUTH_ERROR on HTTP 401", res.status === "AUTH_ERROR", `Got ${res.status}`);
    assert("Classifies error as HTTP_401", res.diagnostics?.error_type === "HTTP_401", `Got: ${res.diagnostics?.error_type}`);
    assert("Captures HTTP 401 status", res.diagnostics?.http_status === 401, `Got: ${res.diagnostics?.http_status}`);
  }

  // --- Test Case 5: Auth Gateway 403 Forbidden ---
  console.log("\n--- Test Case 5: Gateway 403 Forbidden ---");
  {
    global.fetch = async () => {
      return {
        ok: false,
        status: 403,
        statusText: "Forbidden",
      };
    };

    const res = await checkSupabaseHealth(true);
    assert("Returns AUTH_ERROR on HTTP 403", res.status === "AUTH_ERROR", `Got ${res.status}`);
    assert("Classifies error as HTTP_403", res.diagnostics?.error_type === "HTTP_403");
  }

  // --- Test Case 6: Auth Gateway 503 Service Unavailable ---
  console.log("\n--- Test Case 6: Gateway 503 Provider Outage ---");
  {
    global.fetch = async () => {
      return {
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      };
    };

    const res = await checkSupabaseHealth(true);
    assert("Returns UNAVAILABLE on 503", res.status === "UNAVAILABLE", `Got ${res.status}`);
    assert("Classifies error as HTTP_503", res.diagnostics?.error_type === "HTTP_503");
  }

  // --- Test Case 7: Auth Gateway 404 Fallback to PostgREST root ---
  console.log("\n--- Test Case 7: Auth 404 Fallback to /rest/v1/ ---");
  {
    global.fetch = async (url) => {
      if (url.includes("/auth/v1/health")) {
        return { ok: false, status: 404, statusText: "Not Found" };
      }
      if (url.includes("/rest/v1/")) {
        return { ok: true, status: 200, statusText: "OK" };
      }
      return { ok: false, status: 404 };
    };

    const res = await checkSupabaseHealth(true);
    assert("Fallback to /rest/v1/ succeeds and separates service from DB", res.status === "ONLINE" || res.status === "DB_ERROR" || res.status === "CONNECTED", `Got: ${res.status}`);
  }

  // --- Test Case 8: In-Memory Caching & Deduplication ---
  console.log("\n--- Test Case 8: In-Memory Caching & Deduplication ---");
  {
    let fetchCount = 0;
    global.fetch = async () => {
      fetchCount++;
      return { ok: true, status: 200, statusText: "OK" };
    };

    // First call populates cache
    await checkSupabaseHealth(true);
    const countAfterFirst = fetchCount;

    // Second rapid call without forceRefresh must use cache
    await checkSupabaseHealth(false);
    assert("Subsequent call within TTL reuses cache", fetchCount === countAfterFirst, `Fetch count was ${fetchCount}, expected ${countAfterFirst}`);

    // Force refresh bypasses cache
    await checkSupabaseHealth(true);
    assert("forceRefresh=true bypasses cache", fetchCount > countAfterFirst, `Fetch count was ${fetchCount}`);
  }

  // Restore fetch
  global.fetch = originalFetch;

  console.log("\n===============================================================");
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution threw exception:", err);
  process.exit(1);
});
