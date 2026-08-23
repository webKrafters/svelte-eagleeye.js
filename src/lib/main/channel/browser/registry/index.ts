export interface MemoDetail<T extends State> {
	group : string;
	key : string;
	owner : string;
	registry : ChannelRegistry<T>;
}

interface GcPayload<T extends State> extends MemoDetail<T> {
	memo : MemoBuckets;
}

import { hash as toSha512 } from '../../../util.ts';

import { BrowserChannel } from '../index.ts';

import type { 
	BaseStream,
	SelectorMap,
	State
} from '../../../../index.ts';

export interface CacheEntry {
	numRefs : number;
	value : WeakRef<BrowserChannel<State, SelectorMap>>
}

/** {[ OWNER_DESC : string ]: CacheEntry} */
export type Cache = Record<string, CacheEntry>;

/** {[ SELECTOR_MAP_AS_KEY : string ]: Cache} */
export type Bucket = Record<string, Cache>;

/** {[ SELECTOR_MAP_META : string ]: Bucket} */
export type MemoBuckets = Record<string, Bucket>;

const gcRegistry = new FinalizationRegistry<GcPayload<any>>( removeFromChannelRegistry );

export class ChannelRegistry<T extends State> {
	private static DELIM = ';';
	private static DEFAULT = 'default';
	private _memoBuckets : MemoBuckets = {};
	protected get memoBuckets() { return this._memoBuckets }
	getChannelEntryFor( ownerDesc : string ) {
		const me = this;
		return {
			at<const S extends SelectorMap>( selectorMap? : S ) {
				return me.getTheCacheFor( selectorMap )
					?.[ ownerDesc ]
					?.value
					?.deref() as unknown as BrowserChannel<T, S>;
			}
		};
	}
	getOwnersAt<const S extends SelectorMap>( selectorMap? : S ) {
		return Object.keys( this.getTheCacheFor( selectorMap ) );
	}
	recalibrateChannel<const S extends SelectorMap>( channel : BrowserChannel<T, S> ) {
		const me = this;
		return {
			against<const S extends SelectorMap>( target : S ) {
				const { key } = channel.memoDetail;
				/* v8 ignore next */
				const strSelectorMap = JSON.stringify( target ) ?? ChannelRegistry.DEFAULT;
				const newHash = ChannelRegistry.hash( strSelectorMap );
				if( key === newHash ) { return }
				const { group, owner: owner } = channel.memoDetail;
				let numStreamers = 0;
				{
					const entry = me._memoBuckets[ group ][ key ][ owner ];
					numStreamers = entry.numRefs;
					entry.numRefs = 0;
				}
				me.discardChannel( channel );
				const newBucketKey = me.deriveBucketKey( strSelectorMap );
				let bucket = me._memoBuckets[ newBucketKey ];
				if( !bucket ) {
					bucket = {} as Bucket;
					me._memoBuckets[ newBucketKey ] = bucket;
				}
				let cache = bucket[ newHash ];
				if( !cache ) {
					cache = {} as Cache;
					bucket[ newHash ] = cache;
				}
				if( !( owner in cache ) ) {
					cache[ owner ] = createEntryFor( channel );
				}
				cache[ owner ].numRefs += numStreamers ;
				channel.memoDetail.group = newBucketKey;
				channel.memoDetail.key = newHash;
				gcRegistry.register( channel, {
					...channel.memoDetail,
					memo: me._memoBuckets
				}, channel );
			}
		};
	}
	registerStream( stream : BaseStream<T> ) {
		const me = this;
		return {
			for( ownerDesc : string ) {
				return {
					at<const S extends SelectorMap>( selectorMap? : S ) {
						const strSelectorMap = JSON.stringify( selectorMap ) ?? ChannelRegistry.DEFAULT;
						const bucketKey = me.deriveBucketKey( strSelectorMap );
						let bucket = me._memoBuckets[ bucketKey ];
						if( !bucket ) {
							bucket = {} as Bucket;
							me._memoBuckets[ bucketKey ] = bucket;
						}
						const hashCode = ChannelRegistry.hash( strSelectorMap );
						let cache = bucket[ hashCode ];
						if( !cache ) {
							cache = {} as Cache;
							bucket[ hashCode ] = cache;
						}
						if( ownerDesc in cache ) {
							cache[ ownerDesc ].numRefs++;
							return cache[ ownerDesc ].value.deref() as unknown as BrowserChannel<T, S>;
						}
						const channel = new BrowserChannel<T, S>( stream, selectorMap! );
						channel.memoDetail.group = bucketKey;
						channel.memoDetail.key = hashCode;
						channel.memoDetail.owner = ownerDesc;
						channel.memoDetail.registry = me;
						cache[ ownerDesc ] = createEntryFor( channel );
						cache[ ownerDesc ].numRefs++;
						gcRegistry.register( channel, {
							...channel.memoDetail,
							memo: me._memoBuckets
						}, channel );
						return channel;
					}
				}
			}
		};
	}
	unregisterStreamerFrom<const S extends SelectorMap>( channel : BrowserChannel<T, S> ) {
		const { group, key, owner } = channel.memoDetail;
		const entry = this._memoBuckets[ group ]?.[ key ]?.[ owner ];
		!!entry && --entry.numRefs < 1 && this.discardChannel( channel );
	}
	/** @param strSelectorMap - stringified selector map object | ChannelRegistry.DEFAULT */
	private deriveBucketKey( strSelectorMap : string ) {
		return `${ strSelectorMap[ 0 ] }${ ChannelRegistry.DELIM }${ strSelectorMap.at( -1 ) }${ ChannelRegistry.DELIM }${ strSelectorMap.length }`;
	}
	private discardChannel<const S extends SelectorMap>( channel : BrowserChannel<T, S> ) {
		removeFromChannelRegistry({ memo: this._memoBuckets, ...channel.memoDetail });
		gcRegistry.unregister( channel );
	}
	protected getNumReferencesOf<const S extends SelectorMap>(
		{ memoDetail: { group, key, owner } } : BrowserChannel<T, S>
	) {
		/* v8 ignore next */
		return this._memoBuckets[ group ]?.[ key ]?.[ owner ]?.numRefs ?? 0
	}
	private getTheCacheFor<const S extends SelectorMap>( selectorMap? : S ) {
		const strSelectorMap = JSON.stringify( selectorMap ) ?? ChannelRegistry.DEFAULT;
		return this._memoBuckets[ this.deriveBucketKey( strSelectorMap ) ]
			?.[ ChannelRegistry.hash( strSelectorMap ) ] ?? {};
	}
	private static hash<const S extends SelectorMap>( selectorMap? : S ) : string;
	private static hash( selectorMap? : string /* stringified selectorMap */ ) : string;
	private static hash( selectorMap = ChannelRegistry.DEFAULT ) : string {
		return toSha512( selectorMap );
	}
}

function createEntryFor<T extends State, S extends SelectorMap>( channel : BrowserChannel<T, S> ) {
	return {
		numRefs: 0,
		value: new WeakRef( channel ) as unknown as WeakRef<BrowserChannel<State, SelectorMap>>
	};
}

function removeFromChannelRegistry<T extends State>({ memo, ...detail } : GcPayload<T> ) {
	const nodes = [] as Array<{
		key : string;
		pNode : Record<string, any>;
	}>;
	let pNode = memo as Record<string, any>;
	for( const key of [ detail.group, detail.key, detail.owner ] ) {
		/* v8 ignore next */
		if( !( key in pNode ) ) { break }
		nodes.push({ key, pNode });
		pNode = pNode[ key ];
	}
	while( nodes.length ) {
		const { key, pNode } = nodes.pop()!;
		delete pNode[ key ];
		if( Object.keys( pNode ).length ) { return }
	}
}
