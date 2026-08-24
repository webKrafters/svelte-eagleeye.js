<script lang="ts">
    import type { ObjectSelector, SelectorMap } from '@webkrafters/eagleeye';
	import { BrowserChannel } from '../index.ts';
    import { BrowserSvelteEagleEye, type BaseStream } from '../../../../index.ts';
    import { untrack } from 'svelte';

	const ee = new BrowserSvelteEagleEye( 'TEST_CTX' );

	const props : {
		ref : {
			currentSelectorMap : SelectorMap
		},
		selectorMap : SelectorMap
	} = $props();

	const channel = new BrowserChannel(
		ee.stream as BaseStream,
		untrack(() => props.selectorMap )
	);

	// @debug
	console.log( '>>>>>>>>>> are we here 2 ???????' );


	(() => { props.ref.currentSelectorMap = channel.selectorMap })();

	$effect(() => {

		// @debug
		console.info( '>>>>>>>>>> are we here 2 ???????' );

		channel.selectorMap = props.selectorMap as ObjectSelector;
		props.ref.currentSelectorMap = channel.selectorMap;
	});

</script>
