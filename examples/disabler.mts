/** A bot that disables all checkboxes in a chunk and quits
 * @module
 */
import { Client } from "jsr:@iluha168/obcb";

// Note: the website starts indexes from 1, while the API - from 0.
// This would correspond to page 51 on the site.
const CHUNK_INDEX = 50

new Client({
    // Called when the server has initialized our connection
    // You can safely call API methods past this point
    onHello(client) {
        client.chunkRequest(CHUNK_INDEX)
    },

    // Called when a chunk has been received
    onChunkUpdateFull(chunk) {
        // Iterate over received checkboxes
        for(const [i, checkbox] of chunk.boxes.entries()){
            // If the checkbox is on, disable it
            if(checkbox) chunk.toggle(i)
        }
        console.log("Chunk", chunk.index, "is now off")
        // Close the WebSocket once we are done
        // This should automatically stop this script
        chunk.client.disconnect()
    },
})
// Don't forget to connect!
.connect()