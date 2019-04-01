var fs = require('fs');
var axios = require('axios');

makeFolder = (fullPath) => {
    var path = fullPath.replace(/\/$/, '').split('/');
    for (var i = 1; i <= path.length; i++) {
        var segment = path.slice(0, i).join('/');
        !fs.existsSync(segment) ? fs.mkdirSync(segment) : null;
    }
},

bytesToSize = (bytes) => {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

//Check to see if the default Fidder Port 8888 is reachable if so route traffic thru Fiddler on 127.0.0.1
//Using this for debugging
isFiddlerRunning = async (fiddlerProxy, fiddlerPort) => {
    var fiddlerEchoPage = `http://${fiddlerProxy}:${fiddlerPort}`;
    try {
        const response = await axios.get(fiddlerEchoPage);
        if (/Fiddler Echo Service/.test(response.data || '')) {
            return true;
        }
    } catch (err) {
        return false;
    }
};

module.exports = {
    makeFolder: makeFolder,
    bytesToSize: bytesToSize,
    isFiddlerRunning: isFiddlerRunning
};