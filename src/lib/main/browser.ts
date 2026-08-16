import type { AutoImmutable, IStorage, Prehooks, SelectorMap, State, Store } from '../index.ts';

import { SvelteEagleEye } from './base.ts';
import { ChannelRegistry } from './channel/browser/registry/index.ts';

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
					.getChannelEntryFor( ownerDesc )
						.at( selectorMap );
			if( existingEntry ) {
				return existingEntry.store as unknown as Store<T, S>;
			}	
			return this
				._sRegistry
					.registerStream( stream )
						.for( ownerDesc )
							.at( selectorMap )
								.store as unknown as Store<T, S>;

			
		};
	}
}

