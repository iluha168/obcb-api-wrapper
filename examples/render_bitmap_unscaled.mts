/** This script creates obcb.png - a square render of the entire bitmap.
 * 1 checkbox = 1 pixel.
 * Compresses PNG on a single thread, much slower than the downscaled example script.
 * @module
 */
import { BITMAP_SIZE_BITS, CHUNK_COUNT, Client } from "jsr:@iluha168/obcb";
import * as PNG from "https://deno.land/x/pngs@0.1.1/mod.ts";

const BITMAP_IMG_SIDE = Math.sqrt(BITMAP_SIZE_BITS)
const bitmap: Uint8Array[] = []

async function finish() {
    console.log("Compressing PNG...")
    const png =  PNG.encode(
        await new Blob(bitmap).bytes(),
        BITMAP_IMG_SIDE, BITMAP_IMG_SIDE,
        {
            color: PNG.ColorType.Grayscale,
            compression: PNG.Compression.Best,
            depth: PNG.BitDepth.One,
        }
    )
    Deno.writeFileSync("obcb.png", png, {
        create: true,
        append: false,
    })
}

new Client({
    onHello(client) {
        console.log("Connected")
        for(let i = 0; i < CHUNK_COUNT; i++)
            client.chunkRequest(i)
    },

    onChunkUpdateFull(chunk) {
        console.log("Received", chunk.index)
        bitmap.push(chunk.boxes.bytes)

        if(chunk.index === CHUNK_COUNT-1){
            chunk.client.disconnect()
            finish()
        }
    },
}).connect()