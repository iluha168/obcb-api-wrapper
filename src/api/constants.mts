/** The size of a single chunk in bits. */
export const CHUNK_SIZE_BITS: number = 64 * 64 * 64;

/** The size of a single chunk in bytes. */
export const CHUNK_SIZE_BYTES: number = CHUNK_SIZE_BITS / 8;

/** The number of chunks. */
export const CHUNK_COUNT: number = 64 * 64;

/** The size of the entire bitmap in bits. */
export const BITMAP_SIZE_BITS: number = CHUNK_SIZE_BITS * CHUNK_COUNT;

/** The size of the entire bitmap in bytes. */
export const BITMAP_SIZE_BYTES: number = CHUNK_SIZE_BYTES * CHUNK_COUNT;

/** The size of a single update chunk in bytes. */
export const UPDATE_CHUNK_SIZE: number = 32;

/** Client and server side packet IDs. */
export enum PacketType {
    HELLO = 0x00,
    STATS = 0x01,
    CHUNK_REQUEST = 0x10,
    CHUNK_UPDATE_FULL = 0x11,
    CHUNK_UPDATE_PARTIAL = 0x12,
    TOGGLE = 0x13,
    CHUNK_UPDATE_SUBSCRIBE = 0x14,
    CHUNK_UPDATE_UNSUBSCRIBE = 0x15,
}

/**
 * Throws RangeError if specified global checkbox index is invalid.
 * @param i Index of the checkbox relative to the entire bitmap.
 */
export function assertIndexInBitmap(i: number){
    if(!Number.isInteger(i) || i < 0 || i > BITMAP_SIZE_BITS)
        throw new RangeError(`Provided checkbox index ${i} is outside of the bitmap range`)
}

/**
 * Throws RangeError if specified checkbox index relative to a chunk is invalid.
 * @param i Index of the checkbox relative its chunk.
 */
export function assertIndexInChunk(i: number){
    if(!Number.isInteger(i) || i < 0 || i > CHUNK_SIZE_BITS)
        throw new RangeError(`Provided checkbox index ${i} is outside of the chunk range`)
}

/**
 * Throws RangeError if specified chunk index is invalid.
 * @param i Index of the chunk relative to the bitmap.
 */
export function assertChunkInBitmap(i: number){
    if(!Number.isInteger(i) || i < 0 || i > CHUNK_COUNT)
        throw new RangeError(`Provided chunk index ${i} is outside of the bitmap range`)
}
