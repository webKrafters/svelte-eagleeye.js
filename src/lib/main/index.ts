import { browser } from '$app/environment';

import type {
	AutoImmutable,
	IStorage,
	Prehooks,
	State
} from '..';

import { SvelteEagleEye } from './base.ts';
import { BrowserSvelteEagleEye } from './browser.ts';
import { MemorySvelteEagleEye } from './memory.ts';

export function createContext<T extends State>(
	value? : T,
	prehooks? : Prehooks<T>,
	storage? : IStorage<T>
) : SvelteEagleEye<T>; 
export function createContext<T extends State>(
	value? : AutoImmutable<T>,
	prehooks? : Prehooks<T>,
	storage? : IStorage<T>
) : SvelteEagleEye<T>; 
export function createContext<T extends State>(
	value : any, prehooks : any, storage : any
) : SvelteEagleEye<T> {
	return new (
		browser
			? BrowserSvelteEagleEye
			: MemorySvelteEagleEye
	)<T>( value, prehooks, storage );
};
