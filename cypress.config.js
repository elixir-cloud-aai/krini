const { defineConfig } = require("cypress");
const { host_uri } = require("./config");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    "experimentalSessionAndOrigin": true,
    "baseUrl": host_uri
  },
});
