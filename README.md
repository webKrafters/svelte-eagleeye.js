<p align="center">
	<img alt="Eagle Eye" height="150px" src="logo.png" width="250px" />
</p>
<p align="center">
	<a href="https://typescriptlang.org">
		<img alt="TypeScript" src="https://badgen.net/badge/icon/typescript?icon=typescript&label">
	</a>
	<a href="https://github.com/webKrafters/svelte-eagleeye.js/actions">
		<img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/webKrafters/svelte-eagleeye.js/test.yml">
	</a>
	<a href="https://coveralls.io/github/webKrafters/svelte-eagleeye.js">
		<img alt="coverage" src="https://img.shields.io/coveralls/github/webKrafters/svelte-eagleeye.js">
	</a>
	<img alt="NPM" src="https://img.shields.io/npm/l/@webkrafters/svelte-eagleeye">
	<img alt="Maintenance" src="https://img.shields.io/maintenance/yes/2032">
	<img alt="build size" src="https://img.shields.io/bundlephobia/minzip/@webkrafters/svelte-eagleeye?label=bundle%20size">
	<a href="https://www.npmjs.com/package/@webKrafters/svelte-eagleeye">
		<img alt="Downloads" src="https://img.shields.io/npm/dt/@webkrafters/svelte-eagleeye.svg">
	</a>
	<img alt="GitHub package.json version" src="https://img.shields.io/github/package-json/v/webKrafters/svelte-eagleeye.js">
</p>

# Svelte Eagle Eye

<table BORDER-COLOR="0a0" BORDER-WIDTH="2">
    <td VALIGN="middle" ALIGN="center" FONT-WEIGHT="BOLD" COLOR="#333" HEIGHT="250px" width="1250px">
		COMPATIBLE WITH SVELTE VERSION 5.0, RUNES AND BEYOND.<br />
	</td>
</table>
<ul>
	<li> Ready for use anywhere in the app.</li>
	<li> Auto-immutable update-friendly context. See <a href="https://svelte-eagleeye.js.org/concepts//setstate"><code>store.setState</code></a>.</li>
	<li> A context bearing an observable consumer <a href="https://svelte-eagleeye.js.org/concepts/store">store</a>.</li>
	<li> Recognizes <b>negative array indexing</b>. Please see <a href="https://svelte-eagleeye.js.org/concepts/property-path">Property Path</a> and <code>store.setState</code> <a href="https://svelte-eagleeye.js.org/concepts/store/setstate#indexing">Indexing</a>.</li>
	<li> Only re-renders subscribing components (<a href="https://svelte-eagleeye.js.org/concepts/client">clients</a>) on context state changes.</li>
	<li> Subscribing component decides which context state properties' changes to trigger its update.</li>
	<li>OOB Support for framework-agnostic state sharing among applications. Simply create an <a href="https://auto-immutable.js.org/intro/">Auto Immutable</a> instance to pass around as the <code>value</code> argument for this or any <a href="https://eagleeye.js.org">Eagle Eye</a> based state manager instances.</li>
</ul>

**Name:** Svelte Eagle Eye.

**Usage:** Please see <b><a href="https://svelte-eagleeye.js.org/getting-started">Getting Started</a></b>.

**Demo:** [Play with the app on codesandbox](https://codesandbox.io/s/github/webKrafters/svelte-eagleeye-app)\
If sandbox fails to load app, please refresh dependencies on its lower left.
<p>If the problem persits, </p>
<ol>
	<li>clone the demo app <a href="https://github.com/webKrafters/svelte-eagleeye-app" rel="no-follow">repository</a>.</li>
	<li>CD to the cloned demo app project's root folder.</li>
	<li>run `npm i`</li>
	<li>run `npm i -S <pkg_name>` for all the packages in this `peerDependencies` of this library's package.json object.</li>
	<li>and then `npm run vite`</li>
</ol>

**Install:**\
npm install --save @webkrafters/svelte-eagleeye

May also see <b><a href="https://svelte-eagleeye.js.org/history/features">What's Changed?</a></b>

Full Documentation: **[svelte-eagleeye.js.org](https://svelte-eagleeye.js.org)**

# License

GPLv3
