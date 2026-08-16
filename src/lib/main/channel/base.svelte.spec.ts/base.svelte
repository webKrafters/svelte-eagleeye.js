<script lang="ts" module>
	import { onMount } from 'svelte';
	import getProperty from '@webkrafters/get-property';
	import { Channel } from '../base.svelte.ts';
	import type {
		BaseStream,
		Changes,
		SelectorMap,
		Store
	} from '../../../index.ts';
    import createSourceData, {
		type SourceData
	} from '../../../../lib/test-artifacts/data/create-state-obj.ts';

	export interface Props<S extends SelectorMap = any>{
		ref : {
			store : Store<SourceData, S>;
		};
		selectorMap? : S;
	};
	type Handler = <P>( params : P ) => void;
	const state = createSourceData() as SourceData;
	const handlers = new Set<Handler>();
	
	const stream = ( <const S extends SelectorMap>( selectorMap? : S ) => ({
		addListener( name : never, h : Handler ) { handlers.add( h ) },
		data: {},
		endStream(){},
		removeListener( name : never, h : Handler ) { handlers.delete( h ) },
		resetState: ( keys : Array<string> ) => {
			const t = createSourceData() as SourceData;
			/* @ts-ignore */
			for( const k of keys ) { state[ k ] = t[ k ] }
			handlers.forEach( r => r( state ) );
		},
		setState: ( d : Changes<SourceData> ) => {
			/* @ts-ignore */
			for( let k in d ) { state[ k ] = d[ k ] }
			handlers.forEach( r => r( state ) );
		}
	})) as unknown as BaseStream<SourceData>;

	class TestChannel<S extends SelectorMap> extends Channel<SourceData, S>{
		constructor( selectorMap? : S ) {
			super( stream, selectorMap );
			onMount(() => {
				const sync = this.synchronizer;
				this.channel.addListener( 'data-changed', sync );
				return () => {
					this.channel.removeListener( 'data-changed', sync );
					this.channel.endStream();
				};
			});
			this.synchronizer();
		}
		protected get synchronizer() {
			return () => {
				super.synchronizer();
				for( let k in this.selectorMap ) {
					/* @ts-ignore */
					this.store.data[ k ] = getProperty.default( state, this.selectorMap[ k ] )._value
				}
			};
		}
	}
</script>
<script lang="ts" generics="S extends SelectorMap">
	const { selectorMap, ref } : Props<S> = $props();
	(() => {
		ref.store = new TestChannel( selectorMap ).store;
	})();
</script>
