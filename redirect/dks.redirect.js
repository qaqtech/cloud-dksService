let dksController = require('../controller/dks.controller');

exports.load = function(req, res) {
    var outJson = {};
    var method = req.headers['method'] || '';
    if(method !=''){
        if(typeof dksController[''+method] === 'function'){
            dksController[''+method](req,res,function(error,result){
                res.send(result);
            });
        }else{
            outJson["result"]='';
            outJson["status"]="FAIL";
            outJson["message"]="Please Verify Method Name Parameter!";
            res.send(outJson);
        }
                                
    }else if(method ==''){
        outJson["result"]='';
        outJson["status"]="FAIL";
        outJson["message"]="Please Verify Method Name Can not be blank!!";
        res.send(outJson);
    }
}
