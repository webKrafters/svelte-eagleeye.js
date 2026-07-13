<script lang="ts">
	
    import type { BaseStream } from '../index.ts';

	import { MemoryChannel } from '../main/channel/memory/index.ts';

	import { vi } from 'vitest';

	import createSourceData, { type SourceData } from './data/create-state-obj.ts';

    import type { StoreMock } from './types.js';
    
	const state = createSourceData();

	const { resetState, setState } : StoreMock = $props();

	const streamMock = vi.fn(() => ({
		addListener: ()=>{},
		data: state,
		resetState: resetState.mock,
		removeListener: ()=>{},
		setState: setState.mock,
	})) as unknown as BaseStream<SourceData>

	const store = new MemoryChannel( streamMock ).store;

	const runMockReset = () => store.resetState( resetState.payload );

	const runMockUpdate = () => store.setState( setState.payload );

</script>

<button onclick={ runMockUpdate }>test me!</button>
<button onclick={ runMockReset }>reset me!</button>
