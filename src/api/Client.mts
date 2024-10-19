import { BitSet } from "../datastructs/BitSet.mts";
import { ByteBuffer } from "../datastructs/ByteBuffer.mts";
import { PacketType, CHUNK_SIZE_BITS, CHUNK_SIZE_BYTES, UPDATE_CHUNK_SIZE, BITMAP_SIZE_BITS, CHUNK_COUNT } from "./constants.mts";

export type ClientHandlers = {
    /** "The server sends a hello message to the client when the connection is established." */
    onHello?: (client: Client) => void
    /** "The server periodically send the current statistics to the client." */
    onStats?: (client: Client, clientsAmount: number, /*...*/) => void
    /** Response to a full chunk request. */
    onChunkUpdateFull?: (
        client: Client,
        /** Which chunk was retrieved. */
        chunkIndex: number,
        /** The state of all checkboxes in the chunk. */
        checkboxes: BitSet
    ) => void
    /** "The server periodically sends partial updates of the subscribed chunk to the client." */
    onChunkUpdatePartial?: (
        client: Client,
        /** New checkboxes data. */
        checkboxes: BitSet,
        /** The checkbox index of the beginning of new checkboxes data on the current chunk. */
        index: number
    ) => void
    /** Errors raised in the event loop, these are issued by the client itself. */
    onError?: (client: Client, event: Event) => void
}

// Cache packets for all instances of clients
const packetToggle: DataView = new DataView(new ArrayBuffer(5))
packetToggle.setUint8(0, PacketType.TOGGLE)

const packetChunkRequest: DataView = new DataView(new ArrayBuffer(3))
packetChunkRequest.setUint8(0, PacketType.CHUNK_REQUEST)

const packetChunkUpdateSubscribe: DataView = new DataView(new ArrayBuffer(3))
packetChunkUpdateSubscribe.setUint8(0, PacketType.CHUNK_UPDATE_SUBSCRIBE)

const packetChunkUpdateUnsubscribe: DataView = new DataView(new ArrayBuffer(1))
packetChunkUpdateUnsubscribe.setUint8(0, PacketType.CHUNK_UPDATE_UNSUBSCRIBE)

/**
 * The main class. Implements https://checkbox.ing/proto-docs.
 * @example ```ts
 * new Client({
 *      onHello(){
 *          console.log("Connected!")
 *      },
 *      onStats(client, amount){
 *          console.log(`There are ${amount} of clients connected to the server.`)
 *      }
 * }).connect()
 * ```
 */
export class Client {
    private ws?: WebSocket

    /** The current chunk. Each bit is a checkbox.
     * @example client.chunk.get(42) // gets state of the 42th checkbox in the subscribed chunk
     */
    chunk: BitSet = new BitSet(new ArrayBuffer(CHUNK_SIZE_BYTES))
    /** The index of the currently subscribed to chunk. */
    chunkIndex?: number

    /** Callbacks for various server events. */
    handlers: ClientHandlers

    constructor(handlers: ClientHandlers = {}){
        this.handlers = handlers
    }

    /** Initializes the WebSocket connection. This is necessary to do before issuing any API calls.
     * @param url WebSocket address of the server.
     */
    connect(url = "wss://bitmap-ws.alula.me/"){
        this.ws = new WebSocket(url)
        this.ws.onclose = this.ws.onerror = 
            e => this.handlers.onError?.(this, e)
        this.ws.onmessage = this.onWsMessage.bind(this)
    }

    /** Closes the WebSocket connection. */
    disconnect(){
        this.ws?.close()
        this.ws = undefined
    }

    private logStringError(err: string){
        this.handlers.onError?.(this, new Event(err))
    }

    private async onWsMessage({data}: MessageEvent){
        if(!(data instanceof Blob)){
            // Attempt to convert to a Blob
            try {
                data = new Blob([data])
            } catch(err) {
                if(err instanceof TypeError)
                    return this.logStringError("Expected a binary message from the server")
                else throw err // This should never throw
            }
        }
            
        const buffer = new ByteBuffer(await data.arrayBuffer())
        const packetID = buffer.readUint8() as PacketType | number
        
        switch(packetID){
            case PacketType.HELLO: {
                const protocolVersion = buffer.readUint16()
                const versionMinor = buffer.readUint16()
    
                if(protocolVersion !== 1 || versionMinor !== 1)
                    return this.logStringError(`Unsupported protocol version: ${protocolVersion}.${versionMinor}`)
                
                this.handlers.onHello?.(this)
            }
            break
            case PacketType.STATS:
                this.handlers.onStats?.(this, buffer.readUint32())
            break
            case PacketType.CHUNK_UPDATE_FULL: {
                const chunkIndex = buffer.readUint16()
                const chunk = buffer.readUint8Array(CHUNK_SIZE_BYTES)
                if(chunkIndex === this.chunkIndex)
                    this.chunk.bytes = chunk
                this.handlers.onChunkUpdateFull?.(this, chunkIndex, new BitSet(chunk))
            } break
            case PacketType.CHUNK_UPDATE_PARTIAL: {
                if(this.chunkIndex === undefined)
                    return this.logStringError("The server has sent a chunk update while the Client is not subscribed")
                const offset = buffer.readUint32() - this.chunkIndex*CHUNK_SIZE_BYTES
                const newBytes = buffer.readUint8Array(UPDATE_CHUNK_SIZE)
                this.chunk.bytes.set(newBytes, offset)
                this.handlers.onChunkUpdatePartial?.(this, new BitSet(newBytes), offset*8)
            }
            break
            case PacketType.CHUNK_REQUEST:
            case PacketType.TOGGLE:
            case PacketType.CHUNK_UPDATE_SUBSCRIBE:
            case PacketType.CHUNK_UPDATE_UNSUBSCRIBE:
                return this.logStringError(`Received a ${PacketType[packetID]} packet, which is only serverbound`)
            default:
                return this.logStringError(`Unknown packet ID 0x${packetID.toString(16)} received`)
        }
    }

    /**
     * Inverts a checkbox.
     * @param i The index of the checkbox relative to the entire bitmap.
     */
    toggleGlobalCheckbox(i: number){
        if(!Number.isInteger(i) || i < 0 || i > BITMAP_SIZE_BITS)
            throw new RangeError(`Provided checkbox index ${i} is outside of the bitmap range`)
        packetToggle.setUint32(1, i, true)
        this.ws!.send(packetToggle)
        // Ideally there should be a check for this.chunk.invert
        // but that would harm performance for no gain in most of the cases this method could be useful
    }

    /**
     * Inverts a checkbox.
     * @param i The index of the checkbox relative to the beginning of the chunk.
     * @param chunkIndex The index of the chunk to use as a reference. Defaults to the subscribed chunk.
     */
    toggleChunkCheckbox(i: number, chunkIndex = this.chunkIndex){
        if(chunkIndex === undefined)
            throw new TypeError("No chunk specified")
        if(!Number.isInteger(i) || i < 0 || i > CHUNK_SIZE_BITS)
            throw new RangeError(`Provided checkbox index ${i} is outside of the chunk range`)
        packetToggle.setUint32(1, i + chunkIndex*CHUNK_SIZE_BITS, true)
        this.ws!.send(packetToggle)
        this.chunk.invert(i)
    }

    /**
     * Asks server for all checkboxes in a chunk. The `onChunkUpdateFull` handler is called to process checkboxes.
     * @param chunkIndex Index of the chunk to request.
     */
    chunkRequest(chunkIndex: number){
        if(!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex > CHUNK_COUNT)
            throw new RangeError(`Provided chunk index ${chunkIndex} is outside of the bitmap range`)
        packetChunkRequest.setUint16(1, chunkIndex, true)
        this.ws!.send(packetChunkRequest)
    }

    /**
     * Subscribe to partial updates of a chunk. This keeps `chunk` up-to-date.
     * You can use the `onChunkUpdatePartial` handler for additional logic.
     * @param chunkIndex Index of the chunk to subscribe to.
     */
    chunkSubscribe(chunkIndex: number){
        if(!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex > CHUNK_COUNT)
            throw new RangeError(`Provided chunk index ${chunkIndex} is outside of the bitmat range`)
        packetChunkUpdateSubscribe.setUint16(1, chunkIndex, true)
        this.ws!.send(packetChunkUpdateSubscribe)
        this.chunkIndex = chunkIndex
    }

    /**
     * Unsubscribe from partial updates of a chunk. Does not change the state of `chunk`.
     * @param chunkIndex Index of the chunk to unsubscribe from.
     */
    chunkUnsubscribe(){
        this.ws!.send(packetChunkUpdateUnsubscribe)
        this.chunkIndex = undefined
    }
}