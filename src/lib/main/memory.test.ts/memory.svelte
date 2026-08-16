<script lang="ts">
    import type { SelectorMap, State, Store } from '../../../lib/index.ts';
	import { MemorySvelteEagleEye } from '../memory.ts';
    import { expect } from 'vitest';

	const { ref } : {
		ref: {
			store : Store<State, SelectorMap>
		}
	} = $props();

	(() => {
		ref.store = new MemorySvelteEagleEye( expect.any( String ) )
					.stream( expect.any( String ) ) as unknown as Store<State, SelectorMap>;
	})();
</script>
