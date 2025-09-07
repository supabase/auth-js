import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import stylistic from '@stylistic/eslint-plugin'


export default [
    {
        ignores: ["**/*.md", "test/__snapshots__/**/*", "dist/**/*"]
    },
    
    js.configs.recommended,
    
    {
        files: ["**/*.js", "**/*.ts", "**/*.jsx", "**/*.tsx"],
        
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 12,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node,
                // Project-specific global
                __magic__: "readonly",
            },
        },
        
        plugins: {
            "@typescript-eslint": typescript,
            '@stylistic': stylistic,
        },
        
        rules: {
            ...typescript.configs.recommended.rules,
            "comma-dangle": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/ban-types": "off",
            // Remove the @stylistic rule since plugin isn't installed
            '@stylistic/semi': 'error',
            "no-undef" : "off", 
        },
    },
    
    // Test files configuration
    {
        files: ["test/**/*.test.ts", "test/**/*.test.js"],
        languageOptions: {
            globals: {
                ...globals.jest,
                describe: "readonly",
                it: "readonly",
                expect: "readonly",
                beforeEach: "readonly",
                test: "readonly",
            },
        },
    },
    
    eslintConfigPrettier,
];