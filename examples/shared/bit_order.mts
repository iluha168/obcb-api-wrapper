export function LSBtoMSB(c: number): number {
    c = ((c>>1)&0x55)|((c<<1)&0xAA);
    c = ((c>>2)&0x33)|((c<<2)&0xCC);
    c = (c>>4) | (c<<4);
    return c;
}

export const LSBtoMSBmap: Uint8Array = new Uint8Array(
    Array.from({length: 256}, (_, i) => LSBtoMSB(i))
)