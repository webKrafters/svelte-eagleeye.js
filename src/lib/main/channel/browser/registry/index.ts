export interface Channel<T extends State = any> {
	get memoDetail() : MemoDetail<T>
}

export interface MemoDetail<T extends State = any> {
	group : string;
	key : string;
	owner : string;
	registry : ChannelRegistry<T>;
}

interface GcPayload<T extends State = any> extends MemoDetail<T> {
	memo : MemoBuckets;
}

export interface CacheEntry<T extends State = any> {
	numRefs : number;
	value : WeakRef<Channel<T>>
}

/** {[ OWNER_DESC : string ]: CacheEntry} */
export type Cache<T extends State = any> = Record<string, CacheEntry<T>>;

/** {[ SELECTOR_MAP_AS_KEY : string ]: Cache} */
export type Bucket<T extends State = any> = Record<string, Cache<T>>;

/** {[ SELECTOR_MAP_META : string ]: Bucket} */
export type MemoBuckets<T extends State = any> = Record<string, Bucket<T>>;

export interface ChannelFactory<T extends State = any> {
	make<const S extends SelectorMap = any>( stream : BaseStream<T>, selectorMap : S ) : Channel<T>;
}

export type MakeChannel<T extends State = any> = ChannelFactory<T>[ "make" ];

import { hash as toSha512 } from '../../../util.ts';

import type { 
	BaseStream,
	SelectorMap,
	State
} from '../../../../index.ts';

const gcRegistry = new FinalizationRegistry<GcPayload<any>>( removeFromChannelRegistry );

export class ChannelRegistry<T extends State = any> {
	private static DELIM = ';';
	private static DEFAULT = 'default';
	private _channelFactory : ChannelFactory<T>;
	private _memoBuckets : MemoBuckets<T> = {};

	constructor( channelFactory : MakeChannel<T> );
	constructor( channelFactory : ChannelFactory<T> );
	constructor( channelFactory : any ) {
		this._channelFactory = typeof channelFactory === 'function'
			? createBasicChannelFactoryOf( channelFactory )
			: channelFactory;
	}

	protected get channelFactory() { return this._channelFactory }
	protected get memoBuckets() { return this._memoBuckets }

	protected set channelFactory( channelFactory : ChannelFactory<T> ) {
		this._channelFactory = channelFactory;
	}
	protected set makeChannel( makeFn : MakeChannel<T> ) {
		this._channelFactory = createBasicChannelFactoryOf( makeFn );
	}

	getChannelEntryFor( ownerDesc : string ) {
		const me = this;
		return {
			at<const S extends SelectorMap>( selectorMap? : S ) {
				return me.getTheCacheFor( selectorMap )
					?.[ ownerDesc ]
					?.value
					?.deref();
			}
		};
	}
	getOwnersAt<const S extends SelectorMap>( selectorMap? : S ) {
		return Object.keys( this.getTheCacheFor( selectorMap ) );
	}
	recalibrateChannel( channel : Channel<T> ) {
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
							bucket = {} as Bucket<T>;
							me._memoBuckets[ bucketKey ] = bucket;
						}
						const hashCode = ChannelRegistry.hash( strSelectorMap );
						let cache = bucket[ hashCode ];
						if( !cache ) {
							cache = {} as Cache<T>;
							bucket[ hashCode ] = cache;
						}
						if( ownerDesc in cache ) {
							cache[ ownerDesc ].numRefs++;
							return cache[ ownerDesc ].value.deref();
						}
						const channel = me._channelFactory.make( stream, selectorMap );
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
	unregisterStreamerFrom( channel : Channel<T> ) {
		const { group, key, owner } = channel.memoDetail;
		const entry = this._memoBuckets[ group ]?.[ key ]?.[ owner ];
		!!entry && --entry.numRefs < 1 && this.discardChannel( channel );
	}
	/** @param strSelectorMap - stringified selector map object | ChannelRegistry.DEFAULT */
	private deriveBucketKey( strSelectorMap : string ) {
		return `${ strSelectorMap[ 0 ] }${ ChannelRegistry.DELIM }${ strSelectorMap.at( -1 ) }${ ChannelRegistry.DELIM }${ strSelectorMap.length }`;
	}
	private discardChannel( channel : Channel<T> ) {
		removeFromChannelRegistry({ memo: this._memoBuckets, ...channel.memoDetail });
		gcRegistry.unregister( channel );
	}
	protected getNumReferencesOf( {
		memoDetail: { group, key, owner }
	} : Channel<T> ) {
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


function createBasicChannelFactoryOf<T extends State>( make : MakeChannel<T> ) { return { make } }

function createEntryFor<T extends State>( channel : Channel<T> ) {
	return {
		numRefs: 0,
		value: new WeakRef( channel )
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
