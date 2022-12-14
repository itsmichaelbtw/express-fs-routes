"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentWorkingEnvironment = exports.removeFileExtension = exports.ensureTrailingToken = exports.ensureLeadingToken = exports.forEach = exports.isEmpty = exports.isFunction = exports.isString = exports.isObject = exports.isArray = exports.isUndefined = void 0;
function isUndefined(value) {
    return typeof value === "undefined";
}
exports.isUndefined = isUndefined;
function isArray(value) {
    return Array.isArray(value);
}
exports.isArray = isArray;
function isObject(value) {
    return typeof value === "object" && value !== null && !isArray(value);
}
exports.isObject = isObject;
function isString(value) {
    return typeof value === "string";
}
exports.isString = isString;
function isFunction(value) {
    return typeof value === "function";
}
exports.isFunction = isFunction;
function isEmpty(value) {
    if (isArray(value)) {
        return value.length === 0;
    }
    else if (isObject(value)) {
        return Object.keys(value).length === 0;
    }
    else {
        return !value;
    }
}
exports.isEmpty = isEmpty;
function forEach(obj, fn) {
    if (isUndefined(obj)) {
        return;
    }
    if (isArray(obj)) {
        obj.forEach(function (value, index) {
            fn.call(null, index, value, obj);
        });
    }
    else {
        for (const key in obj) {
            fn.call(null, key, obj[key], obj);
        }
    }
}
exports.forEach = forEach;
function ensureLeadingToken(value, token) {
    if (!value.startsWith(token)) {
        return `${token}${value}`;
    }
    return value;
}
exports.ensureLeadingToken = ensureLeadingToken;
function ensureTrailingToken(value, token) {
    if (!value.endsWith(token)) {
        return `${value}${token}`;
    }
    return value;
}
exports.ensureTrailingToken = ensureTrailingToken;
function removeFileExtension(value) {
    return value.replace(/\.[^/.]+$/, "");
}
exports.removeFileExtension = removeFileExtension;
function getCurrentWorkingEnvironment() {
    return process.env.NODE_ENV || "development";
}
exports.getCurrentWorkingEnvironment = getCurrentWorkingEnvironment;
