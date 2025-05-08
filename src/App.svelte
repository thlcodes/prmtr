<script>
    import Auth from "./Auth.svelte";
    import Chat from "./Chat.svelte";
    import Header from "./Header.svelte";
    import { store as authStore } from "./lib/auth";
</script>

<Header />

{#if $authStore.copilot_token}
    <Chat />
{:else}
    <Auth />
{/if}
