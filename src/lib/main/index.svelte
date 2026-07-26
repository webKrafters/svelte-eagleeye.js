<script lang='ts' module>
	import type {
		AutoImmutable,
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

	export interface RequestEvent extends SvelteRequestEvent {
		eagleEyeContexts?: Record<string, SvelteEagleEye<any>>;
	}

	interface Entry<T extends State> {
		hash: string;
		value: SvelteEagleEye<T>;
	}

	import stringify from 'safe-stable-stringify';
	import { sha512, type Message } from 'js-sha512';

	import { getContext, hasContext, setContext, type Snippet } from 'svelte';

	export const REQUEST_CONTEXT_KEY = 'requestEvent';

	var KEY_PREFIX = 'SVEEC:' + `${ Math.random() }`.slice( -8 ) + ':';
	var KEY = ( str : TemplateStringsArray, key : string ) => `${ KEY_PREFIX }${ key }`;

	export const DESC_EXISTS = 'An EagleEyeContext instance already uses this descriptor';
	export const NO_DESC_ENTRY = 'No entry found using this context instance descriptor';
	export const NO_EMPTY_DESC = 'An EagleEyeContext instance descriptor cannot be empty';
	export const ONLY_STRING_DESC = 'The supplied EagleEyeContext instance descriptor is of an invalid key type. Only a string type is expected';
	export const UNAVAILABLE_DESC = 'This descriptor is currently unavailable';
	export const VACATED_DESC = 'Non EagleEyeContext value found at supplied context instance descriptor';

	export function create<T extends State>({
		CTX_DESC, prehooks, storage, value
	} : Props<T> ) {
		let entry : Entry<T>;
		try {
			entry = getEntryAt<T>( CTX_DESC );
		} catch( e : any ) {
			if( e.message.startsWith( VACATED_DESC ) ) {
				throw new Error( `${ UNAVAILABLE_DESC }. Received descriptor: \`${ CTX_DESC }\`.` );
			}
			if( e.message.startsWith( NO_DESC_ENTRY ) ) {
				return setContext<Entry<T>>( KEY`${ CTX_DESC }`, {
					hash: hash({ CTX_DESC, prehooks, storage, value }),
					value: isomorphize<T>( CTX_DESC, value as T, prehooks, storage )
				} ).value;
			}
			throw e;
		}
		if( entry.hash === hash({ CTX_DESC, prehooks, storage, value }) ) {
			return entry.value;
		}
		throw new Error( `${ DESC_EXISTS }. Received descriptor: \`${ CTX_DESC }\`. May invoke \`use( '${ CTX_DESC }' )\` to obtain it.` );
	}

	export function discard<T extends State>( CTX_DESC : string ) {
		try {
			getEntryAt<T>( CTX_DESC ).value.dispose();
			setContext( CTX_DESC, null );
		} catch( e : any ) {
			if( e.message.startsWith( NO_EMPTY_DESC ) ||
				e.message.startsWith( ONLY_STRING_DESC )
			) { throw e }
		}
	}

	export function use<T extends State>( CTX_DESC : string ) {
		return getEntryAt<T>( CTX_DESC ).value;
	}

	function getEntryAt<T extends State>( CTX_DESC : string ) {
		validatetDesc( CTX_DESC );
		const entry = getContext<Entry<T>>( KEY`${ CTX_DESC }` );
		if( !( entry?.value?.constructor.name ?? '' ).endsWith( 'SvelteEagleEye' ) ) {
			if( !hasContext( KEY`${ CTX_DESC }` ) ) {
				throw new Error( `${ NO_DESC_ENTRY }. Received descriptor: \`${ CTX_DESC }\`.` );
			}
			throw new Error( `${ VACATED_DESC }. Received descriptor: \`${ CTX_DESC }\`.` );
		}
		return entry;
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

	function isString( value : any ) { return typeof value === 'string' || value instanceof String }

	function validatetDesc( CTX_DESC : any ) {
		if( !isString( CTX_DESC ) ) {
			throw new Error( `${ ONLY_STRING_DESC }. Received descriptor: \`${ CTX_DESC }\`.` );
		}
		if( !CTX_DESC.length ) { throw new Error( NO_EMPTY_DESC ) }
	}
</script>

<script generics="T extends  State" lang="ts">

	import { onDestroy, untrack } from 'svelte';

	const {
		children, CTX_DESC, prehooks, serverRequest, storage, value
	} : Props<T> & {
		children? : Snippet,
		serverRequest? : RequestEvent
	} = $props();

	const ctx = create({
		CTX_DESC: untrack( () => CTX_DESC ),
		prehooks: untrack( () => prehooks ),
		storage: untrack( () => storage ),
		value: untrack( () => value )
	});

	$effect(() => {
		let reqEvent = untrack( () => serverRequest )!;
		let requestEvent = getContext<RequestEvent>( REQUEST_CONTEXT_KEY );
		if( typeof requestEvent === 'undefined' ) {
			if( typeof reqEvent === 'undefined' ) { return }
			requestEvent = setContext<RequestEvent>( REQUEST_CONTEXT_KEY, reqEvent );
		}
		if( !( 'eagleEyeContexts' in requestEvent ) ) {
			requestEvent.eagleEyeContexts = {};
		}
		const thisContextKey = CTX_DESC + '@EAGLEEYE_CONTEXT';
		if( !( thisContextKey in requestEvent.eagleEyeContexts! ) ) {
			requestEvent.eagleEyeContexts![ thisContextKey ] = ctx;
		}
	})

  	onDestroy(() => ctx.dispose());

</script>

{@render children?.()}
