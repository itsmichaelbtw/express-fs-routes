import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import autoExternal from "rollup-plugin-auto-external";

import packageJson from "./package.json";

const extensions = [".ts"];
const banner = `/**
    * ${packageJson.homepage}
    * (c) ${new Date().getFullYear()} ${packageJson.author}
    * @license ${packageJson.license}
    */
`;

const input = "lib/index.ts";

function create(config) {
    return {
        input: config.input || input,
        output: {
            ...config.output,
            banner: banner
        },
        plugins: [
            resolve({
                extensions: extensions,
                preferBuiltins: true
            }),
            babel({
                babelHelpers: "bundled",
                include: ["lib/**/*.ts", "index.ts"],
                extensions: extensions,
                exclude: ["node_modules/**", "test/**"],
                presets: ["@babel/preset-typescript"]
            }),
            autoExternal()
        ].concat(config.plugins ?? [])
    };
}

const cjs = create({
    output: {
        file: packageJson.main,
        format: "cjs",
        exports: "named",
        generatedCode: {
            constBindings: true
        }
    },
    plugins: [commonjs()]
});

const esm = create({
    output: {
        file: packageJson.module,
        format: "es",
        exports: "named",
        generatedCode: {
            constBindings: true
        }
    }
});

export default [cjs, esm];
