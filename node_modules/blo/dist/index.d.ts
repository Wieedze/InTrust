import { Address, BloImage } from './types';

export type { Address, BloImage, BloImageData, Hsl, Palette, PaletteIndex, } from './types';
export declare function blo(address: Address, size?: number): string;
export declare function bloSvg(address: Address, size?: number): string;
export declare function bloImage(address: Address): BloImage;
