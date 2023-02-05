export declare function isUndefined(value: unknown): value is undefined;
export declare function isNil(value: unknown): value is null | undefined;
export declare function isArray<T>(value: unknown): value is T[];
export declare function isObject(value: unknown): value is object;
export declare function isString(value: unknown): value is string;
export declare function isFunction(value: unknown): value is Function;
export declare function isEmpty(value: any): boolean;
export declare function forEach<T>(obj: T, fn: (key: keyof T, value: T[keyof T], obj: T) => void): void;
export declare function ensureLeadingToken(value: string, token: string): string;
export declare function ensureTrailingToken(value: string, token: string): string;
export declare function removeFileExtension(value: string): string;
export declare function getCurrentWorkingEnvironment(): string;
export declare function asyncReduce<T, U>(array: T[], callback: (accumulator: U, current: T) => Promise<U>, initialValue: U): Promise<U>;