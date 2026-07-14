const crypto = require('crypto');
const axios = require('axios');

function generateQBoxToken(accessKey, secretKey, method, path, host, contentType, body) {
    const signingStr = `${method} ${path}\nHost: ${host}\nContent-Type: ${contentType}\n\n${body}`;
    const sign = crypto.createHmac('sha1', secretKey).update(signingStr).digest();
    const encodedSign = sign.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    return `QBox ${accessKey}:${encodedSign}`;
}

(async () => {
    if (process.argv.length < 3) {
        console.log("Usage: node refresh.js <cdn_url>");
        process.exit(1);
    }

    const cdnUrl = process.argv[2];
    const { QINIU_ACCESS_KEY, QINIU_SECRET_KEY } = process.env;

    if (!QINIU_ACCESS_KEY || !QINIU_SECRET_KEY) {
        console.error("Missing required environment variables: QINIU_ACCESS_KEY and QINIU_SECRET_KEY must be set");
        process.exit(1);
    }

    const host = 'fusion.qiniuapi.com';
    const apiPath = '/v2/tune/refresh';
    const contentType = 'application/json';
    const body = JSON.stringify({ urls: [cdnUrl] });

    const token = generateQBoxToken(QINIU_ACCESS_KEY, QINIU_SECRET_KEY, 'POST', apiPath, host, contentType, body);

    console.log(`Refreshing CDN cache for: ${cdnUrl}`);

    try {
        const resp = await axios.post(`https://${host}${apiPath}`, body, {
            headers: {
                'Content-Type': contentType,
                'Authorization': token,
            },
        });
        console.log('Cache refresh response:', JSON.stringify(resp.data));
    } catch (err) {
        const detail = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error(`Failed to refresh CDN cache: ${detail}`);
        process.exit(1);
    }
})();
