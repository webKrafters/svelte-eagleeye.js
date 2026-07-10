import type { BaseStream, SelectorMap, State } from '../../..';

import { onMount } from 'svelte';

import { Channel } from '../base.svelte.ts';

export class MemoryChannel<
	T extends State, 
	const S extends SelectorMap
> extends Channel<T, S>{
	constructor( stream : BaseStream<T>, selectorMap : S ) {
		super( stream, selectorMap );
		const sync = this.synchronizer;
		onMount(() => {
			this.channel.addListener( 'data-changed', sync );
			return () => {
				this.channel.removeListener( 'data-changed', sync );
				this.channel.endStream();
			};
		});
		sync();
	}
}
