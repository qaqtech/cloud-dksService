// const FormData = require('form-data');
// const axios = require('axios');

//  exports.getDKSServiceDtl =async function (req, res, callback) {
//     let serviceObj = req.body.serviceObj || {};
//     var serviceObjKeys=Object.keys(serviceObj) || [];
//     let outJson = {};
//     //console.log("serviceObjKeys",serviceObjKeys)

//     if(serviceObjKeys.length > 0){
//         let methodParam = {};
//         methodParam["bodyParams"] = serviceObj["bodyParams"];
//         methodParam["service_url"] = serviceObj["service_url"];
//         let dksResult = await execGetAxiOsRequestMethod(methodParam);
//         //console.log("dksResult",dksResult);
//         callback(null,dksResult);
//     } else if(serviceObjKeys.length == 0){
//         outJson["result"] = '';
//         outJson["status"] = "FAIL";
//         outJson["message"] = "Please Verify serviceObjKeys can not be blank!";
//         callback(null,outJson);
//     }
// }

// function execGetAxiOsRequestMethod(methodParam) {
//     return new Promise(function (resolve, reject) {
//         getAxiOsRequestMethod( methodParam,  function (error, result) {
//             if (error) {
//                 reject(error);
//             }
//             resolve(result);
//         });
//     });
// }

// async function getAxiOsRequestMethod(paramJson, callback){
//     let bodyParams = paramJson.bodyParams || {};
//     let service_url = paramJson.service_url;
//     let outJson = {};
//     var bodyParamsKeys=Object.keys(bodyParams) || [];

//     let form = new FormData();
//     for(let i=0;i<bodyParamsKeys.length;i++){
//         let key = bodyParamsKeys[i];
//         let val = bodyParams[key];

//         form.append(key, val);
//     }
//    //console.log("service_url",service_url);
//    //console.log("bodyParams",bodyParams);
//     //console.log("Form Data",form) 
//     //const {data} = await Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
//     axios.post(service_url, form, {
//         headers: {
//             'Content-Type': `multipart/form-data`,
//             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
//             'secureProtocol': 'TLSv1_3_method'
//         }
//     }).then(function (response) {
//         //console.log(response.data);
//         outJson["result"] = response.data;   
//         outJson["message"]="SUCCESS";
//         outJson["status"]="SUCCESS";
//         callback(null,outJson);   
//     }).catch(function (error) {
//         //console.log(error);
//         outJson["message"]=error.message;
//         outJson["status"]="FAIL";
//         callback(null,outJson);   
//     });
// }

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
    };

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

  const outJson = {};
  const baseHeaders = {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "X-Request-Id": clientRequestId,
  };

  if (bearerToken) {
    baseHeaders.Authorization = `Bearer ${bearerToken}`;
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

  try {
    const doRequest = async () => {
      if (payloadType === "json") {
        return axios.post(service_url, bodyParams, {
          ...axiosConfig,
          headers: {
            ...baseHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      const form = new FormData();
      for (const [k, v] of Object.entries(bodyParams)) {
        form.append(k, v);
      }

      return axios.post(service_url, form, {
        ...axiosConfig,
        headers: {
          ...baseHeaders,
          ...form.getHeaders(),
        },
      });
    };

    const response = paramJson.retry_429 ? await axiosPostWith429Retry(doRequest) : await doRequest();

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

    outJson.status = "FAIL";
    outJson.http_status = status;
    outJson.result = data;

    outJson.error_code = data?.Details?.[0]?.error_code || null;
    outJson.request_id =
      data?.Details?.[0]?.request_id ||
      error?.response?.headers?.["x-request-id"] ||
      clientRequestId;

    outJson.message =
      data?.Details?.[0]?.message ||
      error?.message ||
      "Request failed";

    return outJson;
  }
}
