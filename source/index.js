#!/usr/bin/env node

const TelnetClient = require("telnet-client");
const minimist = require("minimist");
const pify = require("pify");
const chalk = require("chalk");
const ValidationSchema = require("validate");

// const SHELL_PROMPT = "/ # ";

const argv = minimist(process.argv.slice(2));

async function connect(config) {
    const connection = config.connection = new TelnetClient();
    const params = {
        host: config.host,
        port: config.port,
        // shellPrompt: SHELL_PROMPT,
        negotiationMandatory: false,
        timeout: config.timeout
    };
    await connection.connect();
}

async function disconnect(config) {
    await config.connection.end();
}

async function execute(config, command) {
    const result = await config.connection.exec(command);
    return result;
}

function logBase(type, args) {
    let prefix = "";
    if (type === "info") {
        prefix = chalk.blue("[INF]");
    } else if (type === "error") {
        prefix = chalk.red("[ERR]");
    }
    console.log(`${prefix ? prefix + " " : ""}${args.map(toString).join(" ")}`);
}

function logError(...args) {
    logBase("error", args);
}

function logInfo(...args) {
    logBase("info", args);
}

async function run() {
    const {
        host,
        port: portRaw = "23",
        timeout: timeoutRaw = "2500"
    } = argv;
    const config = {
        host,
        port: parseInt(portRaw, 10),
        timeout: parseInt(timeoutRaw, 10)
    };
    validateConfig(config);
    logInfo("Connecting...");
    await connect(config);
    logInfo(`Connected to ${config.host}:${config.port}`);
    logInfo("Starting HTTP API...");
}

function toString(arg) {
    try {
        return arg.toString();
    } catch (err) {
        return `${arg}`;
    }
}

function validateConfig(config) {
    const aboveZero = num => num > 0;
    const schema = new ValidationSchema({
        host: {
            type: String,
            required: true,
            length: { min: 1 }
        },
        port: {
            type: Number,
            required: true,
            use: { aboveZero }
        },
        timeout: {
            type: Number,
            required: true,
            use: { aboveZero }
        }
    });
    const errors = schema.validate(config);
    if (errors.length > 0) {
        logError("Errors encountered whilst validating initialisation config:");
        errors.forEach(err => {
            logError(` - ${err.message} ${chalk.dim(`@ ${err.path}`)}`);
        });
        throw new Error("Invalid initialisation configuration");
    }
}

// BOOT / INIT

(function boot() {
    return run().catch(err => {
        logError(`Fatal error: ${err.message}`);
        console.error(err);
        process.exit(1);
    });
})();
