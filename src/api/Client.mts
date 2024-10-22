import { BitSet } from "jsr:@iluha168/bitset@1.1.0";
import { ByteBuffer } from "../datastructs/ByteBuffer.mts";
import { PacketType, CHUNK_SIZE_BYTES, UPDATE_CHUNK_SIZE, assertIndexInBitmap, assertChunkInBitmap } from "./constants.mts";
import { ClientChunk } from "./ClientChunk.mts";

export type ClientHandlers = {
    /** "The server sends a hello message to the client when the connection is established." */
    onHello?: (client: Client) => void
    /** "The server periodically send the current statistics to the client." */
    onStats?: (client: Client, clientsAmount: number, /*...*/) => void
    /** Response to a full chunk request. */
    onChunkUpdateFull?: (
        /** The chunk that was retrieved. */
        chunk: ClientChunk,
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

    /**
     * Chunk the client is subscribed to, if any.
     * @example client.chunk?.boxes.get(42) // gets state of the 42th checkbox in the subscribed chunk
     */
    chunk?: ClientChunk

    /**
     * Callbacks for various server events.
     * You can safely mutate this at any point.
     */
    handlers: ClientHandlers

    constructor(handlers: ClientHandlers = {}){
        this.handlers = handlers
    }

    /** Initializes the WebSocket connection. This is necessary to do before issuing any API calls.
     * @param url WebSocket address of the server.
     */
    connect(url = "wss://bitmap-ws.alula.me/"): void {
        this.ws = new WebSocket(url)
        this.ws.onclose = this.ws.onerror = 
            e => this.handlers.onError?.(this, e)
        this.ws.onmessage = this.onWsMessage.bind(this)
    }

    /** Closes the WebSocket connection. */
    disconnect(): void {
        this.ws?.close()
        this.ws = undefined
    }

    private logStringError(err: string): void {
        this.handlers.onError?.(this, new Event(err))
    }

    private async onWsMessage({data}: MessageEvent): Promise<void> {
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
                const checkboxes = buffer.readUint8Array(CHUNK_SIZE_BYTES)
                if(chunkIndex === this.chunk?.index)
                    this.chunk.boxes.bytes = checkboxes
                this.handlers.onChunkUpdateFull?.(new ClientChunk(this, chunkIndex, new BitSet(checkboxes)))
            } break
            case PacketType.CHUNK_UPDATE_PARTIAL: {
                if(!this.chunk)
                    return this.logStringError("The server has sent a chunk update while the Client is not subscribed")
                const offset = this.chunk.toLocalIndex(buffer.readUint32())
                const newBytes = buffer.readUint8Array(UPDATE_CHUNK_SIZE)
                this.chunk.boxes.bytes.set(newBytes, offset)
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
    toggle(i: number): void {
        assertIndexInBitmap(i)
        packetToggle.setUint32(1, i, true)
        this.ws!.send(packetToggle)
    }

    /**
     * Asks server for all checkboxes in a chunk. The `onChunkUpdateFull` handler is called to process checkboxes.
     * @param chunkIndex Index of the chunk to request.
     */
    chunkRequest(chunkIndex: number): void {
        assertChunkInBitmap(chunkIndex)
        packetChunkRequest.setUint16(1, chunkIndex, true)
        this.ws!.send(packetChunkRequest)
    }

    /**
     * Subscribe to partial updates of a chunk. This keeps `chunk` up-to-date.
     * You can use the `onChunkUpdatePartial` handler for additional logic.
     * @param chunkIndex Index of the chunk to subscribe to.
     */
    chunkSubscribe(chunkIndex: number): void {
        assertChunkInBitmap(chunkIndex)
        packetChunkUpdateSubscribe.setUint16(1, chunkIndex, true)
        this.ws!.send(packetChunkUpdateSubscribe)
        this.chunk = new ClientChunk(this, chunkIndex)
    }

    /**
     * Unsubscribe from partial updates of a chunk. Does not change the state of `chunk`.
     * @param chunkIndex Index of the chunk to unsubscribe from.
     */
    chunkUnsubscribe(): void {
        this.ws!.send(packetChunkUpdateUnsubscribe)
        this.chunk = undefined
    }
}