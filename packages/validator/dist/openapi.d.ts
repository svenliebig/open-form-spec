import type { OpenAPISchemas } from "@ofs/types";
export interface OpenAPIEnums {
    [schemaName: string]: string[];
}
export declare function extractEnumsFromOpenAPI(filePath: string): OpenAPIEnums;
export declare function extractSchemasFromOpenAPI(filePath: string): OpenAPISchemas;
