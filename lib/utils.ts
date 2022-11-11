export function isUndefined(value: unknown): value is undefined {
    return typeof value === "undefined";
}
export function isArray<T>(value: unknown): value is T[] {
    return Array.isArray(value);
}

export function isObject(value: unknown): value is object {
    return typeof value === "object" && value !== null && !isArray(value);
}

export function isString(value: unknown): value is string {
    return typeof value === "string";
}

export function isFunction(value: unknown): value is Function {
    return typeof value === "function";
}

export function isEmpty(value: any): boolean {
    if (isArray(value)) {
        return value.length === 0;
    } else if (isObject(value)) {
        return Object.keys(value).length === 0;
    } else {
        return !value;
    }
}

export function ensureLeadingToken(value: string, token: string): string {
    if (!value.startsWith(token)) {
        return `${token}${value}`;
    }

    return value;
}

export function ensureTrailingToken(value: string, token: string): string {
    if (!value.endsWith(token)) {
        return `${value}${token}`;
    }

    return value;
}

export function removeFileExtension(value: string): string {
    return value.replace(/\.[^/.]+$/, "");
}