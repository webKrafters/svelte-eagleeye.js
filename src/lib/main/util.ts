import stringify from 'safe-stable-stringify';

import { sha512, type Message } from 'js-sha512';

export function hash( value? : any ) {
	return sha512( stringify( value, ( k, v ) => {
		switch( typeof v ) {
			case 'undefined': return 'undefined';
			case 'function': return v.toString();
			default: return v
		}
	} ) as Message );
}
