declare const colors: {
    red: string;
    yellow: string;
    green: string;
    lightblue: string;
};
export declare type DebugColors = keyof typeof colors;
export declare function debug(message: string, color: DebugColors): void;
export {};
