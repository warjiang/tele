const crypto = require("node:crypto");
const http = require("node:http");
const https = require("node:https");

const DEFAULT_ENDPOINT = "https://fusion.qiniuapi.com";
const MAX_URLS_PER_REQUEST = 20;
const MAX_DIRS_PER_REQUEST = 5;

class QiniuFusionError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "QiniuFusionError";
    this.details = details;
  }
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

function signQBox(pathWithQuery, secretKey) {
  return crypto
    .createHmac("sha1", secretKey)
    .update(`${pathWithQuery}\n`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createQBoxAuthorization({ accessKey, secretKey, pathWithQuery }) {
  if (!accessKey || !secretKey) {
    throw new QiniuFusionError("Missing Qiniu accessKey or secretKey.");
  }

  if (!pathWithQuery) {
    throw new QiniuFusionError("Missing pathWithQuery for QBox signing.");
  }

  return `QBox ${accessKey}:${signQBox(pathWithQuery, secretKey)}`;
}

function normalizeUrl(input) {
  const value = String(input || "").trim();

  if (!value) {
    throw new QiniuFusionError("URL cannot be empty.");
  }

  return new URL(value).toString();
}

function normalizeDir(input) {
  const url = new URL(String(input || "").trim());

  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }

  return url.toString();
}

function uniq(items) {
  return [...new Set(items)];
}

function chunk(items, size) {
  const result = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

function normalizeRefreshInput({ urls = [], dirs = [] }) {
  const normalizedUrls = uniq(toArray(urls).map(normalizeUrl));
  const normalizedDirs = uniq(toArray(dirs).map(normalizeDir));

  if (normalizedUrls.length === 0 && normalizedDirs.length === 0) {
    throw new QiniuFusionError("At least one refresh URL or directory is required.");
  }

  return {
    urls: normalizedUrls,
    dirs: normalizedDirs,
  };
}

function createRefreshBatches({
  urls = [],
  dirs = [],
  maxUrlsPerRequest = MAX_URLS_PER_REQUEST,
  maxDirsPerRequest = MAX_DIRS_PER_REQUEST,
}) {
  const normalized = normalizeRefreshInput({ urls, dirs });
  const urlBatches = chunk(normalized.urls, maxUrlsPerRequest);
  const dirBatches = chunk(normalized.dirs, maxDirsPerRequest);
  const total = Math.max(urlBatches.length, dirBatches.length);
  const batches = [];

  for (let index = 0; index < total; index += 1) {
    batches.push({
      urls: urlBatches[index] || [],
      dirs: dirBatches[index] || [],
    });
  }

  return batches;
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function requestJson({
  endpoint = DEFAULT_ENDPOINT,
  path,
  method = "POST",
  accessKey,
  secretKey,
  body,
  headers = {},
}) {
  const target = new URL(path, endpoint);
  const pathWithQuery = `${target.pathname}${target.search}`;
  const payload = body === undefined ? "" : JSON.stringify(body);
  const authorization = createQBoxAuthorization({
    accessKey,
    secretKey,
    pathWithQuery,
  });
  const transport = target.protocol === "http:" ? http : https;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        path: pathWithQuery,
        method,
        headers: {
          Accept: "application/json",
          Authorization: authorization,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];

        res.on("data", (chunkValue) => chunks.push(chunkValue));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          const data = parseJsonSafe(raw);
          const result = {
            ok: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            headers: res.headers,
            data,
          };

          if (!result.ok) {
            reject(new QiniuFusionError("Qiniu Fusion API request failed.", result));
            return;
          }

          resolve(result);
        });
      },
    );

    req.on("error", (error) => {
      reject(
        new QiniuFusionError("Unable to reach Qiniu Fusion API.", {
          cause: error.message,
        }),
      );
    });

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

async function refreshBatch({
  accessKey,
  secretKey,
  urls = [],
  dirs = [],
  endpoint = DEFAULT_ENDPOINT,
}) {
  const normalized = normalizeRefreshInput({ urls, dirs });
  const response = await requestJson({
    endpoint,
    path: "/v2/tune/refresh",
    accessKey,
    secretKey,
    body: normalized,
  });

  return response.data;
}

async function refreshCache({
  accessKey,
  secretKey,
  urls = [],
  dirs = [],
  endpoint = DEFAULT_ENDPOINT,
  maxUrlsPerRequest = MAX_URLS_PER_REQUEST,
  maxDirsPerRequest = MAX_DIRS_PER_REQUEST,
}) {
  const batches = createRefreshBatches({
    urls,
    dirs,
    maxUrlsPerRequest,
    maxDirsPerRequest,
  });
  const results = [];

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const data = await refreshBatch({
      accessKey,
      secretKey,
      endpoint,
      urls: batch.urls,
      dirs: batch.dirs,
    });

    results.push({
      batch: index + 1,
      input: batch,
      output: data,
    });
  }

  return {
    totalBatches: results.length,
    results,
  };
}

module.exports = {
  DEFAULT_ENDPOINT,
  MAX_DIRS_PER_REQUEST,
  MAX_URLS_PER_REQUEST,
  QiniuFusionError,
  createQBoxAuthorization,
  createRefreshBatches,
  normalizeDir,
  normalizeRefreshInput,
  refreshBatch,
  refreshCache,
  requestJson,
  signQBox,
};
