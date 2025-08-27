export type BloImage = [BloImageData, Palette];
export type BloImageData = Uint8Array;
export type Palette = [
    Hsl,
    Hsl,
    Hsl
];
export type PaletteIndex = 0 | 1 | 2;
export type Hsl = Uint16Array;
export type Address = `0x${string}`;
