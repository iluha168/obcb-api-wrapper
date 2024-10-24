/** Assuming ffmpeg installed in PATH, this script creates obcb.png - a square render of the entire bitmap.
 * S*S checkboxes = 1 pixel.
 * Much faster than the unscaled example script.
 * @module
 */
import { BITMAP_SIZE_BITS, CHUNK_COUNT, CHUNK_SIZE_BITS, Client } from "jsr:@iluha168/obcb";

const BITMAP_IMG_SIDE = Math.sqrt(BITMAP_SIZE_BITS)
/** Downscale factor */
const S = 4
const W = BITMAP_IMG_SIDE
const H = CHUNK_SIZE_BITS/BITMAP_IMG_SIDE

const ffmpegResize = new Deno.Command("ffmpeg", {
    args: `-f rawvideo -pix_fmt monob -video_size ${W}x${H} -i - -s ${W/S}x${H/S} -sws_flags neighbor -f rawvideo -pix_fmt monob -`.split(" "),
    stdin: "piped",
    stdout: "piped",
    stderr: "inherit",
}).spawn()

const ffmpegCombine = new Deno.Command("ffmpeg", {
    args: `-f rawvideo -pix_fmt monob -video_size ${W/S}x${W/S} -i - -sws_flags neighbor -c:v png -f image2pipe -`.split(" "),
    stdin: "piped",
    stdout: "piped",
    stderr: "inherit",
}).spawn()

ffmpegResize.stdout.pipeTo(ffmpegCombine.stdin)
ffmpegCombine.stdout.pipeTo(Deno.openSync("obcb.png", {write: true, create: true, truncate: true}).writable)

const ffmpegIn = ffmpegResize.stdin.getWriter()

new Client({
    onHello(client) {
        console.log("Connected")
        for(let i = 0; i < CHUNK_COUNT; i++)
            client.chunkRequest(i)
    },

    async onChunkUpdateFull(chunk) {
        console.log("Received", chunk.index)
        await ffmpegIn.write(chunk.boxes.bytes)

        if(chunk.index === CHUNK_COUNT-1){
            chunk.client.disconnect()
            await ffmpegIn.close()
            ffmpegIn.releaseLock()
        }
    },
}).connect()