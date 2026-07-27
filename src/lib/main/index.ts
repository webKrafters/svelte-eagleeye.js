
import type {
	AutoImmutable,
	IdProps,
	IStorage,
	ISvelteEagleEye,
	Prehooks,
	Props,
	State,
} from '../index.ts';

import { browser } from '$app/environment';

interface AppGroup {
	liveEntryCount : number;
	entries : Record<string, Entry<any>>;
} 

interface Entry<T extends State> {
	hash: string;
	value: WeakRef<ISvelteEagleEye>;
}

interface ContextMetadata<T> {
	entry : Entry<any>;
	reachable : boolean;
	type : string;
	value? : T;
}

import stringify from 'safe-stable-stringify';
import { sha512, type Message } from 'js-sha512';

import {
	SvelteEagleEye,
	BrowserSvelteEagleEye,
	MemorySvelteEagleEye
} from '../index.ts';

class NullEagleEye implements ISvelteEagleEye {
	dispose(){}
}

/** Record<appInstanceId, Record<CTX_KEY, Entry<any>>> */
const eagleEyeTable : Record<string, AppGroup> = {};

const eagleEyeRegistry = new FinalizationRegistry(( entryId : IdProps ) => {
	if( !eagleEyeTable[ entryId.appInstanceId ]?.entries?.[ entryId.CTX_DESC ] ) { return }
	eagleEyeTable[ entryId.appInstanceId ].entries[ entryId.CTX_DESC ] = null as unknown as Entry<any>;
	eagleEyeTable[ entryId.appInstanceId ].liveEntryCount--;
	if( eagleEyeTable[ entryId.appInstanceId ].liveEntryCount > 0 ) { return }
	delete eagleEyeTable[ entryId.appInstanceId ];
});

const NULL_TYPE = 'NullEagleEye'; // name of the NullEagleEye class above;

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
	const { reachable, value } = getContextMeta<T>( CTX_DESC, appInstanceId );
	if( !reachable ) { return }
	value!.dispose();
	unsetContext( CTX_DESC, appInstanceId );
}

function getContextMeta<T extends State, V extends any = any>( CTX_DESC : string, appInstanceId : string ) {
	const entry = eagleEyeTable[ appInstanceId ]?.entries?.[ CTX_DESC ];
	const value = entry.value?.deref();
	const retVal = {
		entry,
		reachable: false,
		type: typeof value,
		value
	} as ContextMetadata<typeof value>;
	if( !value ) { return retVal }
	retVal.type = value.constructor.name;
	if( retVal.type !== NULL_TYPE ) {
		retVal.reachable = true;
	};
	return retVal;
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
	const { entry, type, value } = getContextMeta<T>( CTX_DESC, appInstanceId );
	if( type === NULL_TYPE ) {
		throw new Error( `${ VACATED_DESC }. Received descriptor: \`${ CTX_DESC }\` at appInstance: \`${ appInstanceId }\`.` );
	}
	if( !!value ) {
		if( entry.hash === hash({ appInstanceId, CTX_DESC, ...props }) ) { return }
		let atId = '';
		let callAtId = '';
		if( appInstanceId.length ) {
			atId = ` at appInstanceId: \`${ appInstanceId }\``;
			callAtId = `, '${ appInstanceId }'`;
		}
		throw new Error( `${ DESC_EXISTS }. Received descriptor: \`${ CTX_DESC }\`${ atId }. May invoke \`use( '${ CTX_DESC }'${ callAtId } )\` to obtain it.` );
	}
	if( !( appInstanceId in eagleEyeTable ) ) {
		eagleEyeTable[ appInstanceId ] = {
			entries: {},
			liveEntryCount: 0
		};
	}
	const ctx = isomorphize<T>(
		CTX_DESC,
		props.value as T,
		props.prehooks,
		props.storage
	);
	eagleEyeTable[ appInstanceId ].entries[ CTX_DESC ] = {
		hash: hash({ appInstanceId, CTX_DESC, ...props }),
		value: new WeakRef( ctx )
	};
	eagleEyeTable[ appInstanceId ].liveEntryCount++;
	eagleEyeRegistry.register( ctx, { appInstanceId, CTX_DESC }, ctx );
}

function unsetContext( CTX_DESC : string, appInstanceId : string ){
	const { reachable, value } = getContextMeta( CTX_DESC, appInstanceId );
	if( !reachable ) { return }
	eagleEyeRegistry.unregister( value! );
	const nullCtx = new NullEagleEye();
	eagleEyeTable[ appInstanceId ].entries[ CTX_DESC ].value = new WeakRef( nullCtx );
	eagleEyeRegistry.register( nullCtx, { appInstanceId, CTX_DESC }, nullCtx );
}

export function use<T extends State>({ CTX_DESC, appInstanceId = '' } : IdProps ) {
	const { reachable, value } = getContextMeta<T>( CTX_DESC, appInstanceId );
	return reachable ? value : null;
}
