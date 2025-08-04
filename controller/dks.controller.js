const FormData = require('form-data');
const axios = require('axios');

 exports.getDKSToken =async function (req, res, callback) {
    let authObj = req.body.authObj || {};
    var authObjKeys=Object.keys(authObj) || [];
    let outJson = {};
    console.log("authObj",authObj)

    if(authObjKeys.length > 0){
        let token = '';
        let methodParam = {};
        methodParam["bodyParams"] = authObj["bodyParams"];
        methodParam["service_url"] = authObj["url"];
        let authResult = await execGetAxiOsRequestMethod(methodParam);
        console.log("authResult",authResult);
        if(authResult.status == 'SUCCESS'){
            let tokenResult = authResult["result"] || {};
            let tokenDetails = tokenResult["Details"][0] || {};
            if(tokenDetails.status == true){
                token = tokenDetails["token"] || '';
            }
            outJson["result"] = token;
            outJson["status"] = "SUCCESS";
            outJson["message"] = "SUCCESS";
            callback(null,outJson);
        } else {
            callback(null,authResult);
        }
    } else if(authObjKeys.length == 0){
        outJson["result"] = '';
        outJson["status"] = "FAIL";
        outJson["message"] = "Please Verify authObj can not be blank!";
        callback(null,outJson);
    }
}

function execGetAxiOsRequestMethod(methodParam) {
    return new Promise(function (resolve, reject) {
        getAxiOsRequestMethod( methodParam,  function (error, result) {
            if (error) {
                reject(error);
            }
            resolve(result);
        });
    });
}

async function getAxiOsRequestMethod(paramJson, callback){
    let bodyParams = paramJson.bodyParams || {};
    let service_url = paramJson.service_url;
    let outJson = {};
    var bodyParamsKeys=Object.keys(bodyParams) || [];

    let form = new FormData();
    for(let i=0;i<bodyParamsKeys.length;i++){
        let key = bodyParamsKeys[i];
        let val = bodyParams[key];

        form.append(key, val);
    }
   console.log("service_url",service_url);
   //console.log("bodyParams",bodyParams);
    console.log("Form Data",form) 
    //const {data} = await Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
    axios.post(service_url, form, {
        headers: {
            'Content-Type': `multipart/form-data`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
            'secureProtocol': 'TLSv1_3_method'
        }
    }).then(function (response) {
        console.log(response.data);
        outJson["result"] = response.data;   
        outJson["message"]="SUCCESS";
        outJson["status"]="SUCCESS";
        callback(null,outJson);   
    }).catch(function (error) {
        console.log(error);
        outJson["message"]=error.message;
        outJson["status"]="FAIL";
        callback(null,outJson);   
    });
}