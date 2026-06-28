
import fs from 'fs';

async function testYtv() {
    const youtubeUrl = 'https://youtu.be/IEU7jLMzy44?si=IZVgCt2hOB-Z3X28';
    const match = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|live\/|shorts\/)|[?&]v=)([a-zA-Z0-9-_]{11})/.exec(youtubeUrl);
    if (!match) {
        console.log("URL Invalid");
        return;
    }

    const videoId = match[1];
    const endpoint = 'etacloud.org';
    const getTs = () => Date.now();
    const browserHeaders = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 16; Infinix X6837 Build/BP2A.250605.031.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.217 Mobile Safari/537.36",
        "Accept": "*/*",
        "Origin": "https://y2mate.cc",
        "Referer": "https://y2mate.cc/",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Mode": "cors"
    };

    async function safeFetch(url, options = {}) {
        options.headers = { ...browserHeaders, ...options.headers };
        const res = await fetch(url, options);
        const text = await res.text();
        console.log(`\n--- Fetching: ${url} ---`);
        console.log(`Response: ${text}`);
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error(`JSON Parse Error: ${text}`);
        }
    }

    const appendParam = (url, params) => url.includes('?') ? `${url}&${params}` : `${url}?${params}`;

    try {
        const authData = await safeFetch(`https://eta.${endpoint}/api/v1/auth?_=${getTs()}`);
        const initData = await safeFetch(`https://eta.${endpoint}/api/v1/init?_=${getTs()}`, {
            headers: { 'Authorization': `Bearer ${authData.key}` }
        });

        async function executeConvert(url) {
            let baseUrl = url.includes('&v=') ? url.split('&v=')[0] : url;
            let fetchUrl = appendParam(baseUrl, `v=${videoId}&f=mp4&_=${getTs()}`);
            const convertData = await safeFetch(fetchUrl);
            if (convertData.redirect === 1) {
                return executeConvert(convertData.redirectURL);
            }
            return convertData;
        }

        const convertData = await executeConvert(initData.convertURL);
        let finalData = convertData;

        while (finalData.progress !== undefined && finalData.progress < 3) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            let progressUrl = appendParam(convertData.progressURL, `_=${getTs()}`);
            finalData = await safeFetch(progressUrl);
        }
        console.log("\nFinal Result:", finalData);

    } catch (error) {
        console.error("\nError occurred:", error);
    }
}

testYtv();
