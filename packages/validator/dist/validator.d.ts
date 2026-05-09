import type { OFSDocument } from "@ofs/types";
import type { OpenAPIEnums } from "./openapi.js";
export interface ValidationError {
    path: string;
    message: string;
}
export interface ValidateOptions {
    schemaPath: string;
    openApiEnums?: Record<string, OpenAPIEnums>;
}
export declare function validate(doc: OFSDocument, options: ValidateOptions): ValidationError[];
