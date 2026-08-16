export interface MemoDetail<T extends State> {
	group : string;
	key : string;
	owner : string;
	registry : ChannelRegistry<T>;
}

interface GcPayload extends MemoDetail<State> {
	memo : MemoBuckets;
}

import { hash as toSha512 } from '../../../util.ts';

import { BrowserChannel } from '../index.ts';

import type { 
	BaseStream,
	SelectorMap,
	State
} from '../../../../index.ts';

export const CHANNEL_DUPLICATION = 'Detected an attempt to create duplicate channel to an existing stream';

/** {[ OWNER_DESC : string> ]: WeakRef<BrowserChannel>} */
export type Cache = Record<string, WeakRef<BrowserChannel<State, SelectorMap>>>;

/** {[ SELECTOR_MAP_AS_KEY : string> ]: Cache} */
export type Bucket = Record<string, Cache>;

/** {[ SELECTOR_MAP_META : string> ]: Bucket} */
export type MemoBuckets = Record<string, Bucket>;

const gcRegistry = new FinalizationRegistry( removeFromChannelRegistry );

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
				/* v8 ignore next */
				const strSelectorMap = JSON.stringify( target ) ?? ChannelRegistry.DEFAULT;
				const newHash = ChannelRegistry.hash( strSelectorMap );
				if( channel.memoDetail.key === newHash ) { return }
				const newBucketKey = me.deriveBucketKey( strSelectorMap );
				const { owner: ownerDesc } = channel.memoDetail;
				if( !!me._memoBuckets[ newBucketKey ]?.[ newHash ]?.[ ownerDesc ] ) {
					throw new Error( `${ CHANNEL_DUPLICATION }. At client: \`${ ownerDesc }\`.` );
				}
				me.unregisterChannel( channel );
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
				cache[ ownerDesc ] = new WeakRef( channel ) as unknown as WeakRef<BrowserChannel<State, SelectorMap>>;
				channel.memoDetail.group = newBucketKey;
				channel.memoDetail.key = newHash;
				gcRegistry.register( channel, {
					...channel.memoDetail,
					memo: me._memoBuckets
				} as GcPayload, channel );
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
							throw new Error( `${ CHANNEL_DUPLICATION }. At client: \`${ ownerDesc }\`.` );
						}
						const channel = new BrowserChannel<T, S>( stream, selectorMap! );
						channel.memoDetail.group = bucketKey;
						channel.memoDetail.key = hashCode;
						channel.memoDetail.owner = ownerDesc;
						channel.memoDetail.registry = me;
						cache[ ownerDesc ] = new WeakRef( channel ) as unknown as WeakRef<BrowserChannel<State, SelectorMap>>;
						gcRegistry.register( channel, {
							...channel.memoDetail,
							memo: me._memoBuckets
						} as GcPayload, channel );
						return channel;
					}
				}
			}
		};
	}
	unregisterChannel<const S extends SelectorMap>( channel : BrowserChannel<T, S> ) {
		removeFromChannelRegistry({
			memo: this._memoBuckets,
			...channel.memoDetail
		} as GcPayload );
		gcRegistry.unregister( channel );
	}
	/** @param strSelectorMap - stringified selector map object | ChannelRegistry.DEFAULT */
	private deriveBucketKey( strSelectorMap : string ) {
		const { length } = strSelectorMap;
		return `${ strSelectorMap[ 0 ] }${ ChannelRegistry.DELIM }${ strSelectorMap[ length - 1 ] }${ ChannelRegistry.DELIM }${ length }`;
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

function removeFromChannelRegistry({ memo, ...detail } : GcPayload ) {
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
