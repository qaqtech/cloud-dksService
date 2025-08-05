const FormData = require('form-data');
const axios = require('axios');

 exports.getDKSServiceDtl =async function (req, res, callback) {
    let serviceObj = req.body.serviceObj || {};
    var serviceObjKeys=Object.keys(serviceObj) || [];
    let outJson = {};
    console.log("serviceObjKeys",serviceObjKeys)

    if(serviceObjKeys.length > 0){
        let methodParam = {};
        methodParam["bodyParams"] = serviceObj["bodyParams"];
        methodParam["service_url"] = serviceObj["service_url"];
        let dksResult = await execGetAxiOsRequestMethod(methodParam);
        console.log("dksResult",dksResult);
        callback(null,dksResult);
    } else if(serviceObjKeys.length == 0){
        outJson["result"] = '';
        outJson["status"] = "FAIL";
        outJson["message"] = "Please Verify serviceObjKeys can not be blank!";
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