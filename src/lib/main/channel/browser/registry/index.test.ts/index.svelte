<script lang="ts" module>
	import { TestRegistrar } from './index.svelte.spec.ts';
	import type { SelectorMap } from '../../../../../index.ts';
	export interface Props<S extends SelectorMap|undefined> {
		registrar : TestRegistrar;
		selectorMap? : S;
	}
</script>
<script lang="ts" generics="S extends SelectorMap">
    import { onMount } from 'svelte';
	const { registrar, selectorMap } : Props<S> = $props();
	onMount(() => registrar.register.at( selectorMap ));
</script>
