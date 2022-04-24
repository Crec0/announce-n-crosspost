const core = require('@actions/core');
const announce = require("./announce");

async function run() {
    try {
        await announce();
    } catch (error) {
        core.setFailed(error.message);
    }
}

run()