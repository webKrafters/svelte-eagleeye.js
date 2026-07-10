import type { 
	BaseStream,
	SelectorMap,
	State
} from '../../..';

import { onDestroy, onMount } from 'svelte';

import { afterNavigate, beforeNavigate } from '$app/navigation';

import { Channel } from '../base.svelte.ts';

import { ChannelRegistry } from './registry/index.ts';

export class BrowserChannel<
	T extends State, 
	const S extends SelectorMap
> extends Channel<T, S>{
	private _memoDetail = {
		group: undefined as unknown as string,
		key: undefined as unknown as string,
		owner: undefined as unknown as string,
		registry: undefined as unknown as ChannelRegistry<T>
	};
	private _navigationDetected = false;
	constructor( stream : BaseStream<T>, selectorMap : S ) {
		super( stream, selectorMap );
		afterNavigate(() => { this._navigationDetected = false });
		beforeNavigate(() => { this._navigationDetected = true });
		const sync = this.synchronizer;
		onMount(() => this.channel.addListener( 'data-changed', sync ));
		onDestroy(() => {
			if( this._navigationDetected ) { return }
			this.channel.removeListener( 'data-changed', sync );
			this.channel.endStream();
			this._memoDetail.registry.unregisterChannel( this );
		});
		sync();
	}

	get memoDetail() { return this._memoDetail }
	
	set selectorMap( selectorMap : S ) {
		super.selectorMap = selectorMap;
		this._memoDetail.registry.revalidateChannelEntryFor( this );
	}
	
}
