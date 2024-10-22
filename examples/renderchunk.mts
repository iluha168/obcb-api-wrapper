/**
 * Renders the specified chunk into an image. This example uses Deno.
 * @module
*/
import { CHUNK_SIZE_BITS, Client } from "jsr:@iluha168/obcb";

const CHUNK_INDEX = 0

new Client({
    onHello(client) {
        console.log("Connected!")
        client.chunkRequest(CHUNK_INDEX)
    },

    // Callback for chunkRequest
    onChunkUpdateFull(chunk){
        // This is how many checkboxes are in a row on the website
        const COLUMNS = 60
        // Calculates how many rows there are
        const ROWS = Math.floor(CHUNK_SIZE_BITS/COLUMNS)
        // Releases the WebSocket, so that the script will finish after it renders the chunk
        chunk.client.disconnect()

        using f = Deno.openSync("chunk.ppm", {
            write: true,
            create: true
        })

        // Write PPM header to the file
        f.writeSync(new TextEncoder().encode(
            `P6\n${COLUMNS}\n${ROWS}\n255\n`
        ))

        const pixelOn  = new Uint8Array([200, 255, 200]) // greenish
        const pixelOff = new Uint8Array([  0,   0,   0]) // black

        for(const checkbox of chunk.boxes)
            f.writeSync(checkbox? pixelOn : pixelOff)
    }
}).connect()