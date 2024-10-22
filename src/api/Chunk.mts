import { BitSet } from "jsr:@iluha168/bitset@1.1.0";
import { assertIndexInBitmap, assertIndexInChunk, CHUNK_SIZE_BITS, CHUNK_SIZE_BYTES } from "./constants.mts";

/**
 * Data class that represents a chunk: its checkboxes and index.
 * Provides some utility functions.
 */
export class Chunk {
    /** The index assigned to the chunk. */
    index: number
    /** Checkboxes that make up the chunk. */
    boxes: BitSet

    constructor(index: number, boxes?: BitSet){
        this.index = index
        this.boxes = boxes ?? new BitSet(new ArrayBuffer(CHUNK_SIZE_BYTES))
    }

    /**
     * Converts index of checkbox in this chunk to its relative to the bitmap.
     * @param chunkIndex Index of the chunk.
     * @param localIndex Index of the checkbox in this chunk.
     * @returns Global index of the checkbox.
     */
    static toGlobalIndex(chunkIndex: number, localIndex: number): number {
        assertIndexInChunk(localIndex)
        return localIndex + chunkIndex*CHUNK_SIZE_BITS
    }

    /**
     * Converts index of checkbox in this chunk to its relative to the bitmap.
     * @param localIndex Index of the checkbox in this chunk.
     * @returns Global index of the checkbox.
     */
    toGlobalIndex(localIndex: number): number {
        assertIndexInChunk(localIndex)
        return localIndex + this.index*CHUNK_SIZE_BITS
    }

    /**
     * Converts index of checkbox relative to the bitmap to its index in this chunk.
     * @param chunkIndex Index of the chunk.
     * @param globalIndex Global index of the checkbox.
     * @returns Index of the checkbox in this chunk.
     */
    static toLocalIndex(chunkIndex: number, globalIndex: number): number {
        assertIndexInBitmap(globalIndex)
        return globalIndex - chunkIndex*CHUNK_SIZE_BYTES
    }

    /**
     * Converts index of checkbox relative to the bitmap to its index in this chunk.
     * @param globalIndex Global index of the checkbox.
     * @returns Index of the checkbox in this chunk.
     */
    toLocalIndex(globalIndex: number): number {
        assertIndexInBitmap(globalIndex)
        return globalIndex - this.index*CHUNK_SIZE_BYTES
    }
}