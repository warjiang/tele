const fs = require('fs');
const qs = require('querystring');
const axios = require("axios");


(async () => {
    const subUrl = fs.readFileSync('./subscribe.txt', 'utf8').toString();

    const {SUBCONVERTER_HOST='127.0.0.1', SUBCONVERTER_PORT=25500} = process.env
    console.log(JSON.stringify({
        SUBCONVERTER_HOST,
        SUBCONVERTER_PORT
    }))
    const apiPath = `http://${SUBCONVERTER_HOST}:${SUBCONVERTER_PORT}/sub`;

    const query = qs.encode({
        target: 'clashr',
        url: subUrl
    })
    const finalUrl = `${apiPath}?${query}`
    console.log(finalUrl);

    const resp = await axios.get(finalUrl);
    console.log(resp);
})();
