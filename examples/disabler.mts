/** A bot that disables all checkboxes in a chunk
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
        client.chunkSubscribe(CHUNK_INDEX)
    },

    // Called when a chunk has been received
    onChunkUpdateFull(client, chunkIndex, checkboxes) {
        // Iterate over received checkboxes
        for(const [i, checkbox] of checkboxes.entries()){
            // If the checkbox is on, disable it
            if(checkbox)
                client.toggleChunkCheckbox(i, chunkIndex)
        }
        console.log("Chunk", chunkIndex, "is turned off")
        // Close the WebSocket once we are done
        // This should automatically stop this script
        client.disconnect()
    },
})
// Don't forget to connect!
.connect()