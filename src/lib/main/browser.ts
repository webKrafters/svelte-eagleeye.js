import type { AutoImmutable, IStorage, Prehooks, SelectorMap, State, Store } from '..';

import { SvelteEagleEye } from './base.ts';
import { ChannelRegistry } from './channel/browser/registry/index.ts';

export class BrowserSvelteEagleEye<T extends State> extends SvelteEagleEye<T> {
	private _sRegistry : ChannelRegistry<T>;
	constructor(
		value? : T,
		prehooks? : Prehooks<T>,
		storage? : IStorage<T>
	); 
	constructor(
		value? : AutoImmutable<T>,
		prehooks? : Prehooks<T>,
		storage? : IStorage<T>
	);
	constructor( value : any, prehooks : any, storage : any ) {
		super( value, prehooks, storage );
		this._sRegistry = new ChannelRegistry<T>();
	}
	get stream() {
		const stream = this.baseStream;
		return <const S extends SelectorMap>(
			ownerDesc : string,
			selectorMap? : S
		) => {
			const existingEntry = this
				._sRegistry
				.getChannelEntryAt( selectorMap );
			if( existingEntry ) {
				existingEntry.owners.add( ownerDesc );
				return existingEntry.channel.store as Store<T, S>;
			}	
			return this
				._sRegistry
				.registerStream( stream, ownerDesc )
				.at( selectorMap )
				.store as Store<T, S>;
		};
	}
}

