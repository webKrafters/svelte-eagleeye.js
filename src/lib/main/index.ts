
import type {
	AutoImmutable,
	IdProps,
	IStorage,
	Prehooks,
	Props,
	State
} from '../index.ts';

import type { RequestEvent as SvelteRequestEvent } from '@sveltejs/kit';

import { browser } from '$app/environment';

import { SvelteEagleEye } from './base.ts';
import { BrowserSvelteEagleEye } from './browser.ts';
import { MemorySvelteEagleEye } from './memory.ts';

interface Entry<T extends State> {
	hash: string;
	value: SvelteEagleEye<T>;
}

import stringify from 'safe-stable-stringify';
import { sha512, type Message } from 'js-sha512';

/** Record<appInstanceId, Record<CTX_KEY, Entry<any>>> */
const eagleEyeTable : Record<string, Record<string, Entry<any>>> = {};

export const DESC_EXISTS = 'An EagleEyeContext instance already uses this descriptor';
export const NO_DESC_ENTRY = 'No entry found using this context instance descriptor';
export const NO_EMPTY_DESC = 'An EagleEyeContext instance descriptor cannot be empty';
export const SSRID_REQ = 'The server `load` hook function must return an object with an `appInstanceId` property bearing a unique string per request.';
export const UNAVAILABLE_DESC = 'This descriptor is currently unavailable';
export const VACATED_DESC = 'Non EagleEyeContext value found at supplied context instance descriptor';

export function create<T extends State>( props : Props<T> ) {
	setContext( props );
	return use<T>( props );
}

export function discard<T extends State>({ CTX_DESC, appInstanceId = '' } : IdProps ) {
	const entry = getContext<T>( CTX_DESC, appInstanceId );
	if( !entry ) { return }
	entry.value.dispose();
	unsetContext( CTX_DESC, appInstanceId );
}

function getContext<T extends State>( CTX_DESC : string, appInstanceId : string ){
	return eagleEyeTable[ appInstanceId ]?.[ CTX_DESC ] as Entry<T>;
}

function hash<T extends State>( value : Props<T> ) {
	return sha512( stringify( value, ( k, v ) => {
		switch( typeof v ) {
			case 'undefined': return 'undefined';
			case 'function': return v.toString();
			default: return v
		}
	} ) as Message );
}

function isomorphize<T extends State>(
	ctxDescriptor : string,
	value? : T | AutoImmutable<T>,
	prehooks? : Prehooks<T>,
	storage? : IStorage<T>
) : SvelteEagleEye<T> {
	return browser
		? new BrowserSvelteEagleEye( ctxDescriptor, value as T, prehooks, storage )
		: new MemorySvelteEagleEye( ctxDescriptor, value as T, prehooks, storage );
}

function setContext<T extends State>({
	appInstanceId = '',
	CTX_DESC = '',
	...props
} : Props<T> ) : void {
	if( !browser && !appInstanceId.length ) { throw new Error( SSRID_REQ ) }
	if( !CTX_DESC.length ) { throw new Error( NO_EMPTY_DESC ) }
	const entry = getContext<T>( CTX_DESC, appInstanceId );
	if( !entry ) {
		if( entry === null ) {
			throw new Error( `${ VACATED_DESC }. Received descriptor: \`${ CTX_DESC }\` at appInstance: \`${ appInstanceId }\`.` );
		}
		if( !( appInstanceId in eagleEyeTable ) ) {
			eagleEyeTable[ appInstanceId ] = {};
		}
		eagleEyeTable[ appInstanceId ][ CTX_DESC ] = {
			hash: hash({ appInstanceId, CTX_DESC, ...props }),
			value: isomorphize<T>(
				CTX_DESC,
				props.value as T,
				props.prehooks,
				props.storage
			)
		};
		return;
	}
	if( entry.hash !== hash({ appInstanceId, CTX_DESC, ...props }) ) {
		let atId = '';
		let callAtId = '';
		if( appInstanceId.length ) {
			atId = ` at appInstanceId: \`${ appInstanceId }\``;
			callAtId = `, '${ appInstanceId }'`;
		}
		throw new Error( `${ DESC_EXISTS }. Received descriptor: \`${ CTX_DESC }\`${ atId }. May invoke \`use( '${ CTX_DESC }'${ callAtId } )\` to obtain it.` );
	}
}

function unsetContext( CTX_DESC : string, appInstanceId : string ){
	if( !getContext( CTX_DESC, appInstanceId ) ) { return }
	eagleEyeTable[ appInstanceId ][ CTX_DESC ] = null as unknown as Entry<any>;
}

export function use<T extends State>({ CTX_DESC, appInstanceId = '' } : IdProps ) {
	return getContext<T>( CTX_DESC, appInstanceId )?.value ?? null;
}
