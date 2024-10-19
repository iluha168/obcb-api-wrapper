/**
 * Utility class that can set individual bits of a byte array.
 */
export class BitSet {
    /** Underlying storage for bits. It is safe to mutate this externally. */
    bytes: Uint8Array

    constructor(bytes: ArrayBufferLike){
        this.bytes = new Uint8Array(bytes)
    }

    /**
     * Returns bit at the specified position.
     * @param bitIndex Index of the bit to retrieve.
     */
    get(bitIndex: number): number {
        return (this.bytes[Math.floor(bitIndex/8)] & (1 << bitIndex%8)) === 0? 0 : 1
    }

    /**
     * Sets bit at the specified position.
     * @param bitIndex Index of the bit to change.
     * @param value Value to set. Falsy and truthy values correspond to 0 and 1 respectively.
     */
    set(bitIndex: number, value: number): void {
        const shifted = 1 << bitIndex%8
        const at = Math.floor(bitIndex/8)
        if(value) this.bytes[at] |= shifted
        else      this.bytes[at] &= ~shifted
    }

    /**
     * Toggles bit in-place at the specified position.
     * @param bitIndex Index of the bit to change.
     */
    invert(bitIndex: number): void {
        this.bytes[Math.floor(bitIndex/8)] ^= 1 << bitIndex%8
    }

    /** Returns the amount of bits stored. */
    length(): number {
        return this.bytes.length*8
    }

    /** Yields each bit sequentially. */
    *[Symbol.iterator](): Generator<number> {
        for(let i = 0; i < this.length(); i++)
            yield this.get(i)
    }
}

