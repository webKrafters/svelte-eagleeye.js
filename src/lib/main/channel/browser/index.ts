import type { 
	BaseStream,
	SelectorMap,
	State
} from '../../../index.ts';

import { onDestroy, onMount } from 'svelte';

import { afterNavigate, beforeNavigate } from '$app/navigation';

import { Channel } from '../base.svelte.ts';

import type { MemoDetail } from './registry/index.ts';

export class BrowserChannel<
	T extends State, 
	const S extends SelectorMap
> extends Channel<T, S>{
	private _memoDetail = {
		group: undefined,
		key: undefined,
		owner: undefined,
		registry: undefined
	} as unknown as MemoDetail<T>;
	private _navigationDetected = false;
	constructor( stream : BaseStream<T>, selectorMap? : S ) {
		super( stream, selectorMap );
		afterNavigate(() => { this._navigationDetected = false });
		beforeNavigate(() => { this._navigationDetected = true });
		const sync = this.synchronizer;
		onMount(() => this.channel.addListener( 'data-changed', sync ));
		onDestroy(() => {
			/* v8 ignore next */
			if( this._navigationDetected ) { return }
			this.channel.removeListener( 'data-changed', sync );
			this.channel.endStream();
			this._memoDetail.registry.unregisterChannel( this );
		});
		sync();
	}

	get memoDetail() { return this._memoDetail }
	
	set selectorMap( selectorMap : S ) {
		this._memoDetail
			.registry
				.recalibrateChannel( this )
					.against( selectorMap );
		super.selectorMap = selectorMap;
	}
	
}
