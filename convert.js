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
        url: subUrl,
        udp: false,
    })
    const finalUrl = `${apiPath}?${query}`
    console.log(finalUrl);

    const resp = await axios.get(finalUrl);
    fs.writeFileSync('./dist/clash-3f969236-d760-428d-8f00-06e0465e879a.yaml', resp.data);
})();
