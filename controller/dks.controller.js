const axios = require("axios");
const FormData = require("form-data");
const https = require("https");
const crypto = require("crypto");

function makeRequestId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
}

async function axiosPostWith429Retry(fn, { maxAttempts = 5 } = {}) {
  let attempt = 0;
  let delayMs = 2000;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status;

      attempt += 1;
      if (status !== 429 || attempt >= maxAttempts) throw err;
      const jitter = Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, Math.min(delayMs, 60000) + jitter));
      delayMs *= 2;
    }
  }
}

exports.getDKSServiceDtl = async function (req, res, callback) {
  const serviceObj = req.body.serviceObj || {};
  const serviceObjKeys = Object.keys(serviceObj || {});

  if (serviceObjKeys.length === 0) {
    return callback(null, {
      result: "",
      status: "FAIL",
      message: "Please Verify serviceObjKeys can not be blank!",
    });
  }

  try {
    const methodParam = {
      bodyParams: serviceObj.bodyParams || {},
      service_url: serviceObj.service_url,
      payload_type: serviceObj.payload_type || "json",
      bearer_token: serviceObj.bearer_token || null,
      request_id: serviceObj.request_id || null,
      timeout_ms: serviceObj.timeout_ms || 60000,
      retry_429: serviceObj.retry_429 !== false,
      headers: serviceObj.headers || {},
    };

    // DRY RUN MODE
    const isDryRun = serviceObj.dry_run === true || serviceObj.dry_run === "true";
    if (isDryRun) {
      const safeBody = { ...(serviceObj.bodyParams || {}) };
      if (safeBody.password) safeBody.password = "******";

      const safeHeaders = { ...(serviceObj.headers || {}) };
      if (safeHeaders["x-integration-key"]) safeHeaders["x-integration-key"] = "******";

      return callback(null, {
        status: "SUCCESS",
        message: "DRY_RUN (no upstream call made)",
        would_send: {
          service_url: serviceObj.service_url,
          payload_type: serviceObj.payload_type || "json",
          headers: {
            ...safeHeaders,
            Accept: "application/json",
            "Content-Type":
              String(serviceObj.payload_type || "json").toLowerCase() === "json"
                ? "application/json"
                : "multipart/form-data",
          },
          bodyParams: safeBody,
        },
      });
    }

    const dksResult = await getAxiOsRequestMethod(methodParam);
    return callback(null, dksResult);
  } catch (e) {
    return callback(null, {
      result: null,
      status: "FAIL",
      message: e?.message || "Unknown error",
    });
  }
};

async function getAxiOsRequestMethod(paramJson) {
  const bodyParams = paramJson.bodyParams || {};
  const service_url = paramJson.service_url;
  const payloadType = String(paramJson.payload_type || "json").toLowerCase();
  const bearerToken = paramJson.bearer_token || null;
  const clientRequestId = paramJson.request_id || makeRequestId();
  const extraHeadersRaw = paramJson.headers || {};

  const toLowerKeys = (obj = {}) => {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[String(k).toLowerCase()] = v;
    }
    return out;
  };

  const maskHeaders = (obj = {}) => {
    const out = { ...obj };
    const secretKeys = [
      "authorization",
      "x-integration-key",
      "cookie",
      "cf-access-client-secret",
      "x-api-key",
    ];
    for (const k of Object.keys(out)) {
      if (secretKeys.includes(String(k).toLowerCase())) out[k] = "****";
    }
    return out;
  };

  const isHtmlChallenge = (data) =>
    typeof data === "string" &&
    (data.includes("Just a moment") ||
      data.includes("/cdn-cgi/challenge-platform") ||
      data.includes("__cf_chl"));

  // ---- normalize headers ----
  const extraHeaders = toLowerKeys(extraHeadersRaw);

  const baseHeaders = {
    accept: "application/json",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "x-request-id": clientRequestId,
    ...extraHeaders,
  };

  if (bearerToken) {
    baseHeaders["authorization"] = `Bearer ${bearerToken}`;
  }

  const httpsAgent = new https.Agent({
    keepAlive: true,
    minVersion: "TLSv1.2",
  });

  const axiosConfig = {
    timeout: paramJson.timeout_ms || 60000,
    httpsAgent,
    maxContentLength: 5 * 1024 * 1024,
    maxBodyLength: 5 * 1024 * 1024,
    validateStatus: (status) => status >= 200 && status < 300, // treat non-2xx as errors
  };

  const outJson = {};

  try {
    const doRequest = async () => {
      if (payloadType === "json") {
        const outgoingHeaders = {
          ...baseHeaders,
          "content-type": "application/json",
        };

        try {
          return await axios.post(service_url, bodyParams, {
            ...axiosConfig,
            headers: outgoingHeaders,
          });
        } catch (err) {
          const h = err?.response?.headers || {};
          const data = err?.response?.data;
          if (isHtmlChallenge(data)) {
            console.log("[UPSTREAM ERROR] challenge snippet:", String(data).slice(0, 300));
          }
          throw err;
        }
      }

      const form = new FormData();
      for (const [k, v] of Object.entries(bodyParams || {})) {
        form.append(k, v);
      }

      const formHeaders = toLowerKeys(form.getHeaders());
      const outgoingHeaders = {
        ...baseHeaders,
        ...formHeaders,
      };

      try {
        return await axios.post(service_url, form, {
          ...axiosConfig,
          headers: outgoingHeaders,
        });
      } catch (err) {
        const h = err?.response?.headers || {};
        const data = err?.response?.data;
        throw err;
      }
    };

    const response = paramJson.retry_429
      ? await axiosPostWith429Retry(doRequest)
      : await doRequest();

    outJson.result = response.data;
    outJson.status = "SUCCESS";
    outJson.message = "SUCCESS";
    outJson.http_status = response.status;

    outJson.request_id =
      response.headers?.["x-request-id"] ||
      response.data?.Details?.[0]?.request_id ||
      clientRequestId;

    return outJson;
  } catch (error) {
    const status = error?.response?.status || null;
    const data = error?.response?.data || null;
    const headers = error?.response?.headers || {};

    outJson.status = "FAIL";
    outJson.http_status = status;
    outJson.result = data;

    outJson.upstream = {
      url: service_url,
      payload_type: payloadType,
      headers: {
        server: headers["server"],
        "cf-ray": headers["cf-ray"],
        "content-type": headers["content-type"],
        date: headers["date"],
        "x-request-id": headers["x-request-id"],
      },
    };

    outJson.error_code = data?.Details?.[0]?.error_code || null;
    outJson.request_id =
      data?.Details?.[0]?.request_id ||
      headers?.["x-request-id"] ||
      clientRequestId;

    outJson.message =
      data?.Details?.[0]?.message ||
      error?.message ||
      "Request failed";

    return outJson;
  }
}
