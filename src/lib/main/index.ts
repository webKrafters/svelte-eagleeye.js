interface Entry {
	hash : string;
	value : null|ISvelteEagleEye;
}

export interface RequestGroup {
	id : string;
	entries : Record<string, Entry>;
}

export type { Props, RequestToken, State };

import type {
	AutoImmutable,
	ContextInfo,
	Identifier,
	IStorage,
	ISvelteEagleEye,
	Prehooks,
	Props,
	RequestToken,
	State
} from '../index.ts';

import { browser } from '$app/environment';

import { hash as toSha512 } from './util.ts';

import {
	SvelteEagleEye,
	BrowserSvelteEagleEye,
	MemorySvelteEagleEye
} from '../index.ts';
import { emitWarning } from 'process';

const defaultRequestToken : RequestToken = { _id: crypto.randomUUID() };

export const deps = {
	eagleEyeMap: new WeakMap<RequestToken, RequestGroup>(),
	isBrowser() { return browser }
}

export const DESC_EXISTS = 'An EagleEyeContext instance already uses this key';
export const INVALID_TOKEN = 'Valid `requestToken` property required in parameter per request when in the server'
export const NO_REQUEST_MUTATION = 'Request Token _id does not match found context. Please return the _id to its original value';
export const VACATED_DESC = 'Non EagleEyeContext value found at supplied context instance key';

export function allKeysIn( requestToken? : RequestToken ) {
	return Object.keys( getRequestGroup( requestToken )?.entries ?? {} );
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
	if( !entry?.value ) { return }
	entry.value.dispose();
	entry.value = null;
}

export function use({ key, requestToken } : Identifier ) {
	return getRequestGroup( requestToken )?.entries?.[ key ]?.value ?? null
}

function assertToken( rToken? : RequestToken ) {
	if( typeof rToken === 'undefined' ) {
		if( deps.isBrowser() ) { return }
		throw new Error( `${ INVALID_TOKEN }. Found \`${ JSON.stringify( rToken, null, 2 ) }\`.` );
	}
	if( !!rToken?._id?.length ) { return }
	throw new Error( `${ INVALID_TOKEN }. Found \`${ JSON.stringify( rToken, null, 2 ) }\`.` );
}

function getRequestGroup( rToken? : RequestToken ) {
	assertToken( rToken );
	if( !rToken ) { return deps.eagleEyeMap.get( defaultRequestToken ) }
	const group = deps.eagleEyeMap.get( rToken );
	if( !group ) { return group }
	if( group.id !== rToken._id ) {
		throw new Error( `${ NO_REQUEST_MUTATION }. Supplied: \`${ rToken._id }\`. Found: \`${ group.id }\`.` );
	}
	return group;
}

function hash<T extends State>( value : Omit<Props<T>, "requestToken"> ) {
	return toSha512( value );
}

function isomorphize<T extends State>(
	ctxDescriptor : string,
	value? : T | AutoImmutable<T>,
	prehooks? : Prehooks<T>,
	storage? : IStorage<T>
) : SvelteEagleEye<T> {
	return deps.isBrowser()
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
		deps.eagleEyeMap.set( rToken, group );
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
		let atToken = !requestToken ? '' : `  at appInstance: \`${ JSON.stringify( requestToken, null, 2 ) }\``;
		throw new Error( `${ VACATED_DESC }. Received key: \`${ key }\`${ atToken }.` );
	}
	if( entry.hash === hash({ key, ...props }) ) { return }
	let atToken = '';
	let callAtToken = '';
	if( !!requestToken ) {
		atToken = ` at request token: \`${ JSON.stringify( requestToken, null, 2 ) }\``;
		callAtToken = `, \`${ JSON.stringify( requestToken, null, 2 ) }\``;
	}
	throw new Error( `${ DESC_EXISTS }. Received key: '${ key }'${ atToken }. May invoke \`use( '${ key }'${ callAtToken } )\` to obtain it.` );
}
