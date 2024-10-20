/** Assuming ffmpeg installed, this script creates obcb.png - a square render of the entire bitmap.
 * @module
 */
import { BITMAP_SIZE_BITS, CHUNK_COUNT, CHUNK_SIZE_BITS, Client } from "../src/mod.mts";

const BITMAP_IMG_SIDE = Math.sqrt(BITMAP_SIZE_BITS)
const W = BITMAP_IMG_SIDE
const H = CHUNK_SIZE_BITS/BITMAP_IMG_SIDE
const S = 4

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

    async onChunkUpdateFull(client, chunkIndex, boxes) {
        console.log("Received", chunkIndex)
        await ffmpegIn.write(boxes.bytes)

        if(chunkIndex === CHUNK_COUNT-1){
            client.disconnect()
            await ffmpegIn.close()
            ffmpegIn.releaseLock()
        }
    },
}).connect()