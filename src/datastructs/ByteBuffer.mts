/**
 * Utility class that uses DataView to sequentially read different data structures out of an ArrayBuffer.
 */
export class ByteBuffer {
    private view: DataView
    offset: number = 0

    constructor(bytes: ArrayBufferLike){
        this.view = new DataView(bytes)
    }

    readUint8(): number {
        return this.view.getUint8(this.offset++)
    }

    readUint16(): number {
        const value = this.view.getUint16(this.offset, true)
        this.offset += 2
        return value
    }

    readUint32(): number {
        const value = this.view.getUint32(this.offset, true)
        this.offset += 4
        return value
    }

    readUint8Array(size: number): Uint8Array {
        const array = this.view.buffer.slice(this.offset, this.offset+size)
        this.offset += size
        return new Uint8Array(array)
    }
}