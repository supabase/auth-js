"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("./helpers");
const localStorageAdapter = {
    getItem: (key) => {
        if (!(0, helpers_1.isBrowser)()) {
            return null;
        }
        return globalThis.localStorage.getItem(key);
    },
    setItem: (key, value) => {
        if (!(0, helpers_1.isBrowser)()) {
            return;
        }
        globalThis.localStorage.setItem(key, value);
    },
    removeItem: (key) => {
        if (!(0, helpers_1.isBrowser)()) {
            return;
        }
        globalThis.localStorage.removeItem(key);
    },
};
exports.default = localStorageAdapter;
//# sourceMappingURL=local-storage.js.map