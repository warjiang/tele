const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createQBoxAuthorization,
  createRefreshBatches,
  normalizeDir,
} = require("../src/qiniu-fusion");

test("createQBoxAuthorization preserves the expected base64 padding", () => {
  const auth = createQBoxAuthorization({
    accessKey: "test-ak",
    secretKey: "test-sk",
    pathWithQuery: "/v2/tune/refresh",
  });

  assert.equal(auth, "QBox test-ak:m4WupgZ9okXl2jQC6sBdekRBCsI=");
});

test("normalizeDir appends trailing slash for directory refresh", () => {
  assert.equal(
    normalizeDir("https://static.example.com/docs"),
    "https://static.example.com/docs/",
  );
});

test("createRefreshBatches respects url and dir batch sizes", () => {
  const urls = Array.from({ length: 21 }, (_, index) => {
    return `https://static.example.com/file-${index}.js`;
  });
  const dirs = Array.from({ length: 6 }, (_, index) => {
    return `https://static.example.com/assets-${index}/`;
  });
  const batches = createRefreshBatches({ urls, dirs });

  assert.equal(batches.length, 2);
  assert.equal(batches[0].urls.length, 20);
  assert.equal(batches[1].urls.length, 1);
  assert.equal(batches[0].dirs.length, 5);
  assert.equal(batches[1].dirs.length, 1);
});
