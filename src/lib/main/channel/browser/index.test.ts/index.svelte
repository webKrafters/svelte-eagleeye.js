<script lang="ts" module>
	import { BrowserSvelteEagleEye } from '../../../../index.ts';
	const ee = new BrowserSvelteEagleEye( 'TEST_CTX' );
</script>
<script lang="ts">
    import type { ObjectSelector, SelectorMap } from '@webkrafters/eagleeye';
	import { untrack } from 'svelte';

	const props : {
		ref : {
			currentSelectorMap : SelectorMap
		},
		selectorMap : SelectorMap
	} = $props();

	const stream = ee.stream(
		'TEST_PRODUCT',
		untrack(() => props.selectorMap )
	);

	(() => { props.ref.currentSelectorMap = stream.selectorMap })();

	$effect(() => {
		stream.selectorMap = props.selectorMap as ObjectSelector;
		props.ref.currentSelectorMap = stream.selectorMap;
	});

</script>
