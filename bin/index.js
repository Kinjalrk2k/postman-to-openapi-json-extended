#!/usr/bin/env node

const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const extract = require("./extract");
const colors = require("colors");
const build = require("./build");
const NOT_FOUND = "NOT_FOUND";

const program = new Command();
program.version("0.0.1");

program
  .command("extract")
  .description(
    "Extract requests and responses schemas from the postman collection"
  )
  .argument("[input file path]", "The postman_collection.json file")
  .action(async (postmanCollectionPath) => {
    if (!postmanCollectionPath) {
      const avaliableCollection = fs
        .readdirSync(path.resolve())
        .filter((file) => file.endsWith(".postman_collection.json"))[0];

      if (!avaliableCollection) {
        console.error("No postman collection found!".red);
        return;
      }
      postmanCollectionPath = avaliableCollection;
    }

    console.log(`Postman collection: ${postmanCollectionPath}`.magenta);
    await extract(postmanCollectionPath);
  });

program
  .command("build")
  .description(
    "Build the OpenAPI specs file with the extended schemas specified"
  )
  .option("-p <postmanCollectionPath>", "Pass the postman_collection.json file")
  .option(
    "-c <configPath>",
    "Pass the additional configurations as a `.p2ojx.json` file. See: https://joolfe.github.io/postman-to-openapi/#options"
  )
  .action(async ({ p: postmanCollectionPath, c: configPath }) => {
    if (!postmanCollectionPath) {
      const avaliableCollection = fs
        .readdirSync(path.resolve())
        .filter((file) => file.endsWith(".postman_collection.json"))[0];

      if (!avaliableCollection) {
        console.error("No postman collection found!".red);
        return;
      }
      postmanCollectionPath = avaliableCollection;
    }

    if (!configPath) {
      const availableConfigFile = fs
        .readdirSync(path.resolve())
        .filter((file) => file.endsWith(".p2ojx.json"))[0];

      if (!availableConfigFile) {
        configPath = {};
      } else {
        configPath = path.resolve(availableConfigFile);
      }
    }

    const config = require(configPath);

    console.log(`Postman collection: ${postmanCollectionPath}`.magenta);
    console.log(`Configuration: ${configPath}`.magenta);

    await build(postmanCollectionPath, config);
  });

program.parse(process.argv);
