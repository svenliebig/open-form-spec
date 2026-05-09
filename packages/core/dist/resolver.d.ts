import type { FieldState, OFSDocument } from "@ofs/types";
export interface ResolveInput {
    values: Record<string, unknown>;
    context?: Record<string, unknown>;
    crossSections?: Record<string, Record<string, unknown>>;
}
export type ResolvedFieldStates = Record<string, FieldState>;
export declare function resolveFieldStates(doc: OFSDocument, input: ResolveInput): ResolvedFieldStates;
