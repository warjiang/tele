#!/usr/bin/env node

const { QiniuFusionError, refreshCache } = require("./src/qiniu-fusion");

function printUsage() {
  console.error(
    "Usage: node refresh.js <cdn_url> [cdn_url2 ...] | node refresh.js --url <cdn_url> [--url <cdn_url2>] [--dir <cdn_dir>]",
  );
}

function parseRefreshArgs(args) {
  const urls = [];
  const dirs = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--url" || arg === "--dir") {
      const value = args[index + 1];

      if (!value || value.startsWith("--")) {
        throw new QiniuFusionError(`Missing value for option: ${arg}`);
      }

      if (arg === "--url") {
        urls.push(value);
      } else {
        dirs.push(value);
      }

      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new QiniuFusionError(`Unsupported option: ${arg}`);
    }

    urls.push(arg);
  }

  return { urls, dirs };
}

async function main() {
  const args = process.argv.slice(2);

  if (
    args.length === 0 ||
    args.includes("--help") ||
    args.includes("-h")
  ) {
    printUsage();
    process.exitCode = args.length === 0 ? 1 : 0;
    return;
  }

  const { QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_FUSION_ENDPOINT } = process.env;

  if (!QINIU_ACCESS_KEY || !QINIU_SECRET_KEY) {
    throw new QiniuFusionError(
      "Missing required environment variables: QINIU_ACCESS_KEY and QINIU_SECRET_KEY must be set.",
    );
  }

  const { urls, dirs } = parseRefreshArgs(args);

  const result = await refreshCache({
    accessKey: QINIU_ACCESS_KEY,
    secretKey: QINIU_SECRET_KEY,
    endpoint: QINIU_FUSION_ENDPOINT,
    urls,
    dirs,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  if (error instanceof QiniuFusionError) {
    console.error(error.message);
    if (error.details && Object.keys(error.details).length > 0) {
      console.error(JSON.stringify(error.details, null, 2));
    }
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
