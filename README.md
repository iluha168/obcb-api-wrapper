[![JSR][jsr-badge]][jsr-url]
[![Deno][deno-badge]][deno-url]
[![TypeScript][typescript-badge]][typescript-url]
[![CI][ci-badge]][ci-url]
[![License: MIT][license-badge]][license-url]

# An API wrapper for [One Billion Checkboxes](https://checkbox.ing)

Implements 100% of [the protocol](https://checkbox.ing/proto-docs).

## Examples
```ts
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
```
For more examples, such as rendering the entire bitmap as a square image, visit [examples folder on GitHub](https://github.com/iluha168/obcb-api-wrapper/tree/main/examples).

## Compatibility
Depends on [WebSocket from WebAPI](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) in the global scope.
Every runtime that satisfies this requirement can use this library. It is possible to polyfill WebSocket in before calling `Client.prototype.connect`.

[jsr-badge]: https://jsr.io/badges/@iluha168/obcb?style=flat-square
[jsr-url]: https://jsr.io/@iluha168/obcb

[deno-badge]: https://img.shields.io/badge/Deno-000000?logo=Deno&logoColor=FFF&style=flat-square
[deno-url]: https://deno.com/

[typescript-badge]: https://img.shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF&style=flat-square
[typescript-url]: https://www.typescriptlang.org/

[ci-badge]: https://img.shields.io/github/actions/workflow/status/iluha168/obcb-api-wrapper/publish.yml?logo=github&style=flat-square
[ci-url]: https://github.com/iluha168/obcb-api-wrapper/actions/workflows/publish.yml

[license-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square
[license-url]: https://wei.mit-license.org