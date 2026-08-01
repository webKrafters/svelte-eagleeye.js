
import type {
	AutoImmutable,
	ContextInfo,
	Identifier,
	IStorage,
	ISvelteEagleEye,
	Prehooks,
	Props,
	ProviderProps,
	RawProviderProps,
	RequestToken,
	State
} from '../index.ts';

import { browser } from '$app/environment';

interface Entry {
	hash : string;
	value : null|ISvelteEagleEye;
}

interface RequestGroup {
	id : string;
	entries : Record<string, Entry>;
}

import stringify from 'safe-stable-stringify';
import { sha512, type Message } from 'js-sha512';

import {
	SvelteEagleEye,
	BrowserSvelteEagleEye,
	MemorySvelteEagleEye
} from '../index.ts';
import { getContext, setContext } from 'svelte';

const defaultRequestToken : RequestToken = { _id: crypto.randomUUID() };

const eagleEyeMap = new WeakMap<RequestToken, RequestGroup>();

export const DESC_EXISTS = 'An EagleEyeContext instance already uses this key';
export const INVALID_TOKEN = 'Valid `requestToken` property required in parameter per request when in the server'
export const NO_REQUEST_MUTATION = 'Request Token _id does not match found context. Please return the _id to its original value';
export const VACATED_DESC = 'Non EagleEyeContext value found at supplied context instance key';

export function allDescriptorsIn( requestToken? : RequestToken ) {
	return Object.keys( getRequestGroup( requestToken )?.entries ?? {} );
}

function assertToken( rToken? : RequestToken ) {
	if( typeof rToken === 'undefined' ) {
		if( browser ) { return }
		throw new Error( `${ INVALID_TOKEN }. Found \`${ rToken }\`.` );
	}
	if( !!rToken?._id.length ) { return }
	throw new Error( `${ INVALID_TOKEN }. Found \`${ rToken }\`.` );
}

export function create<T extends State>( props : Props<T> ) : ContextInfo<T> {
	setUniversalContext( props );
	const identifier = { key: props.key } as Identifier;
	if( 'requestToken' in props ) {
		identifier.requestToken = props.requestToken;
	}
	return { identifier, value: use( props ) as SvelteEagleEye<T> };
}

export function discard({ key, requestToken } : Identifier ) {
	const group = getRequestGroup( requestToken );
	if( !group ) { return }
	const entry = group.entries[ key ];
	if( !entry.value ) { return }
	entry.value.dispose();
	entry.value = null;
}

function getRequestGroup( rToken? : RequestToken ) {
	assertToken( rToken );
	if( !rToken ) { return eagleEyeMap.get( defaultRequestToken ) }
	const group = eagleEyeMap.get( rToken );
	if( !group ) { return group }
	if( group.id !== rToken._id ) {
		throw new Error( `${ NO_REQUEST_MUTATION }. Supplied: \`${ rToken._id }\`. Found: \`${ group.id }\`.` );
	}
	return group;
}

function hash<T extends State>( value : Omit<Props<T>, "requestToken"> ) {
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

function setUniversalContext<T extends State>({
	key = '',
	requestToken,
	...props
} : Props<T> ) : void {
	let group = getRequestGroup( requestToken );
	let rToken = requestToken ?? defaultRequestToken;
	if( !group ) {
		group = {
			id: rToken._id,
			entries: {}
		};
		eagleEyeMap.set( rToken, group );
	}
	let entry = group.entries[ key ];
	if( !entry ) {
		group.entries[ key ] = {
			hash: hash({ key, ...props }),
			value: isomorphize<any>(
				key,
				props.value,
				props.prehooks,
				props.storage
			)
		};
		return;
	}
	if( !entry.value ) {
		let atToken = !requestToken ? '' : `  at appInstance: \`${ requestToken }\``;
		throw new Error( `${ VACATED_DESC }. Received key: \`${ key }\`${ atToken }.` );
	}
	if( entry.hash === hash({ key, ...props }) ) { return }
	let atToken = '';
	let callAtToken = '';
	if( !!requestToken ) {
		atToken = ` at request token: \`${ requestToken }\``;
		callAtToken = `, '${ requestToken }'`;
	}
	throw new Error( `${ DESC_EXISTS }. Received key: \`${ key }\`${ atToken }. May invoke \`use( '${ key }'${ callAtToken } )\` to obtain it.` );
}

export function use({ key, requestToken } : Identifier ) {
	return getRequestGroup( requestToken )?.entries?.[ key ]?.value ?? null
}
