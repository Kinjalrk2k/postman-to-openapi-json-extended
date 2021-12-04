#!/usr/bin/env node

const postmanToOpenApi = require("postman-to-openapi");
const YAML = require("yamljs");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const $RefParser = require("json-schema-ref-parser");
const colors = require("colors");

const openapiJSONPath = "./openapi.json";

const importSchemas = async (obj) => {
  const jsonFiles = fs
    .readdirSync(path.resolve("schemas"))
    .filter((filename) => filename.endsWith(".json"));

  console.log(
    `${jsonFiles.length} files found on the schemas directory`.italic.underline
  );

  await Promise.all(
    jsonFiles.map(async (jsonFile) => {
      const content = require(path.resolve("schemas", jsonFile));

      const refsJSON = await $RefParser.dereference(content);

      for (const nestedPath in refsJSON) {
        _.set(obj, nestedPath, {
          ..._.get(obj, nestedPath),
          ...refsJSON[nestedPath],
        });
      }
    })
  );

  return obj;
};

const writeToJSONFile = (data, filePath) =>
  fs.writeFileSync(
    path.resolve(path.join(filePath)),
    JSON.stringify(data, null, 2)
  );

module.exports = async (postmanCollectionPath, config) => {
  const rawOpenapiYAML = await postmanToOpenApi(
    path.resolve(postmanCollectionPath),
    null,
    config
  );

  const rawOpenapiJSON = YAML.parse(rawOpenapiYAML);
  const openapiJSON = await importSchemas(rawOpenapiJSON);

  writeToJSONFile(openapiJSON, openapiJSONPath);

  console.log(
    "\n[✓] Build the OpenAPI spec file and saved in `openapi.json` file".green,
    "\n"
  );
};
