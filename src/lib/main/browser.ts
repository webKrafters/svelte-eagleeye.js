import {
	ChannelRegistry,
	type Channel
} from '@webkrafters/eagleeye.channels.repository';

import type {
	AutoImmutable,
	IStorage,
	Prehooks,
	SelectorMap,
	State
} from '../index.ts';

import { SvelteEagleEye } from './base.ts';
import { BrowserChannel } from './channel/browser/index.ts';

export class BrowserSvelteEagleEye<T extends State> extends SvelteEagleEye<T> {
	private _sRegistry : ChannelRegistry<T>;
	constructor(
		name : string,
		value? : T,
		prehooks? : Prehooks<T>,
		storage? : IStorage<T>
	); 
	constructor(
		name : string,
		value? : AutoImmutable<T>,
		prehooks? : Prehooks<T>,
		storage? : IStorage<T>
	);
	constructor( name : string, value? : any, prehooks? : any, storage? : any ) {
		super( name, value, prehooks, storage );
		this._sRegistry = new ChannelRegistry<T>(
			( stream, selectorMap ) => new BrowserChannel( stream, selectorMap )
		);
	}
	get stream() {
		const stream = this.baseStream;
		return <const S extends SelectorMap>(
			ownerDesc : string,
			selectorMap? : S
		) => {
			let channel = this
				._sRegistry
				.getChannelEntryFor( ownerDesc )
				.at( selectorMap ) as BrowserChannel<T, S>;
			if( channel ) { return channel.store }
			channel = this
				._sRegistry
				.registerStream( stream )
				.for( ownerDesc )
				.at( selectorMap ) as BrowserChannel<T, S>;
			return channel.store;
		};
	}
}

