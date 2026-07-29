
import type {
	AutoImmutable,
	ContextInfo,
	Descriptor,
	IStorage,
	ISvelteEagleEye,
	Prehooks,
	Props,
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

const defaultRequestToken : RequestToken = { _id: crypto.randomUUID() };

const eagleEyeMap = new WeakMap<RequestToken, RequestGroup>();

export const DESC_EXISTS = 'An EagleEyeContext instance already uses this descriptor';
export const INVALID_TOKEN = 'Valid `requestToken` property required in parameter per request when in the server.'
export const NO_DESC_ENTRY = 'No entry found using this context instance descriptor';
export const NO_EMPTY_DESC = 'An EagleEyeContext instance descriptor cannot be empty';
export const NO_REQUEST_MUTATION = 'Request Token _id does not match found context. Please return the _id to its original value.';
export const UNAVAILABLE_DESC = 'This descriptor is currently unavailable';
export const VACATED_DESC = 'Non EagleEyeContext value found at supplied context instance descriptor';

function assertToken( rToken? : RequestToken ) {
	if( typeof rToken === 'undefined' ) {
		if( browser ) { return }
		throw new Error( `${ INVALID_TOKEN }. Found \`${ rToken }\`.` );
	}
	if( !!rToken?._id.length ) { return }
	throw new Error( `${ INVALID_TOKEN }. Found \`${ rToken }\`.` );
}

export function create<T extends State>( props : Props<T> ) : ContextInfo<T> {
	setContext( props );
	const descriptor = { CTX_DESC: props.CTX_DESC } as Descriptor;
	if( 'requestToken' in props ) {
		descriptor.requestToken = props.requestToken;
	}
	return { descriptor, value: use( props ) as SvelteEagleEye<T> };
}

export function discard({ CTX_DESC, requestToken } : Descriptor ) {
	const group = getRequestGroup( requestToken );
	if( !group ) { return }
	const entry = group.entries[ CTX_DESC ];4
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

function setContext<T extends State>({
	CTX_DESC = '',
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
	let entry = group.entries[ CTX_DESC ];
	if( !entry ) {
		group.entries[ CTX_DESC ] = {
			hash: hash({ CTX_DESC, ...props }),
			value: isomorphize<any>(
				CTX_DESC,
				props.value,
				props.prehooks,
				props.storage
			)
		};
		return;
	}
	if( !entry.value ) {
		let atToken = !requestToken ? '' : `  at appInstance: \`${ requestToken }\``;
		throw new Error( `${ VACATED_DESC }. Received descriptor: \`${ CTX_DESC }\`${ atToken }.` );
	}
	if( entry.hash === hash({ CTX_DESC, ...props }) ) { return }
	let atToken = '';
	let callAtToken = '';
	if( !!requestToken ) {
		atToken = ` at request token: \`${ requestToken }\``;
		callAtToken = `, '${ requestToken }'`;
	}
	throw new Error( `${ DESC_EXISTS }. Received descriptor: \`${ CTX_DESC }\`${ atToken }. May invoke \`use( '${ CTX_DESC }'${ callAtToken } )\` to obtain it.` );
}

export function use({ CTX_DESC, requestToken } : Descriptor ) {
	return getRequestGroup( requestToken )?.entries?.[ CTX_DESC ]?.value ?? null
}
