import { Address, BloImage, BloImageData, Hsl } from './types';

export declare function image(address: Address): BloImage;
export declare function randomImageData(random: () => number): BloImageData;
export declare function randomPalette(random: () => number): [Hsl, Hsl, Hsl];
export declare function randomColor(rand: () => number): Hsl;
