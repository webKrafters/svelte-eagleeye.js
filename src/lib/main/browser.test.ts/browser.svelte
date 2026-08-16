<script lang="ts" module>
	import type { SelectorMap, State, Store } from '../../index.ts';
	export interface Props<S extends SelectorMap, V extends State> {
		ctx? : BrowserSvelteEagleEye<V>,
		ownerDesc? : string,
		ref: {
			store : Store<V, S>
		},
		selectorMap? : S
	}
</script>
<script lang="ts" generics="S extends SelectorMap, V extends State">
    import { BrowserSvelteEagleEye } from '../browser.ts';
    import { expect } from 'vitest';

	const {
		ctx = new BrowserSvelteEagleEye<V>( expect.any( String ) ),
		ownerDesc = expect.any( String ),
		ref,
		selectorMap
	} : Props<S, V> = $props();

	(() => { ref.store = ctx.stream( ownerDesc, selectorMap ) })();
</script>
