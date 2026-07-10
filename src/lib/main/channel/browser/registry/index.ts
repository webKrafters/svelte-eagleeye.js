import { BrowserChannel } from '../index.ts';

import type { 
	BaseStream,
	SelectorMap,
	State
} from '../../../..';

interface Memo<T extends State> {
	channel: BrowserChannel<T, SelectorMap>;
	owners: Set<string>;
}

type Bucket<T extends State> = Record<string, Memo<T>>;

export class ChannelRegistry<T extends State> {
	private static DELIM = ';';
	private static DEFAULT = 'default';
	private memoBuckets : Record<string, Bucket<T>> = {};
	getChannelEntryAt<const S extends SelectorMap>( selectorMap? : S ) {
		const strSelectorMap = JSON.stringify( selectorMap ) ?? ChannelRegistry.DEFAULT;
		return this.memoBuckets[ this.deriveBucketKey( strSelectorMap ) ]
			?.[ ChannelRegistry.hash( strSelectorMap ) ];
	}
	/** @param strSelectorMap - stringified selector map object */
	registerStream(
		stream : BaseStream<T>,
		ownerDesc : string
	) {
		const me = this;
		return {
			at<const S extends SelectorMap>( selectorMap? : S ) {
				const strSelectorMap = JSON.stringify( selectorMap ) ?? ChannelRegistry.DEFAULT;
				const bucketKey = me.deriveBucketKey( strSelectorMap );
				let bucket = me.memoBuckets[ bucketKey ];
				if( !bucket ) {
					bucket = {} as Bucket<T>;
					me.memoBuckets[ bucketKey ] = bucket;
				}
				const hashCode = ChannelRegistry.hash( strSelectorMap );
				if( !( hashCode in bucket ) ) {
					const channel = new BrowserChannel<T, S>( stream, selectorMap! );
					channel.memoDetail.registry = me;
					channel.memoDetail.group = bucketKey;
					channel.memoDetail.key = hashCode;
					bucket[ hashCode ] = { channel, owners: new Set<string>() };
				}
				bucket[ hashCode ].owners.add( ownerDesc );
				return bucket[ hashCode ].channel;
			}
		};
	}
	revalidateChannelEntryFor<const S extends SelectorMap>( channel : BrowserChannel<T, S> ) {
		const strSelectorMap = JSON.stringify( channel.selectorMap );
		const newHash = ChannelRegistry.hash( strSelectorMap );
		if( channel.memoDetail.key === newHash ) { return }
		this.unregisterChannel( channel );
		const newBucketKey = this.deriveBucketKey( strSelectorMap );
		if( !( newBucketKey in this.memoBuckets ) ) {
			this.memoBuckets[ newBucketKey ] = {} as Bucket<T>;
		}
		if( !( newHash in this.memoBuckets[ newBucketKey ] ) ) {
			channel.memoDetail.group = newBucketKey;
			channel.memoDetail.key = newHash;
			this.memoBuckets[ newBucketKey ][ newHash ] = {
				channel, owners: new Set<string>()
			}
		}
		this.memoBuckets[ newBucketKey ][ newHash ].owners.add(
			channel.memoDetail.owner
		);
	}
	unregisterChannel<const S extends SelectorMap>( channel : BrowserChannel<T, S> ) {
		const { memoDetail } = channel;
		const group = this.memoBuckets[ memoDetail.group ];
		if( !group ) { return }
		const entry = group[ memoDetail.key ];
		if( entry.channel !== channel ) { return }
		entry.owners.delete( channel.memoDetail.owner )
		if( !entry.owners.size ) {
			delete group[ memoDetail.key ];
		}
		if( Object.keys( group ).length ) { return }
		delete this.memoBuckets[ memoDetail.group ]
	}
	/** @param strSelectorMap - stringified selector map object */
	private deriveBucketKey( strSelectorMap : string = ChannelRegistry.DEFAULT ) {
		const { length } = strSelectorMap;
		switch( length ) {
			case 0: return `${ ChannelRegistry.DELIM }${ ChannelRegistry.DELIM }0`;
			case 1: return `${ strSelectorMap[ 0 ] }${ ChannelRegistry.DELIM }${ strSelectorMap[ 0 ] }${ ChannelRegistry.DELIM }1`;
		}
		return `${ strSelectorMap[ 0 ] }${ ChannelRegistry.DELIM }${ strSelectorMap[ length - 1 ] }${ ChannelRegistry.DELIM }${ length }`;
	}
	private static hash<const S extends SelectorMap>( selectorMap? : S ) : string;
	private static hash( selectorMap? : string /* stringified selectorMap */ ) : string;
	private static hash( selectorMap = ChannelRegistry.DEFAULT ) : string {
		const str = JSON.stringify( selectorMap );
		let factor = 0;
		for( let s = str.length; s--; ) {
			factor += ( s + str.charCodeAt( s ) + 1 ) 
		}
		return `${ factor }`;
	}
}
