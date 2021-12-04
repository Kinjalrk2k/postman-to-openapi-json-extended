#!/usr/bin/env node

const flatten = require("obj-flatten");
const postmanToOpenApi = require("postman-to-openapi");
const YAML = require("yamljs");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const GenerateSchema = require("generate-schema");
const colors = require("colors");
const SCHEMA_DIR = "schemas";

const extractedJSONPath = "./schemas/_extracted.json";

const isValidPath = (p) => {
  const regexs = [
    /paths.*.requestBody.*.application\/json.schema.type/,
    /paths.*.responses.*.application\/json.schema.type/,
  ];
  return regexs.map((re) => re.test(p)).some((v) => v === true);
};

const writeToJSONFile = (data, filePath) =>
  fs.writeFileSync(
    path.resolve(path.join(filePath)),
    JSON.stringify(data, null, 2)
  );

const getExsistingPaths = () => {
  const jsonFiles = fs
    .readdirSync(path.join(SCHEMA_DIR))
    .filter((filename) => filename.endsWith(".json"));

  let exsitingPaths = [];
  jsonFiles.forEach((jsonFile) => {
    const content = require(path.resolve("schemas", jsonFile));
    exsitingPaths = [...exsitingPaths, ...Object.keys(content)];
  });

  return exsitingPaths;
};

module.exports = async (postmanCollectionPath) => {
  if (!fs.existsSync(path.resolve(SCHEMA_DIR))) {
    fs.mkdirSync(path.resolve(SCHEMA_DIR));
  }

  const exsitingPaths = getExsistingPaths();

  const rawOpenapiYAML = await postmanToOpenApi(postmanCollectionPath, null, {
    defaultTag: "General",
  });

  const rawOpenapiJSON = YAML.parse(rawOpenapiYAML);

  const targetPaths = Object.keys(flatten(rawOpenapiJSON))
    .filter(isValidPath)
    .map((p) => p.split(".").slice(0, -1).join("."));

  let differencePaths = targetPaths.filter((x) => !exsitingPaths.includes(x));
  console.log(`${differencePaths.length} paths found!`.italic.underline);

  const pathsWithExampleSchema = {};
  differencePaths.forEach((p) => {
    const requestExample = _.get(rawOpenapiJSON, `${p}.example`);
    const responseExample = _.get(
      rawOpenapiJSON,
      `${p.split(".").slice(0, -1).join(".")}.example`
    );

    if (requestExample) {
      pathsWithExampleSchema[p] = {
        ...GenerateSchema.json(requestExample),
        $schema: undefined,
      };
    } else if (responseExample) {
      pathsWithExampleSchema[p] = {
        ...GenerateSchema.json(responseExample),
        $schema: undefined,
      };
    } else {
      pathsWithExampleSchema[p] = {};
    }
  });

  writeToJSONFile(pathsWithExampleSchema, extractedJSONPath);
  console.log(
    "\n[✓] Saved the extracted paths with schemas from examples at: schemas/_extracted.json"
      .green,
    "\n[⚈] Remove/Rename the file before you run `extract` for the next time or it'll get reset"
      .blue,
    "\n[ ] Run `p2ojx build` to compile the complete OpenAPI specfile".yellow,
    "\n",
    "\nGood to know:".gray,
    "\n[?] You can break up the whole list of extracted schemas into smaller files. Make sure, they're present in the schemas directory"
      .gray,
    "\n[?] You can use JSON refs in your schemas".gray,
    "\n"
  );
};
