import type { BitSet } from "jsr:@iluha168/bitset@1.1.0";
import { Chunk } from "./Chunk.mts";
import type { Client } from "./Client.mts";

/**
 * Class that represents a Chunk linked to a Client.
 */
export class ClientChunk extends Chunk {
    /** Client associated with the chunk */
    client: Client

    constructor(client: Client, index: number, boxes?: BitSet){
        super(index, boxes)
        this.client = client
    }

    /**
     * Inverts a checkbox.
     * This is an API call. Use `chunk.boxes.invert` to invert locally.
     * @param checkboxIndex The index of the checkbox relative to the beginning of the chunk.
     */
    toggle(checkboxIndex: number): void {
        this.client.toggle(this.toGlobalIndex(checkboxIndex))
    }
}